using SmartFlightCompanion.WebServices.Infrastructure.Entities;

namespace SmartFlightCompanion.WebServices.Application.Dto;

public sealed record BoardingGuideMediaRequestDto(
    MediaType Type,
    string? Url,
    string? Extension
);
