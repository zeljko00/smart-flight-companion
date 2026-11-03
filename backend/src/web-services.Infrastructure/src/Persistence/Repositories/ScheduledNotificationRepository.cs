using Microsoft.EntityFrameworkCore;
using SmartFlightCompanion.WebServices.Infrastructure.Entities;
using SmartFlightCompanion.WebServices.Infrastructure.Persistence.Abstractions;

namespace SmartFlightCompanion.WebServices.Infrastructure.Persistence.Repositories;

public sealed class ScheduledNotificationRepository : Repository<ScheduledNotification>, IScheduledNotificationRepository
{
    public ScheduledNotificationRepository(AppDbContext context)
        : base(context)
    {
    }

    public async Task<IReadOnlyList<ScheduledNotification>> DeleteByTargetAndTypeAsync(
        Guid targetId,
        NotificationType notificationType,
        DateTimeOffset fromUtc,
        CancellationToken cancellationToken = default)
    {
        var notifications = await Set
            .Where(notification => notification.TargetId == targetId
                && notification.Type == notificationType
                && notification.ScheduledForUtc >= fromUtc)
            .ToListAsync(cancellationToken);

        Set.RemoveRange(notifications);
        await SaveChangesAsync(cancellationToken);

        return notifications;
    }
}
