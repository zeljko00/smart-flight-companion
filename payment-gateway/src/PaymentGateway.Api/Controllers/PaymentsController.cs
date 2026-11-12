using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PaymentGateway.Api.Data;
using PaymentGateway.Api.Models;
using System.Collections.Concurrent;
using System.Globalization;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;

namespace PaymentGateway.Api.Controllers;

[ApiController]
[Route("payments")]
public sealed class PaymentsController(
    PaymentGatewayDbContext dbContext,
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration) : ControllerBase
{
    private static readonly ConcurrentDictionary<string, PaymentSession> Sessions = new(StringComparer.Ordinal);
    private readonly string? _callbackSecret = Environment.GetEnvironmentVariable("PaymentGateway__CallbackSecret")
        ?? configuration["PaymentGateway:CallbackSecret"];

    [HttpPost]
    [ProducesResponseType(typeof(PaymentSessionResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public ActionResult<PaymentSessionResponse> CreateSession([FromBody] PaymentSessionRequest request)
    {
        if (!Request.Headers.TryGetValue("X-Api-Key", out var apiKeyHeaderValue) ||
            string.IsNullOrWhiteSpace(apiKeyHeaderValue))
        {
            return Unauthorized("Missing API key.");
        }

        var apiKeyValue = apiKeyHeaderValue.ToString().Trim();
        var apiKeyHash = ComputeSha256(apiKeyValue);
        var isApiKeyValid = dbContext.ApiKeys.Any(k =>k.Value == apiKeyValue);
        if (!isApiKeyValid)
        {
            return Unauthorized("Invalid API key.");
        }

        if (request.Amount <= 0 ||
            string.IsNullOrWhiteSpace(request.CallbackUrl) ||
            !IsValidReturnPath(request.SuccessReturnPath) ||
            !IsValidReturnPath(request.FailureReturnPath))
        {
            return BadRequest("Invalid session payload.");
        }

        var payment = new Payment
        {
            Amount = request.Amount,
            Currency = "USD",
            Status = PaymentStatus.Pending
            };

        dbContext.Payments.Add(payment);
        dbContext.SaveChanges();

        var paymentSession = new PaymentSession
        {
            paymentId = payment.Id,
            CallbackUrl = request.CallbackUrl,
            SuccessReturnPath = request.SuccessReturnPath,
            FailureReturnPath = request.FailureReturnPath,
            CheckoutToken = GenerateCheckoutToken(),
        };

        Sessions[paymentSession.paymentId.ToString()] = paymentSession;

        var publicBasePath = Environment.GetEnvironmentVariable("Payments__PublicBasePath")
            ?? configuration["Payments:PublicBasePath"]
            ?? "/airpay/api";
        publicBasePath = publicBasePath.TrimEnd('/');

        var checkoutUrl = $"{publicBasePath}/payments/{Uri.EscapeDataString(paymentSession.paymentId.ToString())}";
        return Created(string.Empty, new PaymentSessionResponse(paymentSession.paymentId.ToString(), checkoutUrl));
    }

    [HttpGet("{paymentId}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public ActionResult Checkout([FromRoute] string paymentId)
    {
        if (!Sessions.TryGetValue(paymentId, out var session))
        {
            return NotFound("Checkout session not found.");
        }

        var payment = dbContext.Payments.FirstOrDefault(p => p.Id == session.paymentId);

        if(payment is null)
        {
            return NotFound("Payment not found.");
        }

        var publicBasePath = Environment.GetEnvironmentVariable("Payments__PublicBasePath")
            ?? configuration["Payments:PublicBasePath"]
            ?? "/airpay/api";
        publicBasePath = publicBasePath.TrimEnd('/');

        var completeAction = $"{publicBasePath}/payments/{Uri.EscapeDataString(payment.Id.ToString())}/complete";

        var html = """
                    <!doctype html>
                    <html lang="en">
                    <head>
                    <meta charset="utf-8" />
                    <meta name="viewport" content="width=device-width, initial-scale=1" />
                    <title>AirPay Checkout</title>
                    <style>
                        :root { font-family: 'Segoe UI', sans-serif; }
                        body { margin: 0; background: linear-gradient(135deg, #f8fafc, #e2e8f0); min-height: 100vh; display: grid; place-items: center; }
                        .card { width: min(92vw, 520px); background: #fff; border-radius: 16px; padding: 28px; box-shadow: 0 24px 60px rgba(15,23,42,.15); }
                        h1 { margin: 0 0 8px; font-size: 1.5rem; color: #0f172a; }
                        p { margin: 0 0 18px; color: #334155; }
                        .amount { font-size: 1.8rem; font-weight: 700; color: #0f172a; margin-bottom: 18px; }
                        .grid { display: grid; gap: 10px; }
                        input { width: 100%; border: 1px solid #cbd5e1; border-radius: 10px; padding: 10px 12px; font-size: .95rem; box-sizing: border-box; }
                        .row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
                        .actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 16px; }
                        button { border: 0; border-radius: 10px; padding: 11px 12px; font-weight: 600; cursor: pointer; }
                        button[name="action"][value="success"] { background: #0ea5e9; color: white; }
                        button[name="action"][value="fail"] { background: #e2e8f0; color: #0f172a; }
                    </style>
                    </head>
                    <body>
                    <main class="card">
                        <h1>AirPay secure payment</h1>
                            <p>Session <strong>__SESSION__</strong></p>
                            <p class="amount">Total cost: __AMOUNT__ __CURRENCY__</p>
                            <form method="post" action="__COMPLETE_ACTION__" class="grid">
                        <input type="hidden" name="checkoutToken" value="__CHECKOUT_TOKEN__" />
                        <input name="cardNumber" placeholder='Card number' autocomplete="cc-number" required />
                        <input name="cardHolderName" placeholder='Card holder name' autocomplete="cc-name" required />
                        <div class="row">
                            <input name="expiration" placeholder='YYYY-MM-DD' required />
                            <input name="cvv" placeholder='CVV' autocomplete="cc-csc" required />
                        </div>
                        <div class="actions">
                            <button type="submit" name="action" value="success">Pay now</button>
                            <button type="submit" name="action" value="fail" formnovalidate>Cancel</button>
                        </div>
                        </form>
                    </main>
                    </body>
                    </html>
                    """
            .Replace("__SESSION__", System.Net.WebUtility.HtmlEncode(payment.Id.ToString()), StringComparison.Ordinal)
            .Replace("__SESSION_URL__", Uri.EscapeDataString(payment.Id.ToString()), StringComparison.Ordinal)
            .Replace("__COMPLETE_ACTION__", System.Net.WebUtility.HtmlEncode(completeAction), StringComparison.Ordinal)
            .Replace("__CHECKOUT_TOKEN__", System.Net.WebUtility.HtmlEncode(session.CheckoutToken), StringComparison.Ordinal)
            .Replace("__AMOUNT__", payment.Amount.ToString("0.00"), StringComparison.Ordinal)
            .Replace("__CURRENCY__", System.Net.WebUtility.HtmlEncode(payment.Currency), StringComparison.Ordinal);

        return Content(html, "text/html");
    }

    [HttpPost("{paymentId}/complete")]
    [ProducesResponseType(StatusCodes.Status302Found)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult> CompleteCheckout(
        [FromRoute] string paymentId,
        [FromForm] PaymentRequest request,
        CancellationToken cancellationToken)
    {
        if (!Sessions.TryGetValue(paymentId, out var session))
        {
            return NotFound("Checkout session not found.");
        }

        if (!SecureEquals(request.CheckoutToken, session.CheckoutToken))
        {
            return BadRequest("Invalid checkout form token.");
        }

        var payment = await dbContext.Payments.FirstOrDefaultAsync(p => p.Id == session.paymentId, cancellationToken);

        if (payment is null)
        {
            return NotFound("Payment not found.");
        }

        if (payment.Status != PaymentStatus.Pending)
        {
            var settledPath = payment.Status == PaymentStatus.Completed
                ? session.SuccessReturnPath
                : session.FailureReturnPath;
            return LocalRedirect(settledPath);
        }

        var isSuccess = string.Equals(request.Action, "success", StringComparison.OrdinalIgnoreCase);
        var failureReason = string.Empty;
        var failureCode = string.Empty;

        if (isSuccess)
        {
            if (!DateTime.TryParse(request.Expiration, out var expirationDate))
            {
                isSuccess = false;
                failureReason = "Invalid expiration date.";
                failureCode = "invalid_expiration";
            }
            else
            {
                var card = await dbContext.CreditCards.FirstOrDefaultAsync(c =>
                        c.CardNumber == request.CardNumber &&
                        c.CardHolderName == request.CardHolderName &&
                        c.CVV == request.Cvv,
                    cancellationToken);

                if (card is null)
                {
                    isSuccess = false;
                    failureReason = "Card credentials are invalid.";
                    failureCode = "invalid_card";
                }
                else if(card.Active == false)
                {
                    isSuccess = false;
                    failureReason = "Card is deactivated.";
                    failureCode = "card_deactivated";
                }
                else if(card.ExpirationDate.Date < DateTime.UtcNow.Date)
                {
                    isSuccess = false;
                    failureReason = "Card is expired.";
                    failureCode = "card_expired";
                }
                else if (card.ExpirationDate.Date != expirationDate.Date)
                {
                    isSuccess = false;
                    failureReason = "Card expiration date does not match.";
                    failureCode = "invalid_expiration";
                }
                else if (card.Balance < payment.Amount)
                {
                    isSuccess = false;
                    failureReason = "Insufficient funds.";
                    failureCode = "insufficient_funds";
                }
                else
                {
                    card.Balance -= payment.Amount;
                    await dbContext.SaveChangesAsync(cancellationToken);
                }
            }
        }
        else
        {
            failureReason = "Payment canceled by user.";
            failureCode = "canceled";
        }

        payment.Status = isSuccess ? PaymentStatus.Completed : PaymentStatus.Failed;
        await dbContext.SaveChangesAsync(cancellationToken);

        var callbackPayload = new PaymentCallbackRequest(
            PaymentId: payment.Id.ToString(),
            Status: isSuccess ? "succeeded" : "failed",
            Amount: payment.Amount,
            FailureReason: isSuccess ? null : failureReason,
            Signature: null);

        if (!string.IsNullOrWhiteSpace(_callbackSecret))
        {
            var payloadToSign = BuildSignaturePayload(callbackPayload);
            var signature = ComputeSignature(payloadToSign, _callbackSecret);
            callbackPayload = callbackPayload with { Signature = signature };
        }

        try
        {
            var callbackClient = httpClientFactory.CreateClient();
            using var callbackResponse = await callbackClient.PostAsJsonAsync(session.CallbackUrl, callbackPayload, cancellationToken);

            if (isSuccess && callbackResponse.IsSuccessStatusCode)
            {
                var callbackState = await callbackResponse.Content.ReadFromJsonAsync<PaymentStateResponse>(cancellationToken: cancellationToken);
                if (callbackState is not null &&
                    string.Equals(callbackState.Status, "failed", StringComparison.OrdinalIgnoreCase))
                {
                    isSuccess = false;
                    failureReason = string.IsNullOrWhiteSpace(callbackState.FailureReason)
                        ? "Payment succeeded but boarding pass issuance failed."
                        : callbackState.FailureReason;
                    failureCode = "boarding_pass_issue_failed";
                }
            }
        }
        catch (Exception)
        {}

        var redirectPath = isSuccess
            ? session.SuccessReturnPath
            : AppendQuery(session.FailureReturnPath, "paymentFailureReason", failureCode);
        return LocalRedirect(redirectPath);
    }

    private static string AppendQuery(string path, string key, string value)
    {
        var separator = path.Contains('?') ? '&' : '?';
        return $"{path}{separator}{Uri.EscapeDataString(key)}={Uri.EscapeDataString(value)}";
    }

    private static bool IsValidReturnPath(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return false;
        }

        return value.StartsWith("/", StringComparison.Ordinal) && !value.StartsWith("//", StringComparison.Ordinal);
    }

    public sealed record PaymentSessionRequest(
        decimal Amount,
        string CallbackUrl,
        string SuccessReturnPath,
        string FailureReturnPath);

    public sealed record PaymentSessionResponse(
        string paymentId,
        string CheckoutUrl);

    public sealed record PaymentRequest(
        string? Action,
        string? CardNumber,
        string? CardHolderName,
        string? Expiration,
        string? Cvv,
        string? CheckoutToken);

    public sealed record PaymentCallbackRequest(
        string PaymentId,
        string Status,
        decimal Amount,
        string? FailureReason,
        string? Signature);

    private sealed record PaymentStateResponse(
        string SessionId,
        string Status,
        Guid? BoardingPassId,
        string? FailureReason);

    private sealed class PaymentSession
    {
        public required Guid paymentId { get; set; }
        public required string CallbackUrl { get; init; }
        public required string SuccessReturnPath { get; init; }
        public required string FailureReturnPath { get; init; }
        public required string CheckoutToken { get; init; }
    }

    private static string BuildSignaturePayload(PaymentCallbackRequest request)
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

    private static string ComputeSha256(string value)
    {
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(value));
        return Convert.ToHexString(hash);
    }

    private static string GenerateCheckoutToken()
    {
        return Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
    }

    private static bool SecureEquals(string? left, string? right)
    {
        if (string.IsNullOrEmpty(left) || string.IsNullOrEmpty(right))
        {
            return false;
        }

        var leftBytes = Encoding.UTF8.GetBytes(left);
        var rightBytes = Encoding.UTF8.GetBytes(right);
        return CryptographicOperations.FixedTimeEquals(leftBytes, rightBytes);
    }
}
