using SmartFlightCompanion.WebServices.Application.Dto;

namespace SmartFlightCompanion.WebServices.Application.Services;

public interface INotificationService
{
    Task SendFlightNotificationAsync(Guid flightId, NotificationDto notification, CancellationToken cancellationToken = default);
    Task SendUserNotificationAsync(Guid userId, NotificationDto notification, CancellationToken cancellationToken = default);

}