using System.ComponentModel.DataAnnotations;

namespace SmartFlightCompanion.WebServices.Application.Dto;

/// <summary>
/// Payload used both to create a flight and to replace the editable fields of an existing one.
/// </summary>
public sealed class FlightRequestDto
{
    [Required, MaxLength(10)]
    public string? FlightNumber { get; set; }

    [Required, RegularExpression(@"^[A-Za-z]{3}$", ErrorMessage = "Departure airport IATA code must consist of exactly 3 letters.")]
    public string? DepartureAirportIata { get; set; }

    [Required, RegularExpression(@"^[A-Za-z]{3}$", ErrorMessage = "Arrival airport IATA code must consist of exactly 3 letters.")]
    public string? ArrivalAirportIata { get; set; }

    [Required]
    public string? Status { get; set; }

    [Required, Range(0, 99)]
    public int? Terminal { get; set; }

    [Required, MaxLength(10)]
    public string? Gate { get; set; }

    [Required, MaxLength(128)]
    public string? Airline { get; set; }

    [Required, MaxLength(128)]
    public string? Aircraft { get; set; }

    [Required, Range(1, 1000)]
    public int? SeatCapacity { get; set; }

    [Required]
    public DateTimeOffset? ScheduledDepartureTime { get; set; }

    [Required]
    public DateTimeOffset? ScheduledArrivalTime { get; set; }

    /// <summary>Actual departure time. Defaults to the scheduled departure time when omitted.</summary>
    public DateTimeOffset? DepartureTime { get; set; }

    /// <summary>Actual arrival time. Defaults to the scheduled arrival time when omitted.</summary>
    public DateTimeOffset? ArrivalTime { get; set; }

    [Range(typeof(decimal), "0", "1000000")]
    public decimal? EconomyPrice { get; set; }

    [Range(typeof(decimal), "0", "1000000")]
    public decimal? PremiumEconomyPrice { get; set; }

    [Range(typeof(decimal), "0", "1000000")]
    public decimal? BusinessPrice { get; set; }

    [Range(typeof(decimal), "0", "1000000")]
    public decimal? FirstClassPrice { get; set; }
}
