using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartFlightCompanion.WebServices.Application.Dto;
using SmartFlightCompanion.WebServices.Application.Services;
using SmartFlightCompanion.WebServices.Infrastructure.Entities;
using SmartFlightCompanion.WebServices.Infrastructure.Mail;

namespace SmartFlightCompanion.WebServices.Api.Controllers;

[ApiController]
[Route("users")]
public sealed class UserController : ControllerBase
{
    private readonly IUserService _userService;
    private readonly IBoardingPassService _boardingPassService;
    private readonly IEmailQueue _emailQueue;

    public UserController(IUserService userService, IBoardingPassService boardingPassService, IEmailQueue emailQueue)
    {
        _userService = userService;
        _boardingPassService = boardingPassService;
        _emailQueue = emailQueue;
    }

    [Authorize(Policy = "AdminOnly")]
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<UserDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<UserDto>>> GetAll(CancellationToken cancellationToken)
    {
        var users = await _userService.GetAll(cancellationToken);
        return Ok(users);
    }

    [Authorize(Policy = "AdminOnly")]
    [HttpPut("{id}/authorize")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult> Authorize(
        [FromRoute] Guid id,
        CancellationToken cancellationToken)
    {
        var updated = await _userService.Authorize(id, cancellationToken);
        if (!updated)
        {
            return NotFound();
        }
        return Ok();
    }

    [Authorize(Policy = "AdminOnly")]
    [HttpPut("{id}/reset")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult> Reset(
        [FromRoute] Guid id,
        [FromQuery] string language,
        CancellationToken cancellationToken)
    {
        var user = await _userService.GetById(id, cancellationToken);
        if (user is null)
        {
            return NotFound();
        }

        var newPassword = _userService.GenerateRandomPassword();
        var updated = await _userService.ResetPassword(id, newPassword, cancellationToken);

        if (!updated)
        {
            return NotFound();
        }

        if(string.Equals(language, "srb", StringComparison.OrdinalIgnoreCase))
        {
            await _emailQueue.EnqueueAsync(
                new EmailQueueItem(
                    user.Email,
                    "Vaša SmartFlightCompanion lozinka je resetovana",
                    "Zdravo {{FirstName}},\n\nVaša lozinka za nalog je resetovana.\nNova lozinka: {{Password}}\n\nSmartFlightCompanion tim",
                    new Dictionary<string, string>
                    {
                        ["FirstName"] = user.FirstName,
                        ["Password"] = newPassword,
                    }),
                cancellationToken);    
        }
        else
        {
            await _emailQueue.EnqueueAsync(
                new EmailQueueItem(
                    user.Email,
                    "Your SmartFlightCompanion password was reset",
                    "Hello {{FirstName}},\n\nYour account password has been reset.\nNew password: {{Password}}\n\nSmartFlightCompanion Team",
                    new Dictionary<string, string>
                    {
                        ["FirstName"] = user.FirstName,
                        ["Password"] = newPassword,
                    }),
                cancellationToken);
        }

        return Ok();
    }

    [Authorize(Policy = "AdminOnly")]
    [HttpPut("{id}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]

    public async Task<ActionResult> Block(
        [FromRoute] Guid id,
        CancellationToken cancellationToken)
    {
        if (id == Guid.Empty)
        {
            return BadRequest("Invalid user ID.");
        }
        
        var updated = await _userService.Block(id, cancellationToken);
        if (!updated)
        {
            return NotFound();
        }
        return Ok();
    }

    [Authorize]
    [HttpGet("me/boarding-passes")]
    [ProducesResponseType(typeof(IReadOnlyList<BoardingPassDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<IReadOnlyList<BoardingPassDto>>> GetBoardingPassesByUser(
        CancellationToken cancellationToken)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out var id))
        {
            return Forbid("Invalid user.");
        }

        var boardingPasses = await _boardingPassService.GetByOwnerId(id, cancellationToken);
        return Ok(boardingPasses);
    }

    [Authorize]
    [HttpGet("me/boarding-passes/{id:guid}/pdf")]
    [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult> GetBoardingPassPdfById(
        [FromRoute] Guid id,
        CancellationToken cancellationToken)
    {
        if (id == Guid.Empty)
        {
            return BadRequest("Invalid boarding pass ID.");
        }

        var pdfBytes = await _boardingPassService.GetPdfById(id, cancellationToken);
        if (pdfBytes is null)
        {
            return NotFound();
        }

        return File(pdfBytes, "application/pdf", $"boarding-pass-{id}.pdf");
    }
}