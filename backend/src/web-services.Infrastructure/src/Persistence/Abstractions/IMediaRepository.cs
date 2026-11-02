using SmartFlightCompanion.WebServices.Infrastructure.Entities;

namespace SmartFlightCompanion.WebServices.Infrastructure.Persistence.Abstractions;

public interface IMediaRepository : IRepository<Media>
{
    Task<IReadOnlyList<Media>> GetByGuideIdAsync(Guid guideId, CancellationToken cancellationToken = default);
}