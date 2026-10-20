using System.ComponentModel.DataAnnotations;

namespace SmartFlightCompanion.WebServices.Infrastructure.Entities;

public class BoardingGuide
{
    [Key]
    public Guid Id { get; private init; } = Guid.NewGuid();
    [Required]
    public required Flight Flight { get; set; }
    public string Description { get; set; } = string.Empty;
    [Required]
    public required DateTimeOffset OpensAt { get; set; }
    [Required]
    public required DateTimeOffset ClosesAt { get; set; }
    public string VideoUrl { get; set; } = string.Empty;
}