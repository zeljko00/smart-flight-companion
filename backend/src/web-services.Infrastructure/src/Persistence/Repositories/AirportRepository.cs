using Microsoft.EntityFrameworkCore;
using SmartFlightCompanion.WebServices.Infrastructure.Entities;
using SmartFlightCompanion.WebServices.Infrastructure.Persistence.Abstractions;

namespace SmartFlightCompanion.WebServices.Infrastructure.Persistence.Repositories;

public sealed class AirportRepository : Repository<Airport>, IAirportRepository
{
    public AirportRepository(AppDbContext context)
        : base(context)
    {
    }

    public Task<Airport?> GetByIataCodeAsync(string iataCode, CancellationToken cancellationToken = default)
    {
        var normalizedIataCode = Normalize(iataCode);

        return Context.Airports
            .AsNoTracking()
            .FirstOrDefaultAsync(airport => airport.IATA.ToUpper() == normalizedIataCode, cancellationToken);
    }

    public async Task<IReadOnlyList<Airport>> SearchAsync(string query, CancellationToken cancellationToken = default)
    {
        var normalizedQuery = Normalize(query);

        return await Context.Airports
            .AsNoTracking()
            .Where(airport =>
                airport.City.ToUpper().Contains(normalizedQuery) ||
                airport.Country.ToUpper().Contains(normalizedQuery) ||
                airport.Name.ToUpper().Contains(normalizedQuery) ||
                airport.IATA.ToUpper().Contains(normalizedQuery))
            .ToListAsync(cancellationToken);
    }

    private static string Normalize(string value)
    {
        return value.Trim().ToUpperInvariant();
    }
}