using SmartFlightCompanion.WebServices.Infrastructure.Entities;

namespace SmartFlightCompanion.WebServices.Infrastructure.Persistence.Abstractions;

public interface IAirportRepository : IRepository<Airport>
{
    Task<IReadOnlyList<Airport>> SearchAsync(string query, CancellationToken cancellationToken = default);

    Task<Airport?> GetByIataAsync(string iata, CancellationToken cancellationToken = default);
}