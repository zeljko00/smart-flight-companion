namespace SmartFlightCompanion.WebServices.Application.Dto;

public sealed class NaturalLanguageFlightSearchRequestDto
{
    public required string Query { get; set; } = string.Empty;
    public int? Page { get; set; }
    public int? PageSize { get; set; }
}

public sealed record FlightSearchFiltersDto(
    string? FlightNumber,
    string? Departure,
    string? Destination,
    string? Airline,
    decimal? MaxPrice,
    DateTimeOffset? DepartureTimeStart,
    DateTimeOffset? DepartureTimeEnd,
    bool IsLlmApplied,
    string? MappingNote);

public sealed record NLFlightSearchResultDto(
    string Query,
    FlightSearchFiltersDto Filters,
    PagedResultDto<FlightDto> Flights);