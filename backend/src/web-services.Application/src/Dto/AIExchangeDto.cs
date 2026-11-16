using SmartFlightCompanion.WebServices.Infrastructure.Entities;

namespace SmartFlightCompanion.WebServices.Application.Dto;

public sealed record AIExchangeDto(
    Guid Id,
    string Request,
    string Response,
    Guid? UserId,
    Guid? FlightId,
    DateTimeOffset Timestamp)
{
    public static AIExchangeDto FromEntity(AIExchange aiExchange)
    {
        return new AIExchangeDto(
            aiExchange.Id,
            aiExchange.Request,
            aiExchange.Response,
            aiExchange.UserId,
            aiExchange.FlightId,
            aiExchange.Timestamp);
    }
}