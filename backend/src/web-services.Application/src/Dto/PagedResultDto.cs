namespace SmartFlightCompanion.WebServices.Application.Dto;

public sealed record PagedResultDto<T>(
    IReadOnlyList<T> Items,
    int Page,
    int PageSize,
    int TotalCount,
    bool HasNextPage
);