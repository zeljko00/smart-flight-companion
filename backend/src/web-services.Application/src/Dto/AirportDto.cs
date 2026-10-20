using SmartFlightCompanion.WebServices.Infrastructure.Entities;

namespace SmartFlightCompanion.WebServices.Application.Dto;

public sealed record AirportDto(
    Guid Id,
    string Name,
    string IATA,
    string City,
    string Country,
    string Address,
    double Latitude,
    double Longitude,
    string Description)
{
    public static AirportDto FromEntity(Airport airport)
    {
        return new AirportDto(
            airport.Id,
            airport.Name,
            airport.IATA,
            airport.City,
            airport.Country,
            airport.Address,
            airport.Latitude,
            airport.Longitude,
            airport.Description);
    }
}