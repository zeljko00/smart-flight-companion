using System.ComponentModel.DataAnnotations;

namespace SmartFlightCompanion.WebServices.Infrastructure.Entities;

public class Comment
{
    [Key]
    public Guid Id { get; private init; } = Guid.NewGuid();
    [Required]
    public required User Author { get; set; }
    [Required]
    public required Flight Flight { get; set; }
    [Required]
    public required string Content { get; set; }
    public DateTimeOffset CreatedAt { get; private init; } = DateTimeOffset.UtcNow;
}