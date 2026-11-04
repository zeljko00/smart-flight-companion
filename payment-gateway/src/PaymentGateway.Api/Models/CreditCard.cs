namespace PaymentGateway.Api.Models;

public sealed class CreditCard
{
    public Guid Id { get; private init; } = Guid.NewGuid();
    public required string CardNumber { get; set; }
    public required string CardHolderName { get; set; }
    public required DateTime ExpirationDate { get; set; }
    public required string CVV { get; set; }
    public decimal Balance { get; set; }
    public string Currency { get; private init; } = "USD";
    public bool Active { get; set; }
}
