using SmartFlightCompanion.WebServices.Application.Dto;

namespace SmartFlightCompanion.WebServices.Application.Services;

public interface IFlightService
{
    Task<FlightDto?> GetById(Guid id, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<FlightDto>> GetAll(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<FlightDto>> Search(
        string? flightNumber,
        string? departure,
        string? destination,
        string? status,
        string? airline,
        decimal? maxPrice,
        DateTimeOffset? departureTime,
        CancellationToken cancellationToken = default);
}