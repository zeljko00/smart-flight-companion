using SmartFlightCompanion.WebServices.Application.Dto;
using SmartFlightCompanion.WebServices.Infrastructure.Persistence.Abstractions;

namespace SmartFlightCompanion.WebServices.Application.Services;

public sealed class FlightService : IFlightService
{
    private readonly IFlightRepository _flightRepository;
    private readonly IBoardingPassService _boardingPassService;

    public FlightService(IFlightRepository flightRepository, IBoardingPassService boardingPassService)
    {
        _flightRepository = flightRepository;
        _boardingPassService = boardingPassService;
    }

    public async Task<FlightDto?> GetById(Guid id, CancellationToken cancellationToken = default)
    {
        var flight = await _flightRepository.GetByIdAsync(id, cancellationToken);

        if (flight is null)
        {
            return null;
        }

        int count = await _boardingPassService.GetCountByFlightId(flight.Id, cancellationToken);
        int seatsFree = Math.Max(0, flight.SeatCapacity - count);
        return FlightDto.FromEntity(flight) with { SeatsFree = seatsFree }; 
    }

    public async Task<IReadOnlyList<FlightDto>> GetAll(CancellationToken cancellationToken = default)
    {
        var flights = await _flightRepository.GetAsync(cancellationToken);

        var mappedFlights = flights.Select(FlightDto.FromEntity);
        var result = await Task.WhenAll(mappedFlights.Select(async flight =>
        {
            var count = await _boardingPassService.GetCountByFlightId(flight.Id, cancellationToken);
            var seatsFree = Math.Max(0, flight.SeatCapacity - count);

            return flight with { SeatsFree = seatsFree };
        }));

        return result.ToList().AsReadOnly();
    }

    public async Task<IReadOnlyList<FlightDto>> Search(
        string? flightNumber,
        string? departure,
        string? destination,
        string? status,
        string? airline,
        decimal? maxPrice,
        DateTimeOffset? departureTime,
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
            cancellationToken);

        var mappedFlights = flights.Select(FlightDto.FromEntity);
        var result = await Task.WhenAll(mappedFlights.Select(async flight =>
        {
            var count = await _boardingPassService.GetCountByFlightId(flight.Id, cancellationToken);
            var seatsFree = Math.Max(0, flight.SeatCapacity - count);

            return flight with { SeatsFree = seatsFree };
        }));

        return result.ToList().AsReadOnly();
    }
}
