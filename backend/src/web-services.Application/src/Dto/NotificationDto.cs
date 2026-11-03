namespace SmartFlightCompanion.WebServices.Application.Dto;

public sealed record NotificationDto(
    string Title,
    string Message,
    DateTimeOffset Timestamp
);