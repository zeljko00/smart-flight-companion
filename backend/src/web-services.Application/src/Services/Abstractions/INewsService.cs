using SmartFlightCompanion.WebServices.Application.Dto;

namespace SmartFlightCompanion.WebServices.Application.Services;

public interface INewsService
{
    Task<IReadOnlyList<NewsArticleDto>> GetLatest(int maxItems = 10, CancellationToken cancellationToken = default);
}
