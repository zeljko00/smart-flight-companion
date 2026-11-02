using Microsoft.EntityFrameworkCore;
using SmartFlightCompanion.WebServices.Infrastructure.Entities;
using SmartFlightCompanion.WebServices.Infrastructure.Persistence.Abstractions;

namespace SmartFlightCompanion.WebServices.Infrastructure.Persistence.Repositories;

public sealed class MediaRepository : Repository<Media>, IMediaRepository
{
    public MediaRepository(AppDbContext context)
        : base(context)
    {
    }

    public async Task<IReadOnlyList<Media>> GetByGuideIdAsync(Guid guideId, CancellationToken cancellationToken = default)
    {
        return await Context.Media
            .AsNoTracking()
            .Include(media => media.BoardingGuide)
            .Where(media => media.BoardingGuide.Id == guideId)
            .ToListAsync(cancellationToken);
    }
}