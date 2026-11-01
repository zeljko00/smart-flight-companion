using System.ComponentModel.DataAnnotations;

namespace SmartFlightCompanion.WebServices.Infrastructure.Entities;

public class RequestLog
{
    public const int MaxIpAddressLength = 45;
    public const int MaxMethodLength = 10;
    public const int MaxPathLength = 2048;

    [Key]
    public Guid Id { get; private init; } = Guid.NewGuid();
    [Required]
    public required string IpAddress { get; set; }
    [Required]
    public required string HttpMethod { get; set; }
    [Required]
    public required string Path { get; set; }
    public DateTimeOffset ReceivedAt { get; private init; } = DateTimeOffset.UtcNow;
    public int? StatusCode { get; set; }
}
