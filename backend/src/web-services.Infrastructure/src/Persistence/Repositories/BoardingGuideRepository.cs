using Microsoft.EntityFrameworkCore;
using SmartFlightCompanion.WebServices.Infrastructure.Entities;
using SmartFlightCompanion.WebServices.Infrastructure.Persistence.Abstractions;

namespace SmartFlightCompanion.WebServices.Infrastructure.Persistence.Repositories;

public sealed class BoardingGuideRepository : Repository<BoardingGuide>, IBoardingGuideRepository
{
    public BoardingGuideRepository(AppDbContext context)
        : base(context)
    {
    }

    public async Task<IReadOnlyList<BoardingGuide>> GetByFlightIdAsync(Guid flightId, CancellationToken cancellationToken = default)
    {
        return await Context.BoardingGuides
            .AsNoTracking()
            .Include(boardingGuide => boardingGuide.Flight)
            .Where(boardingGuide => boardingGuide.Flight.Id == flightId)
            .ToListAsync(cancellationToken);
    }
}