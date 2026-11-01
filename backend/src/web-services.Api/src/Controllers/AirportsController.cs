using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;
using SmartFlightCompanion.WebServices.Application.Dto;
using SmartFlightCompanion.WebServices.Application.Services;
using SmartFlightCompanion.WebServices.Infrastructure.Persistence;

namespace SmartFlightCompanion.WebServices.Api.Controllers;

[ApiController]
[Route("airports")]
public sealed class AirportsController : ControllerBase
{
    private readonly IAirportService _airportService;

    public AirportsController(IAirportService airportService)
    {
        _airportService = airportService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<AirportDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<AirportDto>>> GetAll(
        CancellationToken cancellationToken)
    {
        var airports = await _airportService.GetAll(cancellationToken);

        return Ok(airports);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(AirportDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<AirportDto>> GetById(
        Guid id,
        CancellationToken cancellationToken)
    {
        if (id == Guid.Empty)
        {
            return BadRequest("Invalid airport ID.");
        }

        var airport = await _airportService.GetById(id, cancellationToken);
        return airport is null ? NotFound() : Ok(airport);
    }

    [HttpGet("search")]
    [ProducesResponseType(typeof(IReadOnlyList<AirportDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<AirportDto>>> Search(
        [FromQuery] string? query,
        CancellationToken cancellationToken)
    {
        IReadOnlyList<AirportDto> airports;

        if (string.IsNullOrWhiteSpace(query))
        {
            airports = await _airportService.GetAll(cancellationToken);
        }
        else
        {
            airports = await _airportService.Search(query, cancellationToken);
        }

        return Ok(airports);
    }

    [HttpPost]
    [ProducesResponseType(typeof(AirportDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<AirportDto>> Create(
        [FromBody] AirportCreateRequestDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            var airport = await _airportService.Create(request, cancellationToken);
            return CreatedAtAction(nameof(GetById), new { id = airport.Id }, airport);
        }
        catch (DuplicateResourceException)
        {
            return Conflict("An airport with this IATA code already exists.");
        }
        catch (AddressResolutionException exception)
        {
            return UnprocessableEntity(exception.Message);
        }
    }
}

