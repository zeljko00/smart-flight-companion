using SmartFlightCompanion.WebServices.Infrastructure.Entities;

namespace SmartFlightCompanion.WebServices.Infrastructure.Persistence.Abstractions;

public interface IAirportRepository : IRepository<Airport>
{
    Task<Airport?> GetByIataCodeAsync(string iataCode, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Airport>> SearchAsync(string query, CancellationToken cancellationToken = default);
}