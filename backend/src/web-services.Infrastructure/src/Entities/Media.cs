using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;

namespace SmartFlightCompanion.WebServices.Infrastructure.Entities;

public class Media
{
    [Key]
    public Guid Id { get; private init; } = Guid.NewGuid();
    public required BoardingGuide BoardingGuide { get; set; }
    public string Url { get; set; } = string.Empty;
    public required MediaType Type { get; set; }
}