using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using SmartFlightCompanion.WebServices.Application.Dto;
using SmartFlightCompanion.WebServices.Application.Services;
using SmartFlightCompanion.WebServices.Infrastructure.Entities;
using SmartFlightCompanion.WebServices.Infrastructure.Persistence;
using System.Security.Claims;

namespace SmartFlightCompanion.WebServices.Api.Controllers;

[ApiController]
[Route("flights")]
public sealed class FlightsController : ControllerBase
{
    private readonly IFlightService _flightService;
    private readonly IAIService _aiService;
    private readonly IAIExchangeService _aiExchangeService;
    private readonly ICommentService _commentService;
    private readonly IBoardingPassService _boardingPassService;
    private readonly IPaymentService _paymentService;
    private readonly ILogger<FlightsController> _logger;

    private readonly IBoardingGuideService _boardingGuideService;

    public FlightsController(
        IFlightService flightService,
        IAIService aiService,
        IAIExchangeService aiExchangeService,
        ICommentService commentService,
        IBoardingPassService boardingPassService,
        IPaymentService paymentService,
        IBoardingGuideService boardingGuideService,
        ILogger<FlightsController> logger)
    {
        _flightService = flightService;
        _aiService = aiService;
        _aiExchangeService = aiExchangeService;
        _commentService = commentService;
        _boardingPassService = boardingPassService;
        _paymentService = paymentService;
        _boardingGuideService = boardingGuideService;
        _logger = logger;
    }

