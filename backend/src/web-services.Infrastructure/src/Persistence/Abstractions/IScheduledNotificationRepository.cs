using SmartFlightCompanion.WebServices.Infrastructure.Entities;

namespace SmartFlightCompanion.WebServices.Infrastructure.Persistence.Abstractions;

public interface IScheduledNotificationRepository : IRepository<ScheduledNotification>
{
    Task<IReadOnlyList<ScheduledNotification>> DeleteByTargetAndTypeAsync(
        Guid targetId,
        NotificationType notificationType,
        DateTimeOffset fromUtc,
        CancellationToken cancellationToken = default);
}
