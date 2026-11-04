namespace PaymentGateway.Api.Models;

public sealed class Payment
{
    public Guid Id { get; private init; } = Guid.NewGuid();
    public decimal Amount { get; private init; }
    public string Currency { get; private init; } = "USD";
    public PaymentStatus Status { get; private init; } = PaymentStatus.Pending;
    public DateTime CreatedAtUtc { get; private init; } = DateTime.UtcNow;
}
