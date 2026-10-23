using SmartFlightCompanion.WebServices.Infrastructure.Entities;

namespace SmartFlightCompanion.WebServices.Infrastructure.Persistence.Abstractions;

public interface IUserRepository : IRepository<User>
{
    Task<User?> GetByUsernameAsync(string username, CancellationToken cancellationToken = default);
    Task<bool> ExistsByUsernameAsync(string username, CancellationToken cancellationToken = default);
    Task<int> BlockUserAsync(Guid id, CancellationToken cancellationToken = default);
    Task<int> AuthorizeUserAsync(Guid id, CancellationToken cancellationToken = default);
    Task<int> ResetPasswordAsync(Guid id, string password, CancellationToken cancellationToken = default);
}