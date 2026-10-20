using SmartFlightCompanion.WebServices.Infrastructure.Entities;

namespace SmartFlightCompanion.WebServices.Application.Dto;

public sealed record FlightDto(
    Guid Id,
    string FligtNumber,
    AirportSummaryDto DepartureAirport,
    AirportSummaryDto ArrivalAirport,
    string Status,
    int Terminal,
    string Gate,
    string Airline,
    string Aircraft,
    int SeatCapacity,
    int SeatsFree,
    DateTimeOffset ScheduledDepartureTime,
    DateTimeOffset ScheduledArrivalTime,
    DateTimeOffset DepartureTime,
    DateTimeOffset ArrivalTime,
    decimal? EconomyPrice,
    decimal? PremiumEconomyPrice,
    decimal? BusinessPrice,
    decimal? FirstClassPrice)
{
    public static FlightDto FromEntity(Flight flight)
    {
        return new FlightDto(
            flight.Id,
            flight.FlightNumber,
            AirportSummaryDto.FromEntity(flight.DepartureAirport),
            AirportSummaryDto.FromEntity(flight.ArrivalAirport),
            flight.Status.ToString(),
            flight.Terminal,
            flight.Gate,
            flight.Airline,
            flight.Aircraft,
            flight.SeatCapacity,
            0, // TODO: count boarding passes
            flight.ScheduledDepartureTime,
            flight.ScheduledArrivalTime,
            flight.DepartureTime,
            flight.ArrivalTime,
            flight.EconomyPrice,
            flight.PremiumEconomyPrice,
            flight.BusinessPrice,
            flight.FirstClassPrice);
    }
}