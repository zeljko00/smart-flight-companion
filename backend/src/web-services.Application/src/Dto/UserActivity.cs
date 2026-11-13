using SmartFlightCompanion.WebServices.Infrastructure.Entities;

namespace SmartFlightCompanion.WebServices.Application.Dto;

public sealed record UserActivityDto(
    DateTimeOffset At,
    int? ActiveUsersCount);
