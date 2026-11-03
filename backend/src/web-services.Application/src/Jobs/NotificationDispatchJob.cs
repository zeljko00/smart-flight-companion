using SmartFlightCompanion.WebServices.Application.Dto;
using SmartFlightCompanion.WebServices.Application.Services;
using SmartFlightCompanion.WebServices.Infrastructure.Entities;
using SmartFlightCompanion.WebServices.Infrastructure.Persistence.Abstractions;

namespace SmartFlightCompanion.WebServices.Application.Jobs;

public sealed class NotificationDispatchJob
{
    private readonly IScheduledNotificationRepository _scheduledNotificationRepository;
    private readonly INotificationService _notificationService;

    public NotificationDispatchJob(
        IScheduledNotificationRepository scheduledNotificationRepository,
        INotificationService notificationService)
    {
        _scheduledNotificationRepository = scheduledNotificationRepository;
        _notificationService = notificationService;
    }

    public async Task DispatchAsync(Guid scheduledNotificationId)
    {
        var scheduledNotification = await _scheduledNotificationRepository.GetByIdAsync(scheduledNotificationId);

        if (scheduledNotification is null)
        {
            return;
        }

        var notification = new NotificationDto(
            scheduledNotification.Title,
            scheduledNotification.Message,
            DateTimeOffset.UtcNow);

        if (scheduledNotification.Type == NotificationType.Departure
            || scheduledNotification.Type == NotificationType.Boarding
            || scheduledNotification.Type == NotificationType.GateClosure)
        {
            await _notificationService.SendFlightNotificationAsync(scheduledNotification.TargetId, notification);
        }
        else
        {
            return;
        }

        await _scheduledNotificationRepository.DeleteAsync(scheduledNotification);
    }
}
