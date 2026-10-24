using System.ComponentModel.DataAnnotations;

namespace SmartFlightCompanion.WebServices.Infrastructure.Entities;

public class BoardingPass
{
    [Key]
    public Guid Id { get; private init; } = Guid.NewGuid();
    [Required]
    public required Flight Flight { get; set; }
    [Required]
    public required User User { get; set; }
    [Required]
    public required Seat Seat { get; set; }
    [Required]
    public required decimal Price { get; set; }
    public DateTimeOffset IssuedAt { get; private init; } = DateTimeOffset.UtcNow;
    [Required]
    public required bool IsValid { get; set; } = true;
}