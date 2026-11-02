using SmartFlightCompanion.WebServices.Infrastructure.Entities;

namespace SmartFlightCompanion.WebServices.Infrastructure.Persistence.Abstractions;

public interface IBoardingGuideRepository : IRepository<BoardingGuide>
{
    Task<IReadOnlyList<BoardingGuide>> GetByFlightIdAsync(Guid flightId, CancellationToken cancellationToken = default);
}