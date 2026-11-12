using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using SmartFlightCompanion.WebServices.Application.Dto;
using SmartFlightCompanion.WebServices.Infrastructure.Entities;
using SmartFlightCompanion.WebServices.Infrastructure.Persistence.Abstractions;

namespace SmartFlightCompanion.WebServices.Application.Services;

public sealed class PaymentService : IPaymentService
{
    private const string Pending = "pending";
    private const string Succeeded = "succeeded";
    private const string Failed = "failed";
    private const string PaymentKeyPrefix = "boarding-pass-payment:";
    private const string PaymentRequestKeyPrefix = "boarding-pass-request:";

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly HttpClient _httpClient;
    private readonly IDistributedCache _distributedCache;
    private readonly IBoardingPassService _boardingPassService;
    private readonly IBoardingPassRepository _boardingPassRepository;
    private readonly IFlightRepository _flightRepository;
    private readonly IUserRepository _userRepository;
    private readonly string _paymentCallbackUrl;
    private readonly string? _paymentGatewayApiKey;

    public PaymentService(
        HttpClient httpClient,
        IDistributedCache distributedCache,
        IBoardingPassService boardingPassService,
        IBoardingPassRepository boardingPassRepository,
        IFlightRepository flightRepository,
        IUserRepository userRepository,
        IConfiguration configuration)
    {
        _httpClient = httpClient;
        _distributedCache = distributedCache;
        _boardingPassService = boardingPassService;
        _boardingPassRepository = boardingPassRepository;
        _flightRepository = flightRepository;
        _userRepository = userRepository;
        _paymentCallbackUrl = Environment.GetEnvironmentVariable("PaymentGateway__CallbackUrl")
            ?? configuration["PaymentGateway:CallbackUrl"]
            ?? "http://web-services/api/payments/callback";
        _paymentGatewayApiKey = Environment.GetEnvironmentVariable("PaymentGateway__ApiKey")
            ?? configuration["PaymentGateway:ApiKey"];
    }

    public async Task<PaymentSessionDto?> RequestPaymentSessionAsync(
        Guid flightId,
        Guid ownerId,
        Seat seat,
        string returnPath,
        CancellationToken cancellationToken = default)
    {
        if (!IsValidReturnPath(returnPath))
        {
            return null;
        }

        var flight = await _flightRepository.GetByIdAsync(flightId, cancellationToken);
        var user = await _userRepository.GetByIdAsync(ownerId, cancellationToken);
        if (flight is null || user is null)
        {
            return null;
        }

        var amount = ResolvePrice(flight, seat);
        if (amount is null)
        {
            return null;
        }

        var pendingRequestKey = ToPendingRequestKey(flightId, ownerId, seat);
        var existingPaymentId = await LoadPendingPaymentRequestAsync(pendingRequestKey, cancellationToken);
        if (!string.IsNullOrWhiteSpace(existingPaymentId))
        {
            var existingPayment = await LoadSessionAsync(existingPaymentId, cancellationToken);
            if (existingPayment is not null &&
                string.Equals(existingPayment.Status, Pending, StringComparison.OrdinalIgnoreCase) &&
                existingPayment.Amount == amount.Value)
            {
                return new PaymentSessionDto(existingPayment.PaymentId, existingPayment.CheckoutUrl);
            }

            await RemovePendingPaymentRequestAsync(pendingRequestKey, cancellationToken);
        }

        int seatsTaken = await _boardingPassRepository.GetCountByFlightIdAsync(flightId, cancellationToken);
        if (seatsTaken >= flight.SeatCapacity)
        {
            return null; // TODO: inform about this
        }

        var request = new PaymentRequest(
            Amount: amount.Value,
            CallbackUrl: _paymentCallbackUrl,
            SuccessReturnPath: AppendQuery(returnPath, [
                ("paymentStatus", Succeeded)
            ]),
            FailureReturnPath: AppendQuery(returnPath, [
                ("paymentStatus", Failed)
            ]));

        try
        {
            using var requestMessage = new HttpRequestMessage(HttpMethod.Post, "payments")
            {
                Content = JsonContent.Create(request)
            };

            if (!string.IsNullOrWhiteSpace(_paymentGatewayApiKey))
            {
                requestMessage.Headers.Add("X-Api-Key", _paymentGatewayApiKey.Trim());
            }

            using var response = await _httpClient.SendAsync(requestMessage, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                return null;
            }

            var payload = await response.Content.ReadFromJsonAsync<PaymentResponse>(cancellationToken: cancellationToken);
            if (payload is null || string.IsNullOrWhiteSpace(payload.PaymentId) || string.IsNullOrWhiteSpace(payload.CheckoutUrl))
            {
                return null;
            }

            var pendingPayment = new BoardingPassPayment(
                                        PaymentId: payload.PaymentId,
                                        FlightId: flightId,
                                        OwnerId: ownerId,
                                        Seat: seat,
                                        Amount: amount.Value,
                                        CheckoutUrl: payload.CheckoutUrl,
                                        Status: Pending,
                                        BoardingPassId: null,
                                        FailureReason: null,
                                        ReturnPath: returnPath);

            await SaveSessionAsync(pendingPayment, TimeSpan.FromMinutes(30), cancellationToken);
            await SavePendingPaymentRequestAsync(pendingRequestKey, payload.PaymentId, TimeSpan.FromMinutes(30), cancellationToken);

            return new PaymentSessionDto(payload.PaymentId, payload.CheckoutUrl);
        }
        catch (Exception)
        {
            return null;
        }
    }

