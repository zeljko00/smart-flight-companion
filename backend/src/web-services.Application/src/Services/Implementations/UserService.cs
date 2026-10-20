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

    public async Task<UserDto?> Login(UserLoginRequestDto request, CancellationToken cancellationToken = default)
    {
        var user = await _userRepository.GetByUsernameAsync(request.Username, cancellationToken);
        if (user is null || user.PasswordHash != Hash(request.Password))
        {
            return null;
        }

        return UserDto.FromEntity(user);
    }

    public async Task<UserDto?> Register(UserRegisterRequestDto request, CancellationToken cancellationToken = default)
    {
        if (await _userRepository.ExistsByUsernameAsync(request.Username, cancellationToken))
        {
            return null;
        }

        var userEntity = request.ToEntity();
        userEntity.PasswordHash = Hash(request.Password);

        var result = await _userRepository.CreateAsync(userEntity, cancellationToken);
        
        return UserDto.FromEntity(result);
    }
}
