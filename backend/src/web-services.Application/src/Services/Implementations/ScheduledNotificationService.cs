using Hangfire;
using SmartFlightCompanion.WebServices.Application.Jobs;
using SmartFlightCompanion.WebServices.Infrastructure.Entities;
using SmartFlightCompanion.WebServices.Infrastructure.Persistence.Abstractions;

namespace SmartFlightCompanion.WebServices.Application.Services;

public sealed class ScheduledNotificationService : IScheduledNotificationService
{
    private readonly IScheduledNotificationRepository _scheduledNotificationRepository;
    private readonly IBackgroundJobClient _backgroundJobClient;

    public ScheduledNotificationService(
        IScheduledNotificationRepository scheduledNotificationRepository,
        IBackgroundJobClient backgroundJobClient)
    {
        _scheduledNotificationRepository = scheduledNotificationRepository;
        _backgroundJobClient = backgroundJobClient;
    }

    public async Task ScheduleNotificationAsync(
        Guid targetId,
        NotificationType notificationType,
        string title,
        string message,
        DateTimeOffset scheduledTime,
        CancellationToken cancellationToken = default)
    {
        var scheduledForUtc = scheduledTime.ToUniversalTime();
        var now = DateTimeOffset.UtcNow;

        await _scheduledNotificationRepository.DeleteByTargetAndTypeAsync(
            targetId,
            notificationType,
            now,
            cancellationToken);

        var scheduledNotification = new ScheduledNotification
        {
            TargetId = targetId,
            Type = notificationType,
            Title = title,
            Message = message,
            ScheduledForUtc = scheduledForUtc,
        };

        await _scheduledNotificationRepository.CreateAsync(scheduledNotification, cancellationToken);

        var effectiveSchedule = scheduledForUtc > now ? scheduledForUtc : now;
        _backgroundJobClient.Schedule<NotificationDispatchJob>(
            job => job.DispatchAsync(scheduledNotification.Id),
            effectiveSchedule);
    }
}
