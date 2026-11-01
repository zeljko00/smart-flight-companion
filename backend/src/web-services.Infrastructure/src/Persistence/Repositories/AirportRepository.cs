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

    public async Task<IReadOnlyList<Airport>> SearchAsync(string query, CancellationToken cancellationToken = default)
    {
        var normalizedQuery = Normalize(query);

        if(normalizedQuery is null)
        {
            return Array.Empty<Airport>();
        }

        return await Context.Airports
            .AsNoTracking()
            .Where(airport =>
                airport.City.ToUpper().Contains(normalizedQuery) ||
                airport.Country.ToUpper().Contains(normalizedQuery) ||
                airport.Name.ToUpper().Contains(normalizedQuery) ||
                airport.IATA.ToUpper().Contains(normalizedQuery))
            .ToListAsync(cancellationToken);
    }

    public async Task<Airport?> GetByIataAsync(string iata, CancellationToken cancellationToken = default)
    {
        var normalizedIata = Normalize(iata);

        if (normalizedIata is null)
        {
            return null;
        }

        // Tracked on purpose: the result is assigned to a Flight navigation property.
        return await Context.Airports
            .FirstOrDefaultAsync(airport => airport.IATA == normalizedIata, cancellationToken);
    }

    private static string? Normalize(string value)
    {
        return string.IsNullOrWhiteSpace(value)
            ? null
            : value.Trim().ToUpperInvariant();
    }
}