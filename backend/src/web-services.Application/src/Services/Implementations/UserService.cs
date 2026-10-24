using SmartFlightCompanion.WebServices.Application.Dto;
using SmartFlightCompanion.WebServices.Infrastructure.Persistence.Abstractions;

using System;
using System.Text;
using System.Security.Cryptography;

namespace SmartFlightCompanion.WebServices.Application.Services;

public sealed class UserService : IUserService
{
    private readonly IUserRepository _userRepository;

    public UserService(IUserRepository userRepository)
    {
        _userRepository = userRepository;
    }

    private static string Hash(string value)
    {
        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value)));
    }

    public async Task<UserDto?> GetById(Guid id, CancellationToken cancellationToken = default)
    {
        var user = await _userRepository.GetByIdAsync(id, cancellationToken);
        return user is null ? null : UserDto.FromEntity(user);
    }

    public async Task<UserDto?> Login(UserLoginRequestDto request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(request.Password) || string.IsNullOrEmpty(request.Username))
        {
            return null;
        }

        var user = await _userRepository.GetByUsernameAsync(request.Username, cancellationToken);
        if (user is null || user.PasswordHash != Hash(request.Password))
        {
            return null;
        }

        return UserDto.FromEntity(user);
    }

    public async Task<UserDto?> Register(UserRegisterRequestDto request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(request.Password) || string.IsNullOrEmpty(request.Username))
        {
            return null;
        }

        if (await _userRepository.ExistsByUsernameAsync(request.Username, cancellationToken))
        {
            return null;
        }

        var userEntity = request.ToEntity();
        userEntity.PasswordHash = Hash(request.Password);

        var result = await _userRepository.CreateAsync(userEntity, cancellationToken);
        
        return UserDto.FromEntity(result);
    }
    public async Task<IReadOnlyList<UserDto>> GetAll(CancellationToken cancellationToken = default)
    {
        var users = await _userRepository.GetAsync(cancellationToken);
        return users.Select(UserDto.FromEntity).ToList().AsReadOnly();
    }

    public async Task<bool> Block(Guid id, CancellationToken cancellationToken = default)
    {
        var affectedRows = await _userRepository.BlockUserAsync(id, cancellationToken);
        return affectedRows > 0;
    }

    public async Task<bool> Authorize(Guid id, CancellationToken cancellationToken = default)
    {
        var affectedRows = await _userRepository.AuthorizeUserAsync(id, cancellationToken);
        return affectedRows > 0;
    }

    public async Task<bool> ResetPassword(Guid id, string newPassword, CancellationToken cancellationToken = default)
    {
        var hashedPassword = Hash(newPassword);
        var affectedRows = await _userRepository.ResetPasswordAsync(id, hashedPassword, cancellationToken);
        return affectedRows > 0;
    }

    public string GenerateRandomPassword()
    {
        var random = new Random();
        const string upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const string lower = "abcdefghijklmnopqrstuvwxyz";
        const string digits = "0123456789";
        const string special = "!@#$%^&*()_+-=[]{}|;:,.<>?";
        var passwordChars = new List<char>
        {
            upper[random.Next(upper.Length)],
            lower[random.Next(lower.Length)],
            digits[random.Next(digits.Length)],
            special[random.Next(special.Length)]
        };
        for (int i = 4; i < random.Next(15, 25); i++)
        {
            var allChars = upper + lower + digits + special;
            passwordChars.Add(allChars[random.Next(allChars.Length)]);
        }
        
        return new string(passwordChars.OrderBy(x => random.Next()).ToArray());
    }
}
