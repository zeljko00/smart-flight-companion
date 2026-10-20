using Microsoft.EntityFrameworkCore;
using SmartFlightCompanion.WebServices.Infrastructure.Entities;
using SmartFlightCompanion.WebServices.Infrastructure.Persistence.Abstractions;

namespace SmartFlightCompanion.WebServices.Infrastructure.Persistence.Repositories;

public sealed class FlightRepository : Repository<Flight>, IFlightRepository
{
    public FlightRepository(AppDbContext context)
        : base(context)
    {
    }

    public async Task<IReadOnlyList<Flight>> GetByFlightNumberAsync(string flightNumber, CancellationToken cancellationToken = default)
    {
        var normalizedFlightNumber = Normalize(flightNumber);

        return await Context.Flights
            .AsNoTracking()
            .Where(flight => flight.FlightNumber.ToUpper() == normalizedFlightNumber)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<Flight>> GetByDepartureAsync(string departure, CancellationToken cancellationToken = default)
    {
        var normalizedDeparture = Normalize(departure);

        return await Context.Flights
            .AsNoTracking()
            .Where(flight =>
                flight.DepartureAirport.Name.ToUpper() == normalizedDeparture ||
                flight.DepartureAirport.IATA.ToUpper() == normalizedDeparture ||
                flight.DepartureAirport.City.ToUpper() == normalizedDeparture ||
                flight.DepartureAirport.Country.ToUpper() == normalizedDeparture)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<Flight>> GetByDestinationAsync(string destination, CancellationToken cancellationToken = default)
    {
        var normalizedDestination = Normalize(destination);

        return await Context.Flights
            .AsNoTracking()
            .Where(flight =>
                flight.ArrivalAirport.Name.ToUpper() == normalizedDestination ||
                flight.ArrivalAirport.IATA.ToUpper() == normalizedDestination ||
                flight.ArrivalAirport.City.ToUpper() == normalizedDestination ||
                flight.ArrivalAirport.Country.ToUpper() == normalizedDestination)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<Flight>> GetByAirlineAsync(string airline, CancellationToken cancellationToken = default)
    {
        var normalizedAirline = Normalize(airline);

        return await Context.Flights
            .AsNoTracking()
            .Where(flight => flight.Airline.ToUpper() == normalizedAirline)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<Flight>> GetByPriceAsync(decimal price, CancellationToken cancellationToken = default)
    {
        return await Context.Flights
            .AsNoTracking()
            .Where(flight => flight.EconomyPrice <= price || flight.PremiumEconomyPrice <= price || flight.BusinessPrice <= price || flight.FirstClassPrice <= price)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<Flight>> GetByDepartureTimeAsync(DateTimeOffset departureTime, CancellationToken cancellationToken = default)
    {
        return await Context.Flights
            .AsNoTracking()
            .Where(flight => flight.ScheduledDepartureTime == departureTime)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<Flight>> GetByArrivalTimeAsync(DateTimeOffset arrivalTime, CancellationToken cancellationToken = default)
    {
        return await Context.Flights
            .AsNoTracking()
            .Where(flight => flight.ScheduledArrivalTime == arrivalTime)
            .ToListAsync(cancellationToken);
    }

    private static string Normalize(string value)
    {
        return value.Trim().ToUpperInvariant();
    }
}