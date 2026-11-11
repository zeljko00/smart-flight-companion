using System.Security.Cryptography;
using System.Text;
using SmartFlightCompanion.WebServices.Application.Dto;
using SmartFlightCompanion.WebServices.Infrastructure.Entities;
using SmartFlightCompanion.WebServices.Infrastructure.Persistence;
using SmartFlightCompanion.WebServices.Infrastructure.Persistence.Abstractions;

namespace SmartFlightCompanion.WebServices.Application.Services;

public sealed class ApiKeyService : IApiKeyService
{
    private readonly IApiKeyRepository _apiKeyRepository;

    public ApiKeyService(IApiKeyRepository apiKeyRepository)
    {
        _apiKeyRepository = apiKeyRepository;
    }

    public async Task<ApiKeyDto?> CreateAsync(
        ApiKeyRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var name = request.Name?.Trim();
        if (string.IsNullOrWhiteSpace(name))
        {
            return null;
        }

        var exists = await _apiKeyRepository.GetByNameAsync(name, cancellationToken);
        if (exists is not null)
        {
            throw new DuplicateResourceException("An API key with this name already exists.");
        }

        var plainTextApiKey = GenerateApiKey();
        var entity = new ApiKey
        {
            Name = name,
            KeyHash = Hash(plainTextApiKey),
        };

        var created = await _apiKeyRepository.CreateAsync(entity, cancellationToken);

        return new ApiKeyDto(
            Name: created.Name,
            Key: plainTextApiKey);
    }

    public async Task<bool> ValidateAsync(string plainTextApiKey, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(plainTextApiKey))
        {
            return false;
        }

        var hash = Hash(plainTextApiKey);
        var apiKey = await _apiKeyRepository.GetByHashAsync(hash, cancellationToken);

        if (apiKey is null)
        {
            return false;
        }

        return true;
    }

    private static string GenerateApiKey()
    {
        Span<byte> bytes = stackalloc byte[32];
        RandomNumberGenerator.Fill(bytes);
        var secret = Convert.ToHexString(bytes);

        return $"sfc_{secret}";
    }

    private static string Hash(string value)
    {
        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value)));
    }
}