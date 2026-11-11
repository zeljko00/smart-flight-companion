using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;

namespace SmartFlightCompanion.WebServices.Infrastructure.Entities;

[Index(nameof(KeyHash), IsUnique = true)]
[Index(nameof(Name), IsUnique = true)]
public sealed class ApiKey
{
    [Key]
    public Guid Id { get; private init; } = Guid.NewGuid();

    [Required, MaxLength(100)]
    public required string Name { get; set; }

    [Required, MaxLength(64)]
    public required string KeyHash { get; set; }
}