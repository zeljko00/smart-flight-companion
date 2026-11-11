using SmartFlightCompanion.WebServices.Infrastructure.Entities;

namespace SmartFlightCompanion.WebServices.Infrastructure.Persistence.Abstractions;

public interface IApiKeyRepository : IRepository<ApiKey>
{
    Task<ApiKey?> GetByHashAsync(string keyHash, CancellationToken cancellationToken = default);
    Task<ApiKey?> GetByNameAsync(string name, CancellationToken cancellationToken = default);
}