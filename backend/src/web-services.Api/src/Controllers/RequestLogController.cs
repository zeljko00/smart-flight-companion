using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using SmartFlightCompanion.WebServices.Application.Dto;
using SmartFlightCompanion.WebServices.Application.Services;

namespace SmartFlightCompanion.WebServices.Api.Controllers;

[ApiController]
[Route("logs")]
public sealed class RequestLogController : ControllerBase
{
    private readonly IRequestLogService _requestLogService;
    private readonly IAIExchangeService _aiExchangeService;

    public RequestLogController(IRequestLogService requestLogService, IAIExchangeService aiExchangeService)
    {
        _requestLogService = requestLogService;
        _aiExchangeService = aiExchangeService;
    }

    [Authorize(Policy = "AdminOnly")]
    [HttpGet]
    [ProducesResponseType(typeof(PagedResultDto<RequestLogDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<PagedResultDto<RequestLogDto>>> GetPaged(
        CancellationToken cancellationToken,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] DateTimeOffset? from = null,
        [FromQuery] DateTimeOffset? to = null)
    {
        if (page < 1)
        {
            return BadRequest("Page must be greater than or equal to 1.");
        }

        if (pageSize < 1)
        {
            return BadRequest("Page size must be greater than or equal to 1.");
        }

        if (from.HasValue && to.HasValue && from > to)
        {
            return BadRequest("'from' must not be later than 'to'.");
        }

        var result = await _requestLogService.GetPaged(page, pageSize, from, to, cancellationToken);
        return Ok(result);
    }

    [Authorize(Policy = "AdminOnly")]
    [HttpGet("ai")]
    [ProducesResponseType(typeof(PagedResultDto<AIExchangeDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<PagedResultDto<AIExchangeDto>>> GetPagedAIExchanges(
        CancellationToken cancellationToken,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        if (page < 1)
        {
            return BadRequest("Page must be greater than or equal to 1.");
        }

        if (pageSize < 1)
        {
            return BadRequest("Page size must be greater than or equal to 1.");
        }

        var result = await _aiExchangeService.GetPaged(page, pageSize, cancellationToken);
        return Ok(result);
    }

    [Authorize(Policy = "AdminOnly")]
    [HttpGet("pdf")]
    [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult> GetPdfByTimeWindow(
        CancellationToken cancellationToken,
        [FromQuery] DateTimeOffset? from = null,
        [FromQuery] DateTimeOffset? to = null)
    {
        if (from.HasValue && to.HasValue && from > to)
        {
            return BadRequest("'from' must not be later than 'to'.");
        }

        var pdfBytes = await _requestLogService.GetPdfByTimeWindow(from, to, cancellationToken);

        var fromLabel = from.HasValue ? from.Value.UtcDateTime.ToString("yyyyMMddTHHmmss") : "start";
        var toLabel = to.HasValue ? to.Value.UtcDateTime.ToString("yyyyMMddTHHmmss") : "now";

        return File(pdfBytes, "application/pdf", $"log-{fromLabel}-{toLabel}.pdf");
    }
}
