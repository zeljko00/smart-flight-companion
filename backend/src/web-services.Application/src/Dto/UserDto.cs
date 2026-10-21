using System.ComponentModel.DataAnnotations;
using SmartFlightCompanion.WebServices.Infrastructure.Entities;

namespace SmartFlightCompanion.WebServices.Application.Dto;

public sealed record UserDto(
    Guid Id,
    string Username,
    string Email,
    string FirstName,
    string LastName,
    string Role,
    DateTimeOffset CreatedAt
    )
{
    public static UserDto FromEntity(User user)
    {
        return new UserDto(
            user.Id,
            user.Username,
            user.Email,
            user.FirstName,
            user.LastName,
            user.Role.ToString(),
            user.CreatedAt);
    }

}

public class UserLoginRequestDto
{
    [Required, MinLength(3), MaxLength(50)]
    public string? Username { get; set; }

    [Required, MinLength(5), MaxLength(128)]
    public string? Password { get; set; }
}

public sealed class UserRegisterRequestDto : UserLoginRequestDto
{
    [Required, EmailAddress, MaxLength(255)]
    public string? Email { get; set; }

    [Required, MaxLength(50)]
    public string? FirstName { get; set; }

    [Required, MaxLength(50)]
    public string? LastName { get; set; }

    public User ToEntity()
    {
        return new User
        {
            Username = Username!,
            PasswordHash = Password!,
            Email = Email!,
            FirstName = FirstName!,
            LastName = LastName!,
            Role = Role.Guest
        };
    }
}