using SmartFlightCompanion.WebServices.Infrastructure.Entities;

namespace SmartFlightCompanion.WebServices.Infrastructure.Persistence.Abstractions;

public interface IFlightRepository : IRepository<Flight>
{
    Task<PagedResult<Flight>> GetPaged(int? page, int? pageSize, CancellationToken cancellationToken = default);

    Task<PagedResult<Flight>> Search(
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