using System.ComponentModel.DataAnnotations;
using SmartFlightCompanion.WebServices.Infrastructure.Entities;

namespace SmartFlightCompanion.WebServices.Application.Dto;

public sealed record ApiKeyDto(
    string Key,
    string Name)
{
    public static ApiKeyDto FromEntity(ApiKey apiKey)
    {
        return new ApiKeyDto(
            apiKey.KeyHash,
            apiKey.Name);
    }
}

public sealed class ApiKeyRequestDto
{
    [Required, MaxLength(100)]
    public string? Name { get; set; }
}