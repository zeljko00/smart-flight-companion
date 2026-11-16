using SmartFlightCompanion.WebServices.Infrastructure.Entities;

namespace SmartFlightCompanion.WebServices.Infrastructure.Persistence.Abstractions;

public interface IAIExchangeRepository : IRepository<AIExchange>
{
	Task<PagedResult<AIExchange>> GetPagedAsync(int page, int pageSize, CancellationToken cancellationToken = default);
}