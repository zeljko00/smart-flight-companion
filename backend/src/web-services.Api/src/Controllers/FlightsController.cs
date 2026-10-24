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
    private readonly ICommentService _commentService;
    private readonly IBoardingPassService _boardingPassService;

    public FlightsController(IFlightService flightService, ICommentService commentService, IBoardingPassService boardingPassService)
    {
        _flightService = flightService;
        _commentService = commentService;
        _boardingPassService = boardingPassService;
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

    [HttpGet("{flightId:guid}/comments")]
    [ProducesResponseType(typeof(IReadOnlyList<CommentDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<IReadOnlyList<CommentDto>>> GetCommentsByFlight(
        [FromRoute] Guid flightId,
        CancellationToken cancellationToken)
    {
        if (flightId == Guid.Empty)
        {
            return BadRequest("Failed to buy boarding pass.");
        }

        var comments = await _commentService.GetByFlightId(flightId, cancellationToken);
        return Ok(comments);
    }

    [HttpPost("{flightId:guid}/boarding-passes")]
    [ProducesResponseType(typeof(BoardingPassDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<BoardingPassDto>> CreateBoardingPass(
        [FromRoute] Guid flightId,
        [FromBody] BoardingPassRequestDto request,
        CancellationToken cancellationToken)
    {
        if (flightId == Guid.Empty)
        {
            return BadRequest("Failed to create boarding pass.");
        }

        Guid ownerId = Guid.Parse("cf5804db-9f79-4072-91c2-6a555c5e7d50"); // TODO: take ID from session
        var boardingPass = await _boardingPassService.Create(flightId, ownerId, request.Seat, cancellationToken);

        if (boardingPass is null)
        {
            return BadRequest("Failed to create boarding pass.");
        }

        return Created(string.Empty, boardingPass);
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