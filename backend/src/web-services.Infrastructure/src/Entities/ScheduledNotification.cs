using System.ComponentModel.DataAnnotations;

namespace SmartFlightCompanion.WebServices.Infrastructure.Entities;

public class ScheduledNotification
{
    [Key]
    public Guid Id { get; private init; } = Guid.NewGuid();

    [Required]
    public required Guid TargetId { get; set; }

    [Required]
    public required NotificationType Type { get; set; }

    [Required]
    public required string Title { get; set; }

    [Required]
    public required string Message { get; set; }

    [Required]
    public required DateTimeOffset ScheduledForUtc { get; set; }

    [Required]
    public DateTimeOffset CreatedAtUtc { get; private init; } = DateTimeOffset.UtcNow;
}
