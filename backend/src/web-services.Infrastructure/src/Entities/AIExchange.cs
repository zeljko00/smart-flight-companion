using System.ComponentModel.DataAnnotations;

namespace SmartFlightCompanion.WebServices.Infrastructure.Entities;

public sealed class AIExchange
{
    [Key]
    public Guid Id { get; private init; } = Guid.NewGuid();

    [Required]
    public required string Request { get; set; }

    [Required]
    public required string Response { get; set; }

    public Guid? UserId { get; set; }

    public Guid? FlightId { get; set; }

    public DateTimeOffset Timestamp { get; private init; } = DateTimeOffset.UtcNow;
}