using SmartFlightCompanion.WebServices.Infrastructure.Entities;

namespace SmartFlightCompanion.WebServices.Infrastructure.Persistence.Abstractions;

public interface IBoardingPassRepository : IRepository<BoardingPass>
{
    Task<IReadOnlyList<BoardingPass>> GetByOwnerIdAsync(Guid ownerId, CancellationToken cancellationToken = default);
}