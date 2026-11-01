using System.ComponentModel.DataAnnotations;
using SmartFlightCompanion.WebServices.Infrastructure.Entities;

namespace SmartFlightCompanion.WebServices.Application.Dto;

public sealed class AirportCreateRequestDto
{
    [Required, MaxLength(255)]
    public string? Name { get; set; }

    [Required, RegularExpression(@"^[A-Za-z]{3}$", ErrorMessage = "IATA code must consist of exactly 3 letters.")]
    public string? IATA { get; set; }

    [Required, MaxLength(50)]
    public string? City { get; set; }

    [Required, MaxLength(50)]
    public string? Country { get; set; }

    [Required, Range(-90, 90)]
    public double? Latitude { get; set; }

    [Required, Range(-180, 180)]
    public double? Longitude { get; set; }

    [MaxLength(2000)]
    public string? Description { get; set; }

    /// <summary>The address is not part of the request; it is resolved from the coordinates.</summary>
    public Airport ToEntity(string address)
    {
        return new Airport
        {
            Name = Name!.Trim(),
            IATA = IATA!.Trim().ToUpperInvariant(),
            City = City!.Trim(),
            Country = Country!.Trim(),
            Address = address,
            Latitude = Latitude!.Value,
            Longitude = Longitude!.Value,
            Description = Description?.Trim() ?? string.Empty
        };
    }
}

public sealed record AirportSummaryDto(
    string Name,
    string IATA,
    string Address,
    double Latitude,
    double Longitude)
{
    public static AirportSummaryDto FromEntity(Airport airport)
    {
        return new AirportSummaryDto(
            airport.Name,
            airport.IATA,
            airport.Country + " " + airport.City + " " + airport.Address,
            airport.Latitude,
            airport.Longitude);
    }
}

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