    public async Task<BoardingPassPaymentStateDto?> HandlePaymentCallbackAsync(
        PaymentResultDto callback,
        CancellationToken cancellationToken = default)
    {
        var cached = await LoadSessionAsync(callback.PaymentId, cancellationToken);
        if (cached is null)
        {
            return null;
        }

        if (!string.Equals(cached.Status, Pending, StringComparison.OrdinalIgnoreCase))
        {
            return ToStateDto(cached);
        }

        if (callback.Amount != cached.Amount)
        {
            var amountMismatch = cached with
            {
                Status = Failed,
                FailureReason = "Payment amount mismatch.",
            };
            await SaveSessionAsync(amountMismatch, TimeSpan.FromHours(24), cancellationToken);
            await RemovePendingPaymentRequestAsync(ToPendingRequestKey(cached.FlightId, cached.OwnerId, cached.Seat), cancellationToken);
            return ToStateDto(amountMismatch);
        }

        if (string.Equals(callback.Status, Succeeded, StringComparison.OrdinalIgnoreCase))
        {
            var boardingPass = await _boardingPassService.Create(cached.FlightId, cached.OwnerId, cached.Seat, cancellationToken);
            if (boardingPass is null)
            {
                var failedState = cached with
                {
                    Status = Failed,
                    FailureReason = "Payment succeeded but boarding pass issuance failed due to availability or validation.",
                };
                await SaveSessionAsync(failedState, TimeSpan.FromHours(24), cancellationToken);
                await RemovePendingPaymentRequestAsync(ToPendingRequestKey(cached.FlightId, cached.OwnerId, cached.Seat), cancellationToken);
                return ToStateDto(failedState);
            }

            var succeededState = cached with
            {
                Status = Succeeded,
                BoardingPassId = boardingPass.Id,
                FailureReason = null,
            };
            await SaveSessionAsync(succeededState, TimeSpan.FromHours(24), cancellationToken);
            await RemovePendingPaymentRequestAsync(ToPendingRequestKey(cached.FlightId, cached.OwnerId, cached.Seat), cancellationToken);
            return ToStateDto(succeededState);
        }

        var failed = cached with
        {
            Status = Failed,
            FailureReason = string.IsNullOrWhiteSpace(callback.FailureReason)
                ? "Payment was rejected by payment service."
                : callback.FailureReason,
        };
        await SaveSessionAsync(failed, TimeSpan.FromHours(24), cancellationToken);
        await RemovePendingPaymentRequestAsync(ToPendingRequestKey(cached.FlightId, cached.OwnerId, cached.Seat), cancellationToken);
        return ToStateDto(failed);
    }

    private async Task<string?> LoadPendingPaymentRequestAsync(string requestKey, CancellationToken cancellationToken)
    {
        return await _distributedCache.GetStringAsync(requestKey, cancellationToken);
    }

