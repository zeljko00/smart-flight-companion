using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;

namespace SmartFlightCompanion.WebServices.Infrastructure.Entities;

[Index(nameof(Username), IsUnique = true)]
public class User
{
    [Key]
    public Guid Id { get; private init; } = Guid.NewGuid();
    [Required, MaxLength(50)]
    public required string Username { get; set; }
    [Required, MaxLength(255)]
    public required string PasswordHash { get; set; }
    [Required, MaxLength(255), EmailAddress]
    public required string Email { get; set; }
    [Required, MaxLength(50)]
    public required string FirstName { get; set; }
    [Required, MaxLength(50)]
    public required string LastName { get; set; }
    public Role Role { get; set; } = Role.Guest;
    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAt { get; private init; } = DateTimeOffset.UtcNow;
}