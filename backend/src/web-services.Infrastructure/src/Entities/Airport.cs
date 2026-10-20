using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;

namespace SmartFlightCompanion.WebServices.Infrastructure.Entities;

[Index(nameof(IATA), IsUnique = true)]
public class Airport
{   [Key]
    public Guid Id { get; private init; } = Guid.NewGuid();
    [Required, MaxLength(255)]
    public required string Name { get; set; }
    [Required, MaxLength(255), RegularExpression(@"^[A-Z]{3}$")]
    public required string IATA { get; set; }
    [Required, MaxLength(50)]
    public required string City { get; set; }
    [Required, MaxLength(50)]
    public required string Country { get; set; }
    [Required, MaxLength(255)]
    public required string Address { get; set; }
    public required double Latitude { get; set; }
    public required double Longitude { get; set; }
    public string Description { get; set; } = string.Empty;
}