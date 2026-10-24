using SmartFlightCompanion.WebServices.Infrastructure.Entities;

namespace SmartFlightCompanion.WebServices.Infrastructure.Persistence.Abstractions;

public interface ICommentRepository : IRepository<Comment>
{
    Task<IReadOnlyList<Comment>> GetByFlightIdAsync(Guid flightId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Comment>> GetAllGroupedByFlightAsync(CancellationToken cancellationToken = default);
    Task<int> DeleteByIdAsync(Guid id, CancellationToken cancellationToken = default);
}