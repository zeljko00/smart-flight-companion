using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartFlightCompanion.WebServices.Application.Dto;
using SmartFlightCompanion.WebServices.Application.Services;

namespace SmartFlightCompanion.WebServices.Api.Controllers;

[ApiController]
[Route("auth")]
public sealed class AuthController : ControllerBase
{
    private readonly IAuthenticationService _authenticationService;
    private readonly IUserService _userService;

    public AuthController(IAuthenticationService authenticationService, IUserService userService)
    {
        _authenticationService = authenticationService;
        _userService = userService;
    }

    [AllowAnonymous]
    [HttpPost("register")]
    [ProducesResponseType(typeof(AuthenticationResultDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<UserDto>> Register(
        [FromBody] UserRegisterRequestDto request,
        CancellationToken cancellationToken)
    {
        var user = await _userService.Register(request, cancellationToken);
        if( user is null)
        {
            return BadRequest("Username not valid.");
        }

        var authenticationResult = await _authenticationService.Login(new UserLoginRequestDto
        {
            Username = request.Username,
            Password = request.Password
        }, cancellationToken);

        return authenticationResult is null ? Unauthorized("Failed to authenticate.") : Created(string.Empty, authenticationResult);
    }

    [AllowAnonymous]
    [HttpPost("login")]
    [ProducesResponseType(typeof(AuthenticationResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<AuthenticationResultDto>> Login(
        [FromBody] UserLoginRequestDto request,
        CancellationToken cancellationToken)
    {
        var authenticationResult = await _authenticationService.Login(request, cancellationToken);
        return authenticationResult is null ? Unauthorized("Invalid username or password.") : Ok(authenticationResult);
    }

    [AllowAnonymous]
    [HttpPost("refresh")]
    [ProducesResponseType(typeof(AuthenticationResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<AuthenticationResultDto>> Refresh(
        [FromBody] RefreshTokenRequestDto request,
        CancellationToken cancellationToken)
    {
        var authenticationResult = await _authenticationService.Refresh(request.RefreshToken ?? string.Empty, cancellationToken);
        return authenticationResult is null ? Unauthorized("Refresh token is invalid or expired.") : Ok(authenticationResult);
    }
}