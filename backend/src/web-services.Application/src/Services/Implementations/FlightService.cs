using SmartFlightCompanion.WebServices.Application.Dto;
using SmartFlightCompanion.WebServices.Infrastructure.Persistence.Abstractions;

namespace SmartFlightCompanion.WebServices.Application.Services;

public sealed class FlightService : IFlightService
{
    private readonly IFlightRepository _flightRepository;

    public FlightService(IFlightRepository flightRepository)
    {
        _flightRepository = flightRepository;
    }

    public async Task<FlightDto?> GetById(Guid id, CancellationToken cancellationToken = default)
    {
        var flight = await _flightRepository.GetByIdAsync(id, cancellationToken);
        return flight is null ? null : FlightDto.FromEntity(flight);
    }

    public async Task<IReadOnlyList<FlightDto>> GetAll(CancellationToken cancellationToken = default)
    {
        var flights = await _flightRepository.GetAsync(cancellationToken);
        return flights.Select(FlightDto.FromEntity).ToList().AsReadOnly();
    }

    public async Task<IReadOnlyList<FlightDto>> Search(
        string? flightNumber,
        string? departure,
        string? destination,
        string? status,
        string? airline,
        decimal? maxPrice,
        DateTimeOffset? departureTime,
        DateTimeOffset? arrivalTime,
        CancellationToken cancellationToken = default)
    {
        var flights = await _flightRepository.Search(
            flightNumber,
            departure,
            destination,
            status,
            airline,
            maxPrice,
            departureTime,
            arrivalTime,
            cancellationToken);

        return flights.Select(FlightDto.FromEntity).ToList().AsReadOnly();
    }
}
