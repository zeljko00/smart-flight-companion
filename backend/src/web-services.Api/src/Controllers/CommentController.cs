using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;
using SmartFlightCompanion.WebServices.Application.Dto;
using SmartFlightCompanion.WebServices.Application.Services;
using SmartFlightCompanion.WebServices.Infrastructure.Mail;

namespace SmartFlightCompanion.WebServices.Api.Controllers;

[ApiController]
[Route("comments")]
public sealed class CommentController : ControllerBase
{
    private readonly ICommentService _CommentService;

    public CommentController(ICommentService CommentService)
    {
        _CommentService = CommentService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<CommentDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<CommentDto>>> GetAll(
        CancellationToken cancellationToken)
    {
        var comments = await _CommentService.GetAllGroupedByFlight(cancellationToken);
        return Ok(comments);
    }

    [HttpPost]
    [ProducesResponseType(typeof(CommentDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<CommentDto>> Create(
        [FromBody] CommentRequestDto request,
        CancellationToken cancellationToken)
    {
        if (request.FlightId == Guid.Empty || string.IsNullOrWhiteSpace(request.Content))
        {
            return BadRequest("Invalid flight ID or content.");
        }

        Guid authorId = Guid.Parse("cf5804db-9f79-4072-91c2-6a555c5e7d50"); // TODO: take ID from session
        var comment = await _CommentService.Create(authorId, request.FlightId, request.Content, cancellationToken);
        
        if (comment is null)
        {
            return BadRequest("Failed to create comment. Author or flight may not exist.");
        }

        return Created(string.Empty, comment);
    }


    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult> Delete(
        [FromRoute] Guid id,
        CancellationToken cancellationToken)
    {
        var deleted = await _CommentService.Delete(id, cancellationToken);
        if (!deleted)
        {
            return NotFound();
        }
        return Ok();
    }
}
