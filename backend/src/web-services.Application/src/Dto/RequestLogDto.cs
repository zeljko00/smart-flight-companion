using SmartFlightCompanion.WebServices.Infrastructure.Entities;

namespace SmartFlightCompanion.WebServices.Application.Dto;

public sealed record RequestLogDto(
    Guid Id,
    string IpAddress,
    string HttpMethod,
    string Path,
    Guid? UserId,
    DateTimeOffset ReceivedAt,
    int? StatusCode)
{
    public static RequestLogDto FromEntity(RequestLog requestLog)
    {
        return new RequestLogDto(
            requestLog.Id,
            requestLog.IpAddress,
            requestLog.HttpMethod,
            requestLog.Path,
            requestLog.UserId,
            requestLog.ReceivedAt,
            requestLog.StatusCode);
    }
}
