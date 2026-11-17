using System.Globalization;
using System.Net.Http.Json;
using System.Text.RegularExpressions;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using SmartFlightCompanion.WebServices.Application.Dto;
using SmartFlightCompanion.WebServices.Infrastructure.Entities;
using SmartFlightCompanion.WebServices.Infrastructure.Persistence.Abstractions;

namespace SmartFlightCompanion.WebServices.Application.Services;

public sealed class AIService : IAIService
{
    private const string DefaultModel = "gemini-3.8-flash";
    private const int DefaultRequestTimeoutSeconds = 180;
    private static readonly Uri DefaultGeminiBaseUri = new("https://generativelanguage.googleapis.com/");

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        PropertyNameCaseInsensitive = true
    };

    private readonly HttpClient _httpClient;
    private readonly ILogger<AIService> _logger;
    private readonly IAIExchangeRepository _aiExchangeRepository;
    private readonly string? _apiKey;
    private readonly string _model;
    private readonly TimeSpan _requestTimeout;

    public AIService(
        HttpClient httpClient,
        IConfiguration configuration,
        IAIExchangeRepository aiExchangeRepository,
        ILogger<AIService> logger)
    {
        _httpClient = httpClient;
        _aiExchangeRepository = aiExchangeRepository;
        _logger = logger;
        _apiKey = Environment.GetEnvironmentVariable("Llm__ApiKey")
            ?? configuration["Llm:ApiKey"];

        if (string.IsNullOrWhiteSpace(_apiKey))
        {
            _logger.LogWarning("LLM API key is not configured. Flight search query mapping will be disabled.");
        }

        _model = Environment.GetEnvironmentVariable("Llm__Model")
            ?? configuration["Llm:Model"]
            ?? DefaultModel;

        var timeoutFromConfig = Environment.GetEnvironmentVariable("Llm__RequestTimeoutSeconds")
            ?? configuration["Llm:RequestTimeoutSeconds"];

        if (!int.TryParse(timeoutFromConfig, out var requestTimeoutSeconds) || requestTimeoutSeconds <= 0)
        {
            requestTimeoutSeconds = DefaultRequestTimeoutSeconds;
        }

        _requestTimeout = TimeSpan.FromSeconds(requestTimeoutSeconds);
    }

    public async Task<FlightSearchFiltersDto> MapToFiltersAsync(string userQuery, Guid? userId, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(userQuery))
        {
            return await EmptyFiltersAndLogAsync(userQuery, userId, "Query is empty.", cancellationToken);
        }

        if (string.IsNullOrWhiteSpace(_apiKey))
        {
            return await EmptyFiltersAndLogAsync(userQuery, userId, "LLM API key is not configured.", cancellationToken);
        }

        try
        {
            var escapedModel = Uri.EscapeDataString(_model);
            var escapedKey = Uri.EscapeDataString(_apiKey);
            var baseAddress = _httpClient.BaseAddress ?? DefaultGeminiBaseUri;
            var uri = new Uri(baseAddress, $"models/{escapedModel}:generateContent?key={escapedKey}");
            var nowUtc = DateTimeOffset.UtcNow;

            using var requestMessage = new HttpRequestMessage(
                HttpMethod.Post,
                uri)
            {
                Content = JsonContent.Create(new GeminiGenerateContentRequest(
                    [
                        new GeminiContent(
                            [
                                new GeminiPart(
                                    "Extract structured flight search filters from user text. Return only JSON with keys: flightNumber, departure, destination, airline, maxPrice, departureDateAndTimeStart, departureDateAndTimeEnd. Use null for unknown values. Datetime values must be RFC3339 in UTC (ending with Z). If user gives only a vague part of day without specific date, return a reasonable time window for that part of tommorrow."),
                                new GeminiPart($"Current date and time (UTC): {nowUtc:O}\nUser query: {userQuery}")
                            ])
                    ],
                    new GeminiGenerationConfig(0, "application/json", new GeminiThinkingConfig("low"))),
                    options: JsonOptions)
            };

            using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            timeoutCts.CancelAfter(_requestTimeout);

            using var response = await _httpClient.SendAsync(requestMessage, timeoutCts.Token);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Flight search LLM returned non-success status code {StatusCode}.", response.StatusCode);
                return await EmptyFiltersAndLogAsync(userQuery, userId, $"LLM request failed with status code {(int)response.StatusCode}.", cancellationToken);
            }

            var payload = await response.Content.ReadFromJsonAsync<GeminiGenerateContentResponse>(JsonOptions, timeoutCts.Token);
            var content = payload?.Candidates?
                .FirstOrDefault()?
                .Content?
                .Parts?
                .Select(part => part.Text)
                .FirstOrDefault(text => !string.IsNullOrWhiteSpace(text));

            if (string.IsNullOrWhiteSpace(content))
            {
                return await EmptyFiltersAndLogAsync(userQuery, userId, "LLM returned empty content.", cancellationToken);
            }

            var jsonContent = UnwrapJsonEnvelope(content);
            var parsed = JsonSerializer.Deserialize<MappedFiltersRaw>(jsonContent, JsonOptions);

            if (parsed is null)
            {
                return await EmptyFiltersAndLogAsync(userQuery, userId, "LLM response could not be parsed.", cancellationToken);
            }

            var llmDepartureStart = ParseDateAndTime(parsed.DepartureDateAndTimeStart);
            var llmDepartureEnd = ParseDateAndTime(parsed.DepartureDateAndTimeEnd);

            var mappedFilters = new FlightSearchFiltersDto(
                Normalize(parsed.FlightNumber),
                Normalize(parsed.Departure),
                Normalize(parsed.Destination),
                Normalize(parsed.Airline),
                parsed.MaxPrice is > 0 ? parsed.MaxPrice : null,
                llmDepartureStart,
                llmDepartureEnd,
                true,
                null);

            await PersistExchangeAsync(userQuery, userId, jsonContent, cancellationToken);
            return mappedFilters;
        }
        catch (OperationCanceledException exception) when (!cancellationToken.IsCancellationRequested)
        {
            _logger.LogWarning(
                exception,
                "Flight search LLM request timed out after {TimeoutSeconds} seconds.",
                _requestTimeout.TotalSeconds);
            return await EmptyFiltersAndLogAsync(userQuery, userId, "LLM request timed out.", cancellationToken);
        }
        catch (Exception exception)
        {
            _logger.LogWarning(exception, "Failed to map flight search query with LLM.");
            return await EmptyFiltersAndLogAsync(userQuery, userId, "LLM mapping failed.", cancellationToken);
        }
    }

    private async Task<FlightSearchFiltersDto> EmptyFiltersAndLogAsync(string userQuery, Guid? userId, string note, CancellationToken cancellationToken)
    {
        await PersistExchangeAsync(userQuery, userId, note, cancellationToken);
        return EmptyFilters(note);
    }

    private async Task PersistExchangeAsync(string request, Guid? userId, string response, CancellationToken cancellationToken)
    {
        try
        {
            await _aiExchangeRepository.CreateAsync(
                new AIExchange
                {
                    Request = request,
                    Response = response,
                    UserId = userId,
                    FlightId = null
                },
                cancellationToken);
        }
        catch (Exception exception)
        {
            _logger.LogWarning(exception, "Failed to persist AI exchange log.");
        }
    }

    private static FlightSearchFiltersDto EmptyFilters(string note)
    {
        return new FlightSearchFiltersDto(
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            false,
            note);
    }

    private static string? Normalize(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }

    private static DateTimeOffset? ParseDateAndTime(string? rawDateAndTime)
    {
        var trimmed = Normalize(rawDateAndTime);
        if (trimmed is null)
        {
            return null;
        }

        if (DateTimeOffset.TryParse(trimmed, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var parsed))
        {
            return parsed;
        }

        return null;
    }

    private static string UnwrapJsonEnvelope(string value)
    {
        var trimmed = value.Trim();
        if (!trimmed.StartsWith("```") || !trimmed.EndsWith("```"))
        {
            return trimmed;
        }

        var firstNewLine = trimmed.IndexOf('\n');   
        if (firstNewLine < 0)
        {
            return trimmed;
        }

        var withoutHeader = trimmed[(firstNewLine + 1)..];
        var fenceIndex = withoutHeader.LastIndexOf("```");
        if (fenceIndex < 0)
        {
            return trimmed;
        }

        return withoutHeader[..fenceIndex].Trim();
    }

    private sealed record GeminiGenerateContentRequest(
        [property: JsonPropertyName("contents")] IReadOnlyList<GeminiContent> Contents,
        [property: JsonPropertyName("generationConfig")] GeminiGenerationConfig GenerationConfig);

    private sealed record GeminiGenerationConfig(
        [property: JsonPropertyName("temperature")] decimal Temperature,
        [property: JsonPropertyName("responseMimeType")] string ResponseMimeType,
        [property: JsonPropertyName("thinkingConfig")] GeminiThinkingConfig ThinkingConfig);

    private sealed record GeminiThinkingConfig(
        [property: JsonPropertyName("thinkingLevel")] string ThinkingLevel);

    private sealed record GeminiContent(
        [property: JsonPropertyName("parts")] IReadOnlyList<GeminiPart> Parts);

    private sealed record GeminiPart(
        [property: JsonPropertyName("text")] string Text);

    private sealed record GeminiGenerateContentResponse(
        [property: JsonPropertyName("candidates")] IReadOnlyList<GeminiCandidate>? Candidates);

    private sealed record GeminiCandidate(
        [property: JsonPropertyName("content")] GeminiContentResponse? Content);

    private sealed record GeminiContentResponse(
        [property: JsonPropertyName("parts")] IReadOnlyList<GeminiPart>? Parts);

    private sealed record MappedFiltersRaw(
        string? FlightNumber,
        string? Departure,
        string? Destination,
        string? Status,
        string? Airline,
        decimal? MaxPrice,
        string? DepartureDateAndTimeStart,
        string? DepartureDateAndTimeEnd);
}