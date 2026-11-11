using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartFlightCompanion.WebServices.Application.Dto;
using SmartFlightCompanion.WebServices.Application.Services;

namespace SmartFlightCompanion.WebServices.Api.Controllers;

[ApiController]
[Route("auth")]
public sealed class AuthController : ControllerBase
{
    private const string RefreshTokenCookieName = "sfc_refresh_token";
    private readonly IAuthenticationService _authenticationService;
    private readonly IUserService _userService;

    public AuthController(IAuthenticationService authenticationService, IUserService userService)
    {
        _authenticationService = authenticationService;
        _userService = userService;
    }

    private void DeleteRefreshTokenCookies()
    {
        Response.Cookies.Delete(RefreshTokenCookieName, new CookieOptions
        {
            Path = "/",
            Secure = true,
            SameSite = SameSiteMode.None,
            HttpOnly = true,
        });

        Response.Cookies.Delete(RefreshTokenCookieName, new CookieOptions
        {
            Path = "/api/auth/refresh",
            Secure = true,
            SameSite = SameSiteMode.None,
            HttpOnly = true,
        });
    }

    private void SetRefreshTokenCookie(string refreshToken)
    {
        DeleteRefreshTokenCookies();

        Response.Cookies.Append(RefreshTokenCookieName, refreshToken, new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.Strict,
            Path = "/api/auth/refresh",
            IsEssential = true,
            Expires = DateTimeOffset.UtcNow.AddDays(30)
        });
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

        if (authenticationResult is null)
        {
            return Unauthorized("Failed to authenticate.");
        }

        SetRefreshTokenCookie(authenticationResult.RefreshToken);
        return Created(string.Empty, authenticationResult);
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
        if (authenticationResult is null)
        {
            return Unauthorized("Invalid username or password.");
        }

        SetRefreshTokenCookie(authenticationResult.RefreshToken);
        return Ok(authenticationResult);
    }

    [AllowAnonymous]
    [HttpPost("refresh")]
    [ProducesResponseType(typeof(AuthenticationResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<AuthenticationResultDto>> Refresh(
        CancellationToken cancellationToken)
    {
        Request.Cookies.TryGetValue(RefreshTokenCookieName, out var refreshToken);

        if (string.IsNullOrWhiteSpace(refreshToken))
        {
            DeleteRefreshTokenCookies();
            return Unauthorized("Refresh token cookie is missing.");
        }

        var authenticationResult = await _authenticationService.Refresh(refreshToken ?? string.Empty, cancellationToken);
        
        if (authenticationResult is null)
        {
            DeleteRefreshTokenCookies();
            return Unauthorized("Refresh token is invalid or expired.");
        }

        SetRefreshTokenCookie(authenticationResult.RefreshToken);
        return Ok(authenticationResult);
    }
}