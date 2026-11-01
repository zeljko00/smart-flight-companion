using Microsoft.EntityFrameworkCore;
using SmartFlightCompanion.WebServices.Infrastructure.Entities;
using SmartFlightCompanion.WebServices.Infrastructure.Persistence.Abstractions;

namespace SmartFlightCompanion.WebServices.Infrastructure.Persistence.Repositories;

public sealed class CommentRepository : Repository<Comment>, ICommentRepository
{
    public CommentRepository(AppDbContext context)
        : base(context)
    {
    }

    public async Task<IReadOnlyList<Comment>> GetByFlightIdAsync(Guid flightId, CancellationToken cancellationToken = default)
    {
        return await Context.Comments
            .AsNoTracking()
            .Include(comment => comment.Author)
            .Include(comment => comment.Flight)
            .Where(comment => comment.Flight.Id == flightId)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<Comment>> GetAllGroupedByFlightAsync(CancellationToken cancellationToken = default)
    {
        var comments = await Context.Comments
            .AsNoTracking()
            .Include(comment => comment.Author)
            .Include(comment => comment.Flight)
            .OrderBy(comment => comment.CreatedAt)
            .ToListAsync(cancellationToken);

        // Grouped in memory: EF Core can't reliably translate GroupBy + SelectMany with Include.
        return comments
            .GroupBy(comment => comment.Flight.Id)
            .SelectMany(group => group.OrderBy(comment => comment.CreatedAt))
            .ToList();
    }

    public async Task<int> DeleteByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await Context.Comments
            .Where(comment => comment.Id == id)
            .ExecuteDeleteAsync(cancellationToken);
    }
}