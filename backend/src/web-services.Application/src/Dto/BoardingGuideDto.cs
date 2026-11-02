using System.ComponentModel.DataAnnotations;
using SmartFlightCompanion.WebServices.Infrastructure.Entities;

namespace SmartFlightCompanion.WebServices.Application.Dto;

public sealed class BoardingGuideDto
{
    public Guid Id {get; init; }
    public Guid FlightId {get; init; }
    public string Description {get; init; } = string.Empty;
    public DateTimeOffset OpensAt {get; init; }
    public DateTimeOffset ClosesAt {get; init; }
    public List<string> ImageUrls {get; set; } = new List<string>();
    public List<string> VideoUrls {get; set; } = new List<string>();

    public static BoardingGuideDto FromEntity(BoardingGuide boardingGuide)
    {
        return new BoardingGuideDto
        {
            Id = boardingGuide.Id,
            FlightId = boardingGuide.Flight.Id,
            Description = boardingGuide.Description,
            OpensAt = boardingGuide.OpensAt,
            ClosesAt = boardingGuide.ClosesAt,
            ImageUrls = Array.Empty<string>().ToList(),
            VideoUrls = Array.Empty<string>().ToList()
        };
    }
}