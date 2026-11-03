namespace SmartFlightCompanion.WebServices.Application.Services;

using SmartFlightCompanion.WebServices.Infrastructure.Entities;
public interface IScheduledNotificationService
{
    Task ScheduleNotificationAsync(
        Guid targetId,
        NotificationType notificationType,
        string title,
        string message,
        DateTimeOffset scheduledTime,
        CancellationToken cancellationToken = default);
}
