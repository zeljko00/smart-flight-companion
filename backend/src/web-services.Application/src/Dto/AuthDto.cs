using System.ComponentModel.DataAnnotations;

namespace SmartFlightCompanion.WebServices.Application.Dto;

public sealed record AuthenticationResultDto(
    UserDto User,
    string AccessToken,
    string RefreshToken);

public sealed class RefreshTokenRequestDto
{
    [Required]
    public string? RefreshToken { get; set; }
}

public sealed class JwtOptions
{
    public const string SectionName = "Jwt";

    public string Issuer { get; set; } = "SmartFlightCompanion";
    public string Audience { get; set; } = "SmartFlightCompanion.Client";
    public string SigningKey { get; set; } = string.Empty;
    public int AccessTokenMinutes { get; set; } = 1;
    public int RefreshTokenMinutes { get; set; } = 15;
}