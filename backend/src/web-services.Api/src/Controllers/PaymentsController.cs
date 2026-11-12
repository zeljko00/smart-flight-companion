using Microsoft.AspNetCore.Mvc;
using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using SmartFlightCompanion.WebServices.Application.Dto;
using SmartFlightCompanion.WebServices.Application.Services;

namespace SmartFlightCompanion.WebServices.Api.Controllers;

[ApiController]
[Route("payments")]
public sealed class BoardingPassPaymentsController : ControllerBase
{
    private readonly IPaymentService _paymentService;
    private readonly string? _callbackSecret;

    public BoardingPassPaymentsController(IPaymentService paymentService, IConfiguration configuration)
    {
        _paymentService = paymentService;
        _callbackSecret = Environment.GetEnvironmentVariable("PaymentGateway__CallbackSecret")
            ?? configuration["PaymentGateway:CallbackSecret"];
    }

    [HttpPost("callback")]
    [ProducesResponseType(typeof(BoardingPassPaymentStateDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<BoardingPassPaymentStateDto>> HandleCallback(
        [FromBody] PaymentResultDto request,
        CancellationToken cancellationToken)
    {
        if (!string.IsNullOrWhiteSpace(_callbackSecret))
        {
            if (string.IsNullOrWhiteSpace(request.Signature))
            {
                return Unauthorized("Payment callback signature is required.");
            }

            if (!IsValidSignature(request, _callbackSecret))
            {
                return Unauthorized("Payment callback signature is invalid.");
            }
        }

        if (string.IsNullOrWhiteSpace(request.PaymentId))
        {
            return BadRequest("Payment ID is required.");
        }

        if (string.IsNullOrWhiteSpace(request.Status))
        {
            return BadRequest("Payment status is required.");
        }

        if (request.Amount <= 0)
        {
            return BadRequest("Payment amount must be greater than zero.");
        }

        var result = await _paymentService.HandlePaymentCallbackAsync(request, cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }

    private static bool IsValidSignature(PaymentResultDto request, string secret)
    {
        var payload = BuildSignaturePayload(request);
        var expected = ComputeSignature(payload, secret);
        return CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(expected),
            Encoding.UTF8.GetBytes(request.Signature ?? string.Empty));
    }

    private static string BuildSignaturePayload(PaymentResultDto request)
    {
        return string.Join("|", [
            request.PaymentId,
            request.Status,
            request.Amount.ToString("0.00", CultureInfo.InvariantCulture),
        ]);
    }

    private static string ComputeSignature(string payload, string secret)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
        return Convert.ToHexString(hash);
    }
}
