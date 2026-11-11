using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartFlightCompanion.WebServices.Application.Dto;
using SmartFlightCompanion.WebServices.Application.Services;
using SmartFlightCompanion.WebServices.Infrastructure.Persistence;

namespace SmartFlightCompanion.WebServices.Api.Controllers;

[ApiController]
[Route("api-keys")]
[Authorize(Policy = "AdminOnly")]
public sealed class ApiKeysController : ControllerBase
{
    private readonly IApiKeyService _apiKeyService;

    public ApiKeysController(IApiKeyService apiKeyService)
    {
        _apiKeyService = apiKeyService;
    }

    [HttpPost]
    [ProducesResponseType(typeof(ApiKeyDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<ApiKeyDto>> Create(
        [FromBody] ApiKeyRequestDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _apiKeyService.CreateAsync(request, cancellationToken);
            if (result is null)
            {
                return BadRequest("API key name is required.");
            }

            return StatusCode(StatusCodes.Status201Created, result);
        }
        catch (DuplicateResourceException)
        {
            return Conflict("An API key with this name already exists.");
        }
    }
}