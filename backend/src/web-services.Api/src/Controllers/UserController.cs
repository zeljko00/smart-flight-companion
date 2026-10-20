using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;
using SmartFlightCompanion.WebServices.Application.Dto;
using SmartFlightCompanion.WebServices.Application.Services;

namespace SmartFlightCompanion.WebServices.Api.Controllers;

[ApiController]
[Route("users")]
public sealed class UserController : ControllerBase
{
    private readonly IUserService _userService;

    public UserController(IUserService userService)
    {
        _userService = userService;
    }

    [HttpPost]
    [ProducesResponseType(typeof(UserDto), StatusCodes.Status201Created)]
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
    public async Task<ActionResult<UserDto>> Login(
        [FromBody] UserLoginRequestDto request,
        CancellationToken cancellationToken)
    {
        var user = await _userService.Login(request, cancellationToken);
        if( user is null)
        {
            return Unauthorized("Wrong credentials. Try again.");
        }
        else
        {
            return Ok(user);
        }
    }
}