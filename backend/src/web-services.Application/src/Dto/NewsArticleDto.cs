namespace SmartFlightCompanion.WebServices.Application.Dto;

public sealed record NewsArticleDto(
    string Title,
    string Link,
    string? Summary,
    DateTimeOffset? PublishedAt);
