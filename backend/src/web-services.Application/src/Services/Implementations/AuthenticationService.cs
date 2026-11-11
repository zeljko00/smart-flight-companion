using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using SmartFlightCompanion.WebServices.Application.Dto;
using SmartFlightCompanion.WebServices.Infrastructure.Entities;
using SmartFlightCompanion.WebServices.Infrastructure.Persistence.Abstractions;

namespace SmartFlightCompanion.WebServices.Application.Services;

public sealed class AuthenticationService : IAuthenticationService
{
    private readonly IUserRepository _userRepository;
    private readonly JwtOptions _jwtOptions;

    public AuthenticationService(
        IUserRepository userRepository,
        IOptions<JwtOptions> jwtOptions)
    {
        _userRepository = userRepository;
        _jwtOptions = jwtOptions.Value;
    }

    public async Task<AuthenticationResultDto?> Login(UserLoginRequestDto request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
        {
            return null;
        }

        var user = await _userRepository.GetByUsernameAsync(request.Username, cancellationToken);
        if (user is null || user.PasswordHash != Hash(request.Password) || !user.IsActive)
        {
            return null;
        }

        var accessToken = GenerateAccessToken(user, out var accessTokenExpiresAtUtc);
        var refreshToken = GenerateRefreshToken();

        user.RefreshToken = Hash(refreshToken);
        user.RefreshTokenExpiresAt = DateTimeOffset.UtcNow.AddMinutes(_jwtOptions.RefreshTokenMinutes);
        await _userRepository.UpdateAsync(user, cancellationToken);

        return new AuthenticationResultDto(UserDto.FromEntity(user), accessToken, refreshToken);
    }

    public async Task<AuthenticationResultDto?> Refresh(string refreshToken, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(refreshToken))
        {
            return null;
        }

        var refreshTokenHash = Hash(refreshToken);
        var user = await _userRepository.GetByRefreshTokenAsync(refreshTokenHash, cancellationToken);

        if (user is null || user.RefreshTokenExpiresAt <= DateTimeOffset.UtcNow || user.IsActive == false)
        {
            return null;
        }

        var accessToken = GenerateAccessToken(user, out var accessTokenExpiresAtUtc);
        return new AuthenticationResultDto(UserDto.FromEntity(user), accessToken, refreshToken);
    }

    private string GenerateAccessToken(User user, out DateTimeOffset expiresAt)
    {
        var now = DateTimeOffset.UtcNow;
        var accessTokenMinutes = Math.Max(1, _jwtOptions.AccessTokenMinutes);
        expiresAt = now.AddMinutes(accessTokenMinutes);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Name, user.Username),
            new(ClaimTypes.Role, user.Role.ToString())
        };

        var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtOptions.SigningKey));
        var credentials = new SigningCredentials(signingKey, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _jwtOptions.Issuer,
            audience: _jwtOptions.Audience,
            claims: claims,
            notBefore: now.UtcDateTime,
            expires: expiresAt.UtcDateTime,
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private static string GenerateRefreshToken()
    {
        Span<byte> bytes = stackalloc byte[64];
        RandomNumberGenerator.Fill(bytes);
        return Convert.ToBase64String(bytes);
    }

    private static string Hash(string value)
    {
        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value)));
    }
}