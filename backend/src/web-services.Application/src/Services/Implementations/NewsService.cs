using System.Globalization;
using System.Xml.Linq;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using SmartFlightCompanion.WebServices.Application.Dto;

namespace SmartFlightCompanion.WebServices.Application.Services;

public sealed class NewsService : INewsService
{
    private const int DefaultMaxItems = 10;
    private const int MaxAllowedItems = 50;

    private readonly HttpClient _httpClient;
    private readonly ILogger<NewsService> _logger;
    private readonly string _rssUrl;

    public NewsService(HttpClient httpClient, IConfiguration configuration, ILogger<NewsService> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
        _rssUrl = configuration["News:RssUrl"] ?? string.Empty;
    }

    public async Task<IReadOnlyList<NewsArticleDto>> GetLatest(int maxItems = DefaultMaxItems, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(_rssUrl))
        {
            return [];
        }

        var itemCount = Math.Clamp(maxItems, 1, MaxAllowedItems);

        try
        {
            using var response = await _httpClient.GetAsync(_rssUrl, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                return [];
            }

            await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
            var document = XDocument.Load(stream);
            var rssItems = ParseRss(document, itemCount);
            if (rssItems.Count > 0)
            {
                return rssItems;
            }
            return Array.Empty<NewsArticleDto>();
        }
        catch (HttpRequestException exception)
        {
            _logger.LogWarning(exception, "Fetching news RSS feed failed for URL {RssUrl}.", _rssUrl);
            return [];
        }
        catch (TaskCanceledException exception)
        {
            _logger.LogWarning(exception, "Fetching news RSS feed timed out for URL {RssUrl}.", _rssUrl);
            return [];
        }
        catch (InvalidOperationException exception)
        {
            _logger.LogWarning(exception, "Parsing RSS XML failed for URL {RssUrl}.", _rssUrl);
            return [];
        }
        catch (FormatException exception)
        {
            _logger.LogWarning(exception, "RSS feed contains invalid format for URL {RssUrl}.", _rssUrl);
            return [];
        }
    }

    private static IReadOnlyList<NewsArticleDto> ParseRss(XDocument document, int maxItems)
    {
        var items = document
            .Descendants("item")
            .Select(item =>
            {
                var title = item.Element("title")?.Value?.Trim();
                var link = item.Element("link")?.Value?.Trim();
                var summary = item.Element("description")?.Value?.Trim();
                var publishedAt = TryParseDate(item.Element("pubDate")?.Value);

                if (string.IsNullOrWhiteSpace(title) || string.IsNullOrWhiteSpace(link))
                {
                    return null;
                }

                return new NewsArticleDto(
                    title,
                    link,
                    string.IsNullOrWhiteSpace(summary) ? null : summary,
                    publishedAt);
            })
            .Where(article => article is not null)
            .Select(article => article!)
            .Take(maxItems)
            .ToList();

        return items.AsReadOnly();
    }

    private static DateTimeOffset? TryParseDate(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        return DateTimeOffset.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.AllowWhiteSpaces, out var parsed)
            ? parsed
            : null;
    }
}
