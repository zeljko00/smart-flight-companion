using Microsoft.EntityFrameworkCore;
using SmartFlightCompanion.WebServices.Infrastructure.Entities;
using SmartFlightCompanion.WebServices.Infrastructure.Persistence.Abstractions;

namespace SmartFlightCompanion.WebServices.Infrastructure.Persistence.Repositories;

public sealed class ApiKeyRepository : Repository<ApiKey>, IApiKeyRepository
{
    public ApiKeyRepository(AppDbContext context)
        : base(context)
    {
    }

    public Task<ApiKey?> GetByHashAsync(string keyHash, CancellationToken cancellationToken = default)
    {
        return Context.Set<ApiKey>()
            .FirstOrDefaultAsync(apiKey => apiKey.KeyHash == keyHash, cancellationToken);
    }

    public Task<ApiKey?> GetByNameAsync(string name, CancellationToken cancellationToken = default)
    {
        var normalizedName = Normalize(name);

        return Context.Set<ApiKey>()
            .AsNoTracking()
            .FirstOrDefaultAsync(apiKey => apiKey.Name.ToUpper() == normalizedName, cancellationToken);
    }

    private static string Normalize(string value)
    {
        return value.Trim().ToUpperInvariant();
    }
}