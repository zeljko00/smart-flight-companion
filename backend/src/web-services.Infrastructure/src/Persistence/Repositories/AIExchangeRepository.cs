using SmartFlightCompanion.WebServices.Infrastructure.Entities;
using SmartFlightCompanion.WebServices.Infrastructure.Persistence.Abstractions;
using Microsoft.EntityFrameworkCore;

namespace SmartFlightCompanion.WebServices.Infrastructure.Persistence.Repositories;

public sealed class AIExchangeRepository : Repository<AIExchange>, IAIExchangeRepository
{
    public AIExchangeRepository(AppDbContext context)
        : base(context)
    {
    }

    public async Task<PagedResult<AIExchange>> GetPagedAsync(int page, int pageSize, CancellationToken cancellationToken = default)
    {
        var query = Context.AIExchanges.AsNoTracking();
        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderByDescending(aiExchange => aiExchange.Timestamp)
            .ThenBy(aiExchange => aiExchange.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return new PagedResult<AIExchange>(items, totalCount);
    }
}