    private async Task SavePendingPaymentRequestAsync(string requestKey, string paymentId, TimeSpan ttl, CancellationToken cancellationToken)
    {
        await _distributedCache.SetStringAsync(
            requestKey,
            paymentId,
            new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = ttl },
            cancellationToken);
    }

    private async Task RemovePendingPaymentRequestAsync(string requestKey, CancellationToken cancellationToken)
    {
        await _distributedCache.RemoveAsync(requestKey, cancellationToken);
    }

    private async Task<BoardingPassPayment?> LoadSessionAsync(string sessionId, CancellationToken cancellationToken)
    {
        var raw = await _distributedCache.GetStringAsync(ToCacheKey(sessionId), cancellationToken);
        return string.IsNullOrWhiteSpace(raw)
            ? null
            : JsonSerializer.Deserialize<BoardingPassPayment>(raw, JsonOptions);
    }

    private async Task SaveSessionAsync(BoardingPassPayment state, TimeSpan ttl, CancellationToken cancellationToken)
    {
        var raw = JsonSerializer.Serialize(state, JsonOptions);
        await _distributedCache.SetStringAsync(
            ToCacheKey(state.PaymentId),
            raw,
            new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = ttl },
            cancellationToken);
    }

    private async Task RemoveSessionAsync(string sessionId, CancellationToken cancellationToken)
    {
        await _distributedCache.RemoveAsync(ToCacheKey(sessionId), cancellationToken);
    }

    private static bool IsValidReturnPath(string returnPath)
    {
        if (string.IsNullOrWhiteSpace(returnPath))
        {
            return false;
        }

        return returnPath.StartsWith("/", StringComparison.Ordinal) && !returnPath.StartsWith("//", StringComparison.Ordinal);
    }

    private static decimal? ResolvePrice(Flight flight, Seat seat)
    {
        return seat switch
        {
            Seat.Economy => flight.EconomyPrice,
            Seat.PremiumEconomy => flight.PremiumEconomyPrice,
            Seat.Business => flight.BusinessPrice,
            _ => flight.FirstClassPrice,
        };
    }

    private static string ToCacheKey(string sessionId) => $"{PaymentKeyPrefix}{sessionId}";

    private static string ToPendingRequestKey(Guid flightId, Guid ownerId, Seat seat)
        => $"{PaymentRequestKeyPrefix}{ownerId:N}:{flightId:N}:{(int)seat}";

    private static BoardingPassPaymentStateDto ToStateDto(BoardingPassPayment state)
    {
        return new BoardingPassPaymentStateDto(state.PaymentId, state.Status, state.BoardingPassId, state.FailureReason);
    }

    private static string AppendQuery(string path, IReadOnlyList<(string Key, string Value)> values)
    {
        if (values.Count == 0)
        {
            return path;
        }

        var fragmentIndex = path.IndexOf('#');
        var fragment = fragmentIndex >= 0 ? path[fragmentIndex..] : string.Empty;
        var withoutFragment = fragmentIndex >= 0 ? path[..fragmentIndex] : path;

        var encodedValues = values
            .Where(value => !string.IsNullOrWhiteSpace(value.Key))
            .Select(value => $"{Uri.EscapeDataString(value.Key)}={Uri.EscapeDataString(value.Value)}")
            .ToArray();

        if (encodedValues.Length == 0)
        {
            return path;
        }

        var separator = withoutFragment.Contains('?') ? '&' : '?';
        return $"{withoutFragment}{separator}{string.Join("&", encodedValues)}{fragment}";
    }

    private sealed record BoardingPassPayment(
        string PaymentId,
        Guid FlightId,
        Guid OwnerId,
        Seat Seat,
        decimal Amount,
        string CheckoutUrl,
        string Status,
        Guid? BoardingPassId,
        string? FailureReason,
        string ReturnPath);

    private sealed record PaymentRequest(
        decimal Amount,
        string CallbackUrl,
        string SuccessReturnPath,
        string FailureReturnPath);

    private sealed record PaymentResponse(
        string PaymentId,
        string CheckoutUrl);
}
