using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;
using SmartFlightCompanion.WebServices.Application.Dto;
using SmartFlightCompanion.WebServices.Application.Services;

namespace SmartFlightCompanion.WebServices.Api.Controllers;

[ApiController]
[Route("news")]
public sealed class NewsController : ControllerBase
{
    private readonly INewsService _newsService;

    public NewsController(INewsService newsService)
    {
        _newsService = newsService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<NewsArticleDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<IReadOnlyList<NewsArticleDto>>> GetLatest(
        [FromQuery] NewsRequest request,
        CancellationToken cancellationToken)
    {
        var articles = await _newsService.GetLatest(request.Count, cancellationToken);
        return Ok(articles);
    }
}

public sealed class NewsRequest
{
    [FromQuery(Name = "count")]
    [Range(1, 50)]
    public int Count { get; set; } = 10;
}
