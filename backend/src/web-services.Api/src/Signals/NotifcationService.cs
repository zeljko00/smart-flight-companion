using Microsoft.AspNetCore.SignalR;

using SmartFlightCompanion.WebServices.Application.Dto;
using SmartFlightCompanion.WebServices.Application.Services;

namespace SmartFlightCompanion.WebServices.Api.Signals;

public class NotificationService : INotificationService
{
    private readonly IHubContext<SignalHub> _hubContext;

    public NotificationService(IHubContext<SignalHub> hubContext)
    {
        _hubContext = hubContext;
    }

    private Task SendNotificationAsync(string channel, NotificationDto notification, CancellationToken cancellationToken)
    {
        return _hubContext.Clients.Group(channel).SendAsync("ReceiveNotification", notification, cancellationToken);
    }

    public Task SendFlightNotificationAsync(Guid flightId, NotificationDto notification, CancellationToken cancellationToken = default)
    {
        return SendNotificationAsync($"flight-{flightId}", notification, cancellationToken);
    }

    public Task SendUserNotificationAsync(Guid userId, NotificationDto notification, CancellationToken cancellationToken = default)
    {
        return SendNotificationAsync($"user-{userId}", notification, cancellationToken);
    }
}