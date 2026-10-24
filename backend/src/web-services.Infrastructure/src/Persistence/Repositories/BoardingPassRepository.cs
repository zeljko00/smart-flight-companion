using Microsoft.EntityFrameworkCore;
using SmartFlightCompanion.WebServices.Infrastructure.Entities;
using SmartFlightCompanion.WebServices.Infrastructure.Persistence.Abstractions;

namespace SmartFlightCompanion.WebServices.Infrastructure.Persistence.Repositories;

public sealed class BoardingPassRepository : Repository<BoardingPass>, IBoardingPassRepository
{
    public BoardingPassRepository(AppDbContext context)
        : base(context)
    {
    }

    public async Task<IReadOnlyList<BoardingPass>> GetByOwnerIdAsync(Guid ownerId, CancellationToken cancellationToken = default)
    {
        return await Context.BoardingPasses
            .AsNoTracking()
            .Include(boardingPass => boardingPass.User)
            .Include(boardingPass => boardingPass.Flight)
            .Where(boardingPass => boardingPass.User.Id == ownerId)
            .ToListAsync(cancellationToken);
    }

    public async Task<int> GetCountByFlightIdAsync(Guid flightId, CancellationToken cancellationToken = default)
    {
        return await Context.BoardingPasses
            .AsNoTracking()
            .Include(boardingPass => boardingPass.Flight)
            .Where(boardingPass => boardingPass.Flight.Id == flightId)
            .CountAsync(cancellationToken);
    }
}
