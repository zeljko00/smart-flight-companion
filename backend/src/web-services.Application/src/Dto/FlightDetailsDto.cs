namespace SmartFlightCompanion.WebServices.Application.Dto;

public sealed record FlightDetailsDto(
    FlightDto Flight,
    IReadOnlyList<AIExchangeDto> AiExchanges);
