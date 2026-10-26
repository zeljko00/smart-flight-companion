using SmartFlightCompanion.WebServices.Infrastructure.Entities;

namespace SmartFlightCompanion.WebServices.Infrastructure.Persistence.Abstractions;

public interface IBoardingPassRepository : IRepository<BoardingPass>
{
    Task<IReadOnlyList<BoardingPass>> GetByOwnerIdAsync(Guid ownerId, CancellationToken cancellationToken = default);
    Task<int> GetCountByFlightIdAsync(Guid flightId, CancellationToken cancellationToken = default);
    Task<BoardingPass?> GetByIdWithDetailsAsync(Guid id, CancellationToken cancellationToken = default);
}