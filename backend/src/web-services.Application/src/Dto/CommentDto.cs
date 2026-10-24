using System.ComponentModel.DataAnnotations;
using SmartFlightCompanion.WebServices.Infrastructure.Entities;

namespace SmartFlightCompanion.WebServices.Application.Dto;

public sealed record CommentDto(
    Guid Id,
    Guid AuthorId,
    string Author,
    string Content,
    Guid FlightId,
    string FlightNumber,
    DateTimeOffset CreatedAt
    )
{
    public static CommentDto FromEntity(Comment comment)
    {
        return new CommentDto(
            comment.Id,
            comment.Author.Id,
            comment.Author.FirstName + " " + comment.Author.LastName,
            comment.Content,
            comment.Flight.Id,
            comment.Flight.FlightNumber,
            comment.CreatedAt);
    }
}

public sealed record CommentRequestDto(
    [Required] Guid FlightId,
    [Required] string Content
);