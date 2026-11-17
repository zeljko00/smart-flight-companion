namespace SmartFlightCompanion.WebServices.Application.Dto;

public sealed class FlightAdviceRequestDto
{
    public required string Query { get; set; } = string.Empty;
}

public sealed record FlightAdviceResponseDto(
    string Advice);
