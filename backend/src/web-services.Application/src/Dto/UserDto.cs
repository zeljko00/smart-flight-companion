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
    bool IsActive,
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
            user.IsActive,
            user.CreatedAt);
    }

}

public class UserLoginRequestDto
{
    // TODO: Uncomment these attributes to enable validation for username and password
    // [Required(ErrorMessage = "username_missing"), MinLength(12, ErrorMessage = "invalid_username_length"), MaxLength(50)]
    // [RegularExpression(@"^[^@#/]+$", ErrorMessage = "invalid_username" )]
    public string? Username { get; set; }

    // [Required(ErrorMessage = "password_missing"), MinLength(15, ErrorMessage = "invalid_password_length"), MaxLength(128)]
    // [RegularExpression(@"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$", ErrorMessage = "invalid_password")]
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