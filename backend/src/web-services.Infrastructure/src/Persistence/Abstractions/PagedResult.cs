namespace SmartFlightCompanion.WebServices.Infrastructure.Persistence.Abstractions;

public sealed record PagedResult<T>(
    IReadOnlyList<T> Items,
    int TotalCount
);