using SmartFlightCompanion.WebServices.Application.Dto;

namespace SmartFlightCompanion.WebServices.Application.Services;

public interface IFlightSearchQueryMapper
{
    Task<FlightSearchFiltersDto> MapToFiltersAsync(string userQuery, Guid? userId, CancellationToken cancellationToken = default);
}