    [Authorize(Policy = "JwtOrApiKey")]
    [HttpGet]
    [ProducesResponseType(typeof(PagedResultDto<FlightDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResultDto<FlightDto>>> GetAll(
        CancellationToken cancellationToken,
        [FromQuery] int? page,
        [FromQuery] int? pageSize)
    {
        if (page.HasValue && page.Value < 1)
        {
            return BadRequest("Page must be greater than or equal to 1.");
        }

        if (pageSize.HasValue && (pageSize.Value < 1))
        {
            return BadRequest("Page size must be greater than or equal to 1.");
        }

        if (!page.HasValue || !pageSize.HasValue)
        {
            page = null;
            pageSize = null;
        }

        var flights = await _flightService.GetAll(page, pageSize, cancellationToken);

        return Ok(flights);
    }

    [Authorize(Policy = "JwtOrApiKey")]
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(FlightDetailsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<FlightDetailsDto>> GetById(
        Guid id,
        CancellationToken cancellationToken)
    {
        if (id == Guid.Empty)
        {
            return BadRequest("Invalid flight ID.");
        }

        var flight = await _flightService.GetById(id, cancellationToken);
        if (flight is null)
        {
            return NotFound();
        }

        IReadOnlyList<AIExchangeDto> aiExchanges = [];
        var userIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (Guid.TryParse(userIdValue, out var userId))
        {
            aiExchanges = await _aiExchangeService.GetByFlightAndUserId(id, userId, cancellationToken);
        }

        return Ok(new FlightDetailsDto(flight, aiExchanges));
    }

    [Authorize(Policy = "AdminOnly")]
    [HttpPost]
    [ProducesResponseType(typeof(FlightDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<FlightDto>> Create(
        [FromBody] FlightRequestDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            var flight = await _flightService.Create(request, cancellationToken);
            return CreatedAtAction(nameof(GetById), new { id = flight.Id }, flight);
        }
        catch (FlightValidationException exception)
        {
            _logger.LogWarning(exception, "Flight creation request failed validation.");
            return BadRequest(exception.Message);
        }
        catch (DuplicateResourceException)
        {
            _logger.LogWarning("Flight creation request conflicts with an existing flight number.");
            return Conflict("A flight with this flight number already exists.");
        }
    }

    [Authorize(Policy = "AdminOnly")]
    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(FlightDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<FlightDto>> Update(
        Guid id,
        [FromBody] FlightRequestDto request,
        CancellationToken cancellationToken)
    {
        if (id == Guid.Empty)
        {
            return BadRequest("Invalid flight ID.");
        }

        try
        {
            var flight = await _flightService.Update(id, request, cancellationToken);
            return flight is null ? NotFound() : Ok(flight);
        }
        catch (FlightValidationException exception)
        {
            _logger.LogWarning(exception, "Flight update request failed validation for flight {FlightId}.", id);
            return BadRequest(exception.Message);
        }
        catch (DuplicateResourceException)
        {
            _logger.LogWarning("Flight update request conflicts with an existing flight number for flight {FlightId}.", id);
            return Conflict("A flight with this flight number already exists.");
        }
    }

    [Authorize(Policy = "JwtOrApiKey")]
    [HttpGet("search")]
    [ProducesResponseType(typeof(PagedResultDto<FlightDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<PagedResultDto<FlightDto>>> Search(
        [FromQuery] SearchFlightsRequest request,
        CancellationToken cancellationToken)
    {
        if (request.Page.HasValue && request.Page.Value < 1)
        {
            return BadRequest("Page must be greater than or equal to 1.");
        }

        if (request.PageSize.HasValue && (request.PageSize.Value < 1))
        {
            return BadRequest("Page size must be greater than or equal to 1.");
        }

        var page = request.Page;
        var pageSize = request.PageSize;

        if (!page.HasValue || !pageSize.HasValue)
        {
            page = null;
            pageSize = null;
        }

        DateTimeOffset? departureStart = null;
        DateTimeOffset? departureEnd = null;

        if (request.DepartureTime.HasValue)
        {
            var departureDayStart = request.DepartureTime.Value.ToUniversalTime().Date;
            departureStart = departureDayStart;
            departureEnd = departureDayStart.AddDays(1).AddSeconds(-1); // End of the day (23:59:59)
        }

        var flights = await _flightService.Search(
            request.FlightNumber,
            request.Departure,
            request.Destination,
            request.Status,
            request.Airline,
            request.MaxPrice,
            departureStart,
            departureEnd,
            page,
            pageSize,
            cancellationToken);

        return Ok(flights);
    }

    [Authorize(Policy = "JwtOrApiKey")]
    [HttpPost("search/natural-language")]
    [ProducesResponseType(typeof(NLFlightSearchResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<NLFlightSearchResultDto>> SearchNaturalLanguage(
        [FromBody] NaturalLanguageFlightSearchRequestDto request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Query))
        {
            return BadRequest("Query is required.");
        }

        if (request.Page.HasValue && request.Page.Value < 1)
        {
            return BadRequest("Page must be greater than or equal to 1.");
        }

        if (request.PageSize.HasValue && request.PageSize.Value < 1)
        {
            return BadRequest("Page size must be greater than or equal to 1.");
        }

        var page = request.Page;
        var pageSize = request.PageSize;

        if (!page.HasValue || !pageSize.HasValue)
        {
            page = null;
            pageSize = null;
        }

        Guid? userId = null;
        var userIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (Guid.TryParse(userIdValue, out var parsedUserId))
        {
            userId = parsedUserId;
        }

        var result = await _flightService.SearchByNaturalLanguage(request.Query, userId, page, pageSize, cancellationToken);
        return Ok(result);
    }
    
    [Authorize(Policy = "VerifiedUserOnly")]
    [HttpPost("{flightId:guid}/advice")]
    [ProducesResponseType(typeof(FlightAdviceResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<FlightAdviceResponseDto>> GetFlightAdvice(
        [FromRoute] Guid flightId,
        [FromBody] FlightAdviceRequestDto request,
        CancellationToken cancellationToken)
    {
        if (flightId == Guid.Empty)
        {
            return BadRequest("Invalid flight ID.");
        }

        if (string.IsNullOrWhiteSpace(request.Query))
        {
            return BadRequest("Query is required.");
        }

        var flight = await _flightService.GetById(flightId, cancellationToken);
        if (flight is null)
        {
            return NotFound("Flight not found.");
        }

        Guid? userId = null;
        var userIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (Guid.TryParse(userIdValue, out var parsedUserId))
        {
            userId = parsedUserId;
        }

        var advice = await _aiService.GetAdviceAsync(request.Query, userId, flightId, cancellationToken);
        if (string.IsNullOrWhiteSpace(advice))
        {
            return BadRequest("Failed to generate flight advice.");
        }

        return Ok(new FlightAdviceResponseDto(advice));
    }

    [Authorize(Policy = "VerifiedUserOnly")]
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

    [Authorize(Policy = "VerifiedUserOnly")]
    [HttpPost("{flightId:guid}/boarding-passes")]
    [ProducesResponseType(typeof(PaymentSessionDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<PaymentSessionDto>> CreateBoardingPassPaymentSession(
        [FromRoute] Guid flightId,
        [FromBody] BoardingPassRequestDto request,
        CancellationToken cancellationToken)
    {
        if (flightId == Guid.Empty)
        {
            return BadRequest("Invalid flight ID.");
        }

        var authenticatedUserIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(authenticatedUserIdValue, out var authenticatedUserId))
        {
            return Unauthorized("Invalid authenticated user context.");
        }

        var session = await _paymentService.RequestPaymentSessionAsync(
            flightId,
            authenticatedUserId,
            request.Seat,
            request.ReturnPath,
            cancellationToken);

        if (session is null)
        {
            return BadRequest("Failed to create boarding pass payment session.");
        }

        return Created(string.Empty, session);
    }

    [Authorize(Policy = "VerifiedUserOnly")]
    [HttpGet("{flightId:guid}/boarding-guides")]
    [ProducesResponseType(typeof(IReadOnlyList<BoardingGuideDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<IReadOnlyList<BoardingGuideDto>>> GetBoardingGuidesByFlight(
        [FromRoute] Guid flightId,
        CancellationToken cancellationToken)
    {
        if (flightId == Guid.Empty)
        {
            return BadRequest("Invalid flight ID.");
        }
        // TODO: take user from session
        var guides = await _boardingGuideService.GetByFlightIdAsync(flightId, false, cancellationToken);
        return Ok(guides);
    }

    [Authorize(Policy = "AdminOnly")]
    [HttpPost("{flightId:guid}/boarding-guides")]
    [ProducesResponseType(typeof(BoardingGuideDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<BoardingGuideDto>> CreateBoardingGuide(
        [FromRoute] Guid flightId,
        [FromBody] BoardingGuideDto request,
        CancellationToken cancellationToken)
    {
        if (flightId == Guid.Empty)
        {
            return BadRequest("Invalid flight ID.");
        }

        var createRequest = new BoardingGuideDto
        {
            FlightId = flightId,
            Description = request.Description,
            OpensAt = request.OpensAt,
            ClosesAt = request.ClosesAt,
            ImageUrls = request.ImageUrls,
            VideoUrls = request.VideoUrls,
        };

        var guide = await _boardingGuideService.CreateAsync(createRequest, cancellationToken);

        if (guide is null)
        {
            return BadRequest("Failed to create boarding guide.");
        }

        return Created(string.Empty, guide);
    }

    [Authorize(Policy = "AdminOnly")]
    [HttpPost("{flightId:guid}/boarding-guides/{guideId:guid}/media")]
    [ProducesResponseType(typeof(string), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<string>> UploadMedia(
        [FromRoute] Guid flightId,
        [FromRoute] Guid guideId,
        [FromBody] BoardingGuideMediaRequestDto request,
        CancellationToken cancellationToken)
    {
        if (flightId == Guid.Empty || guideId == Guid.Empty)
        {
            return BadRequest("Invalid flight or guide ID.");
        }

        var mediaUrl = await _boardingGuideService.UploadMediaUrlAsync(guideId, request.Type, request.Url, request.Extension, cancellationToken);

        if (mediaUrl is null)
        {
            return BadRequest("Failed to upload media.");
        }

        return Created(string.Empty, mediaUrl);
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

    [FromQuery(Name = "page")]
    public int? Page { get; set; }

    [FromQuery(Name = "pageSize")]
    public int? PageSize { get; set; }
}