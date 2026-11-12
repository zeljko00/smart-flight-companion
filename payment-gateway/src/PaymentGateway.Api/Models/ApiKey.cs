using Microsoft.EntityFrameworkCore;

namespace PaymentGateway.Api.Models;

[Index(nameof(Name), IsUnique = true)]
[Index(nameof(Value), IsUnique = true)]
public sealed class ApiKey
{
    public Guid Id { get; private init; } = Guid.NewGuid();
    public required string Name { get; set; }
    public required string Value { get; set; }
}