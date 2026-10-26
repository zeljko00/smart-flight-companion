using System.ComponentModel.DataAnnotations;
using SmartFlightCompanion.WebServices.Infrastructure.Entities;

namespace SmartFlightCompanion.WebServices.Application.Dto;

public sealed record BoardingPassDto(
    Guid Id,
    Guid FlightId,
    string FlightNumber,
    string FlightAirline,
    string FlightDepartureAirport,
    string FlightArrivalAirport,
    DateTimeOffset FlightDepartureTime,
    DateTimeOffset FlightArrivalTime,
    Guid UserId,
    Seat Seat,
    decimal Price,
    DateTimeOffset IssuedAt,
    bool IsValid
    )
{
    public static BoardingPassDto FromEntity(BoardingPass BoardingPass)
    {
        return new BoardingPassDto(
            BoardingPass.Id,
            BoardingPass.Flight.Id,
            BoardingPass.Flight.FlightNumber,
            BoardingPass.Flight.Airline,
            BoardingPass.Flight.DepartureAirport.IATA,
            BoardingPass.Flight.ArrivalAirport.IATA,
            BoardingPass.Flight.DepartureTime,
            BoardingPass.Flight.ArrivalTime,
            BoardingPass.User.Id,
            BoardingPass.Seat,
            BoardingPass.Price,
            BoardingPass.IssuedAt,
            BoardingPass.IsValid
        );
    }
}

public sealed record BoardingPassRequestDto(
    [Required]
    Seat Seat
);