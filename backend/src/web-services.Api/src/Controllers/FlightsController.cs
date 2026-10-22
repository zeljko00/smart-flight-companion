using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;
using SmartFlightCompanion.WebServices.Application.Dto;
using SmartFlightCompanion.WebServices.Application.Services;

namespace SmartFlightCompanion.WebServices.Api.Controllers;

[ApiController]
[Route("flights")]
public sealed class FlightsController : ControllerBase
{
    private readonly IFlightService _flightService;

    public FlightsController(IFlightService flightService)
    {
        _flightService = flightService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<FlightDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<FlightDto>>> GetAll(
        CancellationToken cancellationToken)
    {
        var flights = await _flightService.GetAll(cancellationToken);

        return Ok(flights);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(FlightDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<FlightDto>> GetById(
        Guid id,
        CancellationToken cancellationToken)
    {
        if (id == Guid.Empty)
        {
            return BadRequest("Invalid flight ID.");
        }

        var flight = await _flightService.GetById(id, cancellationToken);
        return flight is null ? NotFound() : Ok(flight);
    }

    [HttpGet("search")]
    [ProducesResponseType(typeof(IReadOnlyList<FlightDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<IReadOnlyList<FlightDto>>> Search(
        [FromQuery] SearchFlightsRequest request,
        CancellationToken cancellationToken)
    {
        var flights = await _flightService.Search(request.FlightNumber, request.Departure, request.Destination, request.Status, request.Airline, request.MaxPrice, request.DepartureTime, cancellationToken);

        return Ok(flights);
    }
}

public sealed class SearchFlightsRequest
{
    [FromQuery(Name = "flightNumber")]
    public string? FlightNumber { get; set; }

    [FromQuery(Name = "start")]
    public string? Departure { get; set; }

    [FromQuery(Name = "destination")]
    public string? Destination { get; set; }

    [FromQuery(Name = "status")]
    public string? Status { get; set; }

    [FromQuery(Name = "airline")]
    public string? Airline { get; set; }

    [FromQuery(Name = "maxPrice")]
    public decimal? MaxPrice { get; set; }

    [FromQuery(Name = "departure")]
    public DateTimeOffset? DepartureTime { get; set; }
}