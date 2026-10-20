using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;

namespace SmartFlightCompanion.WebServices.Infrastructure.Entities;

[Index(nameof(FlightNumber), IsUnique = true)]
public class Flight
{
    [Key]
    public Guid Id { get; private init; } = Guid.NewGuid();
    [Required, MaxLength(10)]
    public required string FlightNumber { get; set; }
    [Required]
    public required Airport DepartureAirport { get; set; }
    [Required]
    public required Airport ArrivalAirport { get; set; }
    [Required]
    public required FlightStatus Status { get; set; } = FlightStatus.Scheduled;
    [Required]
    public required int Terminal { get; set; }
    [Required]
    public required string Gate { get; set; }
    [Required, MaxLength(128)]
    public required string Airline { get; set; }
    [Required, MaxLength(128)]
    public required string Aircraft { get; set; }
    [Required]
    public required int SeatCapacity { get; set; }
    [Required]
    public required DateTimeOffset ScheduledDepartureTime { get; set; }
    [Required]
    public required DateTimeOffset ScheduledArrivalTime { get; set; }
    [Required]
    public required DateTimeOffset DepartureTime { get; set; }
    [Required]
    public required DateTimeOffset ArrivalTime { get; set; }
    public decimal? EconomyPrice { get; set; }
    public decimal? PremiumEconomyPrice { get; set; }
    public decimal? BusinessPrice { get; set; }
    public decimal? FirstClassPrice { get; set; }
}