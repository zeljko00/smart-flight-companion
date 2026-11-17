using System.Globalization;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;

namespace SmartFlightCompanion.WebServices.Application.Services;

/// <summary>
/// Reverse geocoding through OpenStreetMap Nominatim.
/// The usage policy requires an identifying User-Agent (configured in Program.cs) and at most one request per second.
/// </summary>
public sealed class NominatimGeocodingService : IGeocodingService
{
    private const int MaxAddressLength = 255;

    private readonly HttpClient _httpClient;
    private readonly ILogger<NominatimGeocodingService> _logger;

    public NominatimGeocodingService(HttpClient httpClient, ILogger<NominatimGeocodingService> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    public async Task<string?> ReverseGeocode(double latitude, double longitude, CancellationToken cancellationToken = default)
    {
        var lat = latitude.ToString("F6", CultureInfo.InvariantCulture);
        var lon = longitude.ToString("F6", CultureInfo.InvariantCulture);
        var url = $"reverse?format=jsonv2&zoom=18&accept-language=en&lat={lat}&lon={lon}";

        try
        {
            using var response = await _httpClient.GetAsync(url, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                return null;
            }

            var result = await response.Content.ReadFromJsonAsync<NominatimReverseResponse>(cancellationToken);
            var address = result?.DisplayName?.Trim();

            // Nominatim answers 200 with an "error" field when there is nothing at the location (e.g. open sea).
            if (string.IsNullOrEmpty(address) || !string.IsNullOrEmpty(result?.Error))
            {
                return null;
            }

            return address.Length > MaxAddressLength ? address[..MaxAddressLength] : address;
        }
        catch (HttpRequestException exception)
        {
            _logger.LogWarning(exception, "Reverse geocoding HTTP request failed for latitude {Latitude} and longitude {Longitude}.", latitude, longitude);
            return null;
        }
        catch (TaskCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            // HttpClient timeout, not a caller cancellation.
            _logger.LogWarning("Reverse geocoding request timed out for latitude {Latitude} and longitude {Longitude}.", latitude, longitude);
            return null;
        }
        catch (NotSupportedException exception)
        {
            _logger.LogWarning(exception, "Reverse geocoding response content type is not supported.");
            return null;
        }
        catch (JsonException exception)
        {
            _logger.LogWarning(exception, "Reverse geocoding response JSON could not be parsed.");
            return null;
        }
    }

    private sealed class NominatimReverseResponse
    {
        [JsonPropertyName("display_name")]
        public string? DisplayName { get; init; }

        [JsonPropertyName("error")]
        public string? Error { get; init; }
    }
}
