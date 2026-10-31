using SmartFlightCompanion.WebServices.Application.Dto;

namespace SmartFlightCompanion.WebServices.Application.Services;

public interface IFlightService
{
    Task<FlightDto?> GetById(Guid id, CancellationToken cancellationToken = default);
    Task<PagedResultDto<FlightDto>> GetAll(int? page, int? pageSize, CancellationToken cancellationToken = default);
    Task<PagedResultDto<FlightDto>> Search(
        string? flightNumber,
        string? departure,
        string? destination,
        string? status,
        string? airline,
        decimal? maxPrice,
        DateTimeOffset? departureTime,
        int? page,
        int? pageSize,
        CancellationToken cancellationToken = default);
}