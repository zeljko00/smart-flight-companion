namespace PaymentGateway.Api.Models;

public sealed class Payment
{
    public Guid Id { get; private init; } = Guid.NewGuid();
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "USD";
    public PaymentStatus Status { get; set; } = PaymentStatus.Pending;
    public DateTime CreatedAtUtc { get; private init; } = DateTime.UtcNow;
}
