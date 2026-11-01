using SmartFlightCompanion.WebServices.Infrastructure.Entities;

namespace SmartFlightCompanion.WebServices.Infrastructure.Persistence.Abstractions;

public interface IRequestLogRepository : IRepository<RequestLog>
{
    Task<int> SetStatusCodeAsync(Guid id, int statusCode, CancellationToken cancellationToken = default);
    Task<PagedResult<RequestLog>> GetPagedAsync(int page, int pageSize, DateTimeOffset? from, DateTimeOffset? to, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<RequestLog>> GetByTimeWindowAsync(DateTimeOffset? from, DateTimeOffset? to, int limit, CancellationToken cancellationToken = default);
    Task<int> CountByTimeWindowAsync(DateTimeOffset? from, DateTimeOffset? to, CancellationToken cancellationToken = default);
}
