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

    public override async Task<Flight?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await Context.Flights
            .AsNoTracking()
            .Include(flight => flight.DepartureAirport)
            .Include(flight => flight.ArrivalAirport)
            .FirstOrDefaultAsync(flight => flight.Id == id, cancellationToken);
    }

    public override async Task<IReadOnlyList<Flight>> GetAsync(CancellationToken cancellationToken = default)
    {
        return await Context.Flights
            .AsNoTracking()
            .Include(flight => flight.DepartureAirport)
            .Include(flight => flight.ArrivalAirport)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<Flight>> Search(
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
        var normalizedFlightNumber = NormalizeOrNull(flightNumber);
        var normalizedDeparture = NormalizeOrNull(departure);
        var normalizedDestination = NormalizeOrNull(destination);
        var normalizedStatus = NormalizeOrNull(status);
        var normalizedAirline = NormalizeOrNull(airline);

        var query = Context.Flights
            .AsNoTracking()
            .Include(flight => flight.DepartureAirport)
            .Include(flight => flight.ArrivalAirport)
            .AsQueryable();

        if (normalizedFlightNumber is not null)
        {
            query = query.Where(flight => flight.FlightNumber.ToUpper().Contains(normalizedFlightNumber));
        }

        if (normalizedDeparture is not null)
        {
            query = query.Where(flight =>
                flight.DepartureAirport.Name.ToUpper().Contains(normalizedDeparture) ||
                flight.DepartureAirport.IATA.ToUpper().Contains(normalizedDeparture) ||
                flight.DepartureAirport.City.ToUpper().Contains(normalizedDeparture) ||
                flight.DepartureAirport.Country.ToUpper().Contains(normalizedDeparture));
        }

        if (normalizedDestination is not null)
        {
            query = query.Where(flight =>
                flight.ArrivalAirport.Name.ToUpper().Contains(normalizedDestination) ||
                flight.ArrivalAirport.IATA.ToUpper().Contains(normalizedDestination) ||
                flight.ArrivalAirport.City.ToUpper().Contains(normalizedDestination) ||
                flight.ArrivalAirport.Country.ToUpper().Contains(normalizedDestination));
        }

        if (normalizedStatus is not null)
        {
            query = query.Where(flight => flight.Status.ToString().ToUpper().Contains(normalizedStatus));
        }

        if (normalizedAirline is not null)
        {
            query = query.Where(flight => flight.Airline.ToUpper().Contains(normalizedAirline));
        }

        if (maxPrice is not null)
        {
            var price = maxPrice.Value;
            query = query.Where(flight =>
                (flight.EconomyPrice.HasValue && flight.EconomyPrice.Value <= price) ||
                (flight.PremiumEconomyPrice.HasValue && flight.PremiumEconomyPrice.Value <= price) ||
                (flight.BusinessPrice.HasValue && flight.BusinessPrice.Value <= price) ||
                (flight.FirstClassPrice.HasValue && flight.FirstClassPrice.Value <= price));
        }

        if (departureTime is not null)
        {
            var time = departureTime.Value;
            query = query.Where(flight => time.Date ==  flight.ScheduledDepartureTime.Date);
        }

        if (arrivalTime is not null)
        {
            var time = arrivalTime.Value;
            query = query.Where(flight => time.Date ==  flight.ScheduledArrivalTime.Date);
        }

        return await query.ToListAsync(cancellationToken);
    }

    private static string? NormalizeOrNull(string? value)
    {
        return string.IsNullOrWhiteSpace(value)
            ? null
            : value.Trim().ToUpperInvariant();
    }
}