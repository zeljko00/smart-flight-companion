using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;
using SmartFlightCompanion.WebServices.Application.Dto;
using SmartFlightCompanion.WebServices.Application.Services;
using SmartFlightCompanion.WebServices.Infrastructure.Mail;

namespace SmartFlightCompanion.WebServices.Api.Controllers;

[ApiController]
[Route("users")]
public sealed class UserController : ControllerBase
{
    private readonly IUserService _userService;
    private readonly IEmailQueue _emailQueue;

    public UserController(IUserService userService, IEmailQueue emailQueue)
    {
        _userService = userService;
        _emailQueue = emailQueue;
    }

    [HttpPost]
    [ProducesResponseType(typeof(UserDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<UserDto>> Register(
        [FromBody] UserRegisterRequestDto request,
        CancellationToken cancellationToken)
    {
        var user = await _userService.Register(request, cancellationToken);
        if( user is null)
        {
            return BadRequest("Username not valid.");
        }
        else
        {
            return Created(string.Empty, user);
        }
    }

    [HttpPost("login")]
    [ProducesResponseType(typeof(UserDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]

    public async Task<ActionResult<UserDto>> Login(
        [FromBody] UserLoginRequestDto request,
        CancellationToken cancellationToken)
    {
        var user = await _userService.Login(request, cancellationToken);
        if( user is null)
        {
            return Unauthorized("failure");
        }
        else
        {
            return Ok(user);
        }
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<UserDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<UserDto>>> GetAll(CancellationToken cancellationToken)
    {
        var users = await _userService.GetAll(cancellationToken);
        return Ok(users);
    }

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
                    "Zdravo {{FirstName}},\n\nVaša lozinka za nalog je resetovana.\nKorisničko ime: {{Username}}\nNova lozinka: {{Password}}\n\nSmartFlightCompanion tim",
                    new Dictionary<string, string>
                    {
                        ["FirstName"] = user.FirstName,
                        ["Username"] = user.Username,
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
                    "Hello {{FirstName}},\n\nYour account password has been reset.\nUsername: {{Username}}\nNew password: {{Password}}\n\nSmartFlightCompanion Team",
                    new Dictionary<string, string>
                    {
                        ["FirstName"] = user.FirstName,
                        ["Username"] = user.Username,
                        ["Password"] = newPassword,
                    }),
                cancellationToken);
        }

        return Ok();
    }

    [HttpPut("{id}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult> Block(
        [FromRoute] Guid id,
        CancellationToken cancellationToken)
    {
        var updated = await _userService.Block(id, cancellationToken);
        if (!updated)
        {
            return NotFound();
        }
        return Ok();
    }
}