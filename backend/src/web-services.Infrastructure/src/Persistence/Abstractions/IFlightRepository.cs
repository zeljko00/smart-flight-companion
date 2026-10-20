using SmartFlightCompanion.WebServices.Infrastructure.Entities;

namespace SmartFlightCompanion.WebServices.Infrastructure.Persistence.Abstractions;

public interface IFlightRepository : IRepository<Flight>
{
    Task<IReadOnlyList<Flight>> GetByFlightNumberAsync(string flightNumber, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Flight>> GetByDepartureAsync(string departure, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Flight>> GetByDestinationAsync(string destination, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Flight>> GetByAirlineAsync(string airline, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Flight>> GetByPriceAsync(decimal price, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Flight>> GetByDepartureTimeAsync(DateTimeOffset departureTime, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Flight>> GetByArrivalTimeAsync(DateTimeOffset arrivalTime, CancellationToken cancellationToken = default);
}