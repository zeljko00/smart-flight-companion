using Microsoft.EntityFrameworkCore;
using SmartFlightCompanion.WebServices.Infrastructure.Entities;
using SmartFlightCompanion.WebServices.Infrastructure.Persistence.Abstractions;

namespace SmartFlightCompanion.WebServices.Infrastructure.Persistence.Repositories;

public sealed class RequestLogRepository : Repository<RequestLog>, IRequestLogRepository
{
    public RequestLogRepository(AppDbContext context)
        : base(context)
    {
    }

    public async Task<int> SetStatusCodeAsync(Guid id, int statusCode, CancellationToken cancellationToken = default)
    {
        return await Context.RequestLogs
            .Where(requestLog => requestLog.Id == id)
            .ExecuteUpdateAsync(
                setters => setters.SetProperty(requestLog => requestLog.StatusCode, statusCode),
                cancellationToken);
    }

    public async Task<PagedResult<RequestLog>> GetPagedAsync(
        int page,
        int pageSize,
        DateTimeOffset? from,
        DateTimeOffset? to,
        CancellationToken cancellationToken = default)
    {
        var query = ApplyTimeWindow(Context.RequestLogs.AsNoTracking(), from, to);

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderByDescending(requestLog => requestLog.ReceivedAt)
            .ThenBy(requestLog => requestLog.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return new PagedResult<RequestLog>(items, totalCount);
    }

    public async Task<IReadOnlyList<RequestLog>> GetByTimeWindowAsync(
        DateTimeOffset? from,
        DateTimeOffset? to,
        int limit,
        CancellationToken cancellationToken = default)
    {
        return await ApplyTimeWindow(Context.RequestLogs.AsNoTracking(), from, to)
            .OrderBy(requestLog => requestLog.ReceivedAt)
            .Take(limit)
            .ToListAsync(cancellationToken);
    }

    public async Task<int> CountByTimeWindowAsync(
        DateTimeOffset? from,
        DateTimeOffset? to,
        CancellationToken cancellationToken = default)
    {
        return await ApplyTimeWindow(Context.RequestLogs.AsNoTracking(), from, to)
            .CountAsync(cancellationToken);
    }

    private static IQueryable<RequestLog> ApplyTimeWindow(IQueryable<RequestLog> query, DateTimeOffset? from, DateTimeOffset? to)
    {
        if (from.HasValue)
        {
            query = query.Where(requestLog => requestLog.ReceivedAt >= from.Value);
        }

        if (to.HasValue)
        {
            query = query.Where(requestLog => requestLog.ReceivedAt <= to.Value);
        }

        return query;
    }
}
