using System.Globalization;
using System.Net.Http.Json;
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
    private const string FiltersPrompt = "Extract structured flight search filters from user text. Return only JSON with keys: flightNumber, departure, destination, airline, maxPrice, departureDateAndTimeStart, departureDateAndTimeEnd. Use null for unknown values. Datetime values must be RFC3339 in UTC (ending with Z). If user gives only a vague part of day without specific date, return a reasonable time window for that part of tomorrow.";
    private const string AdvicePrompt = "You are a flight operations and passenger assistant. Provide concise, actionable advice for the given flight and user question. Focus on timing, terminal/gate readiness, potential risks (delays, boarding windows), and practical next steps (return TODO list if it makes sense). If flight context is missing, say that flight details were unavailable and provide best-effort generic advice. Keep response plain text.";
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
    private readonly IFlightRepository _flightRepository;
    private readonly string? _apiKey;
    private readonly string _model;
    private readonly TimeSpan _requestTimeout;

    public AIService(
        HttpClient httpClient,
        IConfiguration configuration,
        IAIExchangeRepository aiExchangeRepository,
        IFlightRepository flightRepository,
        ILogger<AIService> logger)
    {
        _httpClient = httpClient;
        _aiExchangeRepository = aiExchangeRepository;
        _flightRepository = flightRepository;
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

        var llmResponse = await RequestLlmTextResponseAsync(
            FiltersPrompt,
            userQuery,
            "flight search mapping",
            cancellationToken);

        if (!llmResponse.Success)
        {
            return await EmptyFiltersAndLogAsync(userQuery, userId, llmResponse.Note, cancellationToken);
        }

        var jsonContent = UnwrapJsonEnvelope(llmResponse.Content);
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

        await PersistExchangeAsync(userQuery, userId, jsonContent, null, cancellationToken);
        return mappedFilters;
    }

    public async Task<string> GetAdviceAsync(string userQuery, Guid? userId, Guid flightId, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(userQuery))
        {
            await PersistExchangeAsync(userQuery, userId, "Query is empty.", flightId, cancellationToken);
            return "";
        }

        if (string.IsNullOrWhiteSpace(_apiKey))
        {
            await PersistExchangeAsync(userQuery, userId, "LLM API key is not configured.", flightId, cancellationToken);
            return "";
        }

        var flight = await _flightRepository.GetByIdAsync(flightId, cancellationToken);
        if (flight is null)
        {
            _logger.LogWarning("Flight advice requested for unknown flight {FlightId}.", flightId);
            await PersistExchangeAsync(userQuery, userId, "Flight not found.", flightId, cancellationToken);
            return "";
        }

        var adviceInput = BuildAdviceInput(userQuery, flightId, flight);
        var llmResponse = await RequestLlmTextResponseAsync(
            AdvicePrompt,
            adviceInput,
            "flight advice",
            cancellationToken);

        if (!llmResponse.Success)
        {
            await PersistExchangeAsync(userQuery, userId, llmResponse.Note, flightId, cancellationToken);
            return llmResponse.Note;
        }

        var advice = UnwrapJsonEnvelope(llmResponse.Content);
        await PersistExchangeAsync(userQuery, userId, advice, flightId, cancellationToken);
        return advice;
    }

    private async Task<LlmResponse> RequestLlmTextResponseAsync(
        string systemPrompt,
        string userInput,
        string operation,
        CancellationToken cancellationToken)
    {
        try
        {
            var escapedModel = Uri.EscapeDataString(_model);
            var escapedKey = Uri.EscapeDataString(_apiKey ?? string.Empty);
            var baseAddress = _httpClient.BaseAddress ?? DefaultGeminiBaseUri;
            var uri = new Uri(baseAddress, $"models/{escapedModel}:generateContent?key={escapedKey}");
            var nowUtc = DateTimeOffset.UtcNow;

            using var requestMessage = new HttpRequestMessage(HttpMethod.Post, uri)
            {
                Content = JsonContent.Create(
                    new GeminiGenerateContentRequest(
                        [
                            new GeminiContent(
                                [
                                    new GeminiPart(systemPrompt),
                                    new GeminiPart($"Current date and time (UTC): {nowUtc:O}\\nUser input: {userInput}")
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
                _logger.LogWarning("LLM returned non-success status code {StatusCode} while processing {Operation}.", response.StatusCode, operation);
                return LlmResponse.Fail($"LLM request failed with status code {(int)response.StatusCode}.");
            }

            var payload = await response.Content.ReadFromJsonAsync<GeminiGenerateContentResponse>(JsonOptions, timeoutCts.Token);
            var content = payload?.Candidates?
                .FirstOrDefault()?
                .Content?
                .Parts?
                .Select(part => part.Text)
                .FirstOrDefault(text => !string.IsNullOrWhiteSpace(text));

            return string.IsNullOrWhiteSpace(content)
                ? LlmResponse.Fail("LLM returned empty content.")
                : LlmResponse.Ok(content);
        }
        catch (OperationCanceledException exception) when (!cancellationToken.IsCancellationRequested)
        {
            _logger.LogWarning(
                exception,
                "LLM request for {Operation} timed out after {TimeoutSeconds} seconds.",
                operation,
                _requestTimeout.TotalSeconds);
            return LlmResponse.Fail("LLM request timed out.");
        }
        catch (Exception exception)
        {
            _logger.LogWarning(exception, "Failed to complete LLM request for {Operation}.", operation);
            return LlmResponse.Fail("LLM request failed.");
        }
    }

    private static string BuildAdviceInput(string userQuery, Guid? flightId, Flight? flight)
    {
        if (flight is null)
        {
            return $"User question: {userQuery}\\nFlightId: {(flightId.HasValue ? flightId.Value.ToString() : "not provided")}\\nFlight details: unavailable";
        }

        return string.Join(
            "\\n",
            [
                $"User question: {userQuery}",
                $"FlightId: {flight.Id}",
                $"Flight number: {flight.FlightNumber}",
                $"Status: {flight.Status}",
                $"Airline: {flight.Airline}",
                $"Route: {flight.DepartureAirport.IATA} ({flight.DepartureAirport.City}) -> {flight.ArrivalAirport.IATA} ({flight.ArrivalAirport.City})",
                $"Terminal/Gate: T{flight.Terminal} / {flight.Gate}",
                $"Scheduled departure (UTC): {flight.ScheduledDepartureTime:O}",
                $"Scheduled arrival (UTC): {flight.ScheduledArrivalTime:O}",
                $"Current departure estimate (UTC): {flight.DepartureTime:O}",
                $"Current arrival estimate (UTC): {flight.ArrivalTime:O}"
            ]);
    }

    private async Task<FlightSearchFiltersDto> EmptyFiltersAndLogAsync(string userQuery, Guid? userId, string note, CancellationToken cancellationToken)
    {
        await PersistExchangeAsync(userQuery, userId, note, null, cancellationToken);
        return EmptyFilters(note);
    }

    private async Task PersistExchangeAsync(string request, Guid? userId, string response, Guid? flightId, CancellationToken cancellationToken)
    {
        try
        {
            await _aiExchangeRepository.CreateAsync(
                new AIExchange
                {
                    Request = request,
                    Response = response,
                    UserId = userId,
                    FlightId = flightId
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

    private sealed record LlmResponse(bool Success, string Content, string Note)
    {
        public static LlmResponse Ok(string content) => new(true, content, string.Empty);
        public static LlmResponse Fail(string note) => new(false, string.Empty, note);
    }
}