using Microsoft.EntityFrameworkCore;
using SmartFlightCompanion.WebServices.Infrastructure.Entities;
using SmartFlightCompanion.WebServices.Infrastructure.Persistence.Abstractions;

namespace SmartFlightCompanion.WebServices.Infrastructure.Persistence.Repositories;

public sealed class UserRepository : Repository<User>, IUserRepository
{
    public UserRepository(AppDbContext context)
        : base(context)
    {
    }

    public Task<User?> GetByUsernameAsync(string username, CancellationToken cancellationToken = default)
    {
        var normalizedUsername = Normalize(username);

        return Context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(user => user.Username.ToUpper() == normalizedUsername, cancellationToken);
    }

    public Task<bool> ExistsByUsernameAsync(string username, CancellationToken cancellationToken = default)
    {
        var normalizedUsername = Normalize(username);

        return Context.Users
            .AsNoTracking()
            .AnyAsync(user => user.Username.ToUpper() == normalizedUsername, cancellationToken);
    }

    public Task<int> BlockUserAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return Context.Users
            .Where(user => user.Id == id)
            .ExecuteUpdateAsync(
                setters => setters.SetProperty(user => user.IsActive, false),
                cancellationToken);
    }

    public Task<int> AuthorizeUserAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return Context.Users
            .Where(user => user.Id == id && user.Role != Role.Admin)
            .ExecuteUpdateAsync(
                setters => setters.SetProperty(user => user.Role, Role.User),
                cancellationToken);
    }

    private static string Normalize(string value)
    {
        return value.Trim().ToUpperInvariant();
    }
}