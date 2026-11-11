using SmartFlightCompanion.WebServices.Application.Dto;

namespace SmartFlightCompanion.WebServices.Application.Services;

public interface IApiKeyService
{
    Task<ApiKeyDto?> CreateAsync(ApiKeyRequestDto request, CancellationToken cancellationToken = default);
    Task<bool> ValidateAsync(string plainTextApiKey, CancellationToken cancellationToken = default);
}