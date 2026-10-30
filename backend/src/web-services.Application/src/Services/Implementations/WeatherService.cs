using System.Globalization;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Caching.Distributed;
using SmartFlightCompanion.WebServices.Application.Dto;

namespace SmartFlightCompanion.WebServices.Application.Services;

public sealed class WeatherService : IWeatherService
{
    private const int TargetCityCount = 3;
    private static readonly TimeSpan ForecastCacheDuration = TimeSpan.FromHours(1);
    private readonly HttpClient _httpClient;
    private readonly IDistributedCache _cache;

    public WeatherService(HttpClient httpClient, IDistributedCache cache)
    {
        _httpClient = httpClient;
        _cache = cache;
    }

    public async Task<IReadOnlyList<CityWeatherForecastDto>?> GetForecastByDestinationCoordinates(
        double destinationLatitude,
        double destinationLongitude,
        CancellationToken cancellationToken = default)
    {
        var context = await ResolveCountry(destinationLatitude, destinationLongitude, cancellationToken);
        if (context is null)
        {
            return null;
        }

        var cacheKey = $"weather:country:{context.CountryCode}:forecast";
        var cachedForecast = await GetCachedForecast(cacheKey, cancellationToken);
        if (cachedForecast is not null)
        {
            return cachedForecast;
        }

        var cityNames = await ResolveCitiesByCountry(context.CountryCode, cancellationToken);

        if (cityNames.Count == 0)
        {
            return null;
        }

        var cityCandidates = await ResolveCityCoordinates(cityNames.OrderBy(_ => Random.Shared.Next()).Take(5 * TargetCityCount).ToList(), context.CountryCode, cancellationToken);

        if (cityCandidates.Count < TargetCityCount)
        {
            return null;
        }

        var forecasts = new List<CityWeatherForecastDto>(TargetCityCount);
        foreach (var cityCandidate in cityCandidates)
        {
            var forecast = await ResolveForecast(cityCandidate.Latitude, cityCandidate.Longitude, cancellationToken);
            if (forecast.Count == 0)
            {
                continue;
            }

            forecasts.Add(new CityWeatherForecastDto(
                cityCandidate.Name,
                context.Country,
                forecast));

            if (forecasts.Count == TargetCityCount)
            {
                break;
            }
        }

        if (forecasts.Count == 0)
        {
            return null;
        }

        var result = forecasts.AsReadOnly();
        await SetCachedForecast(cacheKey, result, cancellationToken);
        return result;
    }

    private async Task<IReadOnlyList<CityWeatherForecastDto>?> GetCachedForecast(string cacheKey, CancellationToken cancellationToken)
    {
        try
        {
            var payload = await _cache.GetStringAsync(cacheKey, cancellationToken);
            if (string.IsNullOrWhiteSpace(payload))
            {
                return null;
            }

            var cachedForecast = JsonSerializer.Deserialize<List<CityWeatherForecastDto>>(payload);
            return cachedForecast is { Count: > 0 } ? cachedForecast.AsReadOnly() : null;
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private async Task SetCachedForecast(
        string cacheKey,
        IReadOnlyList<CityWeatherForecastDto> forecast,
        CancellationToken cancellationToken)
    {
        try
        {
            var payload = JsonSerializer.Serialize(forecast);
            var options = new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = ForecastCacheDuration
            };

            await _cache.SetStringAsync(cacheKey, payload, options, cancellationToken);
        }
        catch (JsonException)
        {
            // Ignore cache serialization errors to avoid affecting live weather responses.
        }
    }

    private async Task<CountryContext?> ResolveCountry(
        double latitude,
        double longitude,
        CancellationToken cancellationToken)
    {
        var reverseUrl = FormattableString.Invariant(
            $"https://api.bigdatacloud.net/data/reverse-geocode-client?latitude={latitude}&longitude={longitude}&localityLanguage=en");

        var response = await GetJsonOrDefault<BigDataCloudReverseResponse>(reverseUrl, cancellationToken);

        if (response is null ||
            string.IsNullOrWhiteSpace(response.CountryName) ||
            string.IsNullOrWhiteSpace(response.CountryCode))
        {
            return null;
        }
        var countryName = response.CountryName;
        if(response.CountryCode.Equals("US", StringComparison.OrdinalIgnoreCase))
        {
            countryName = "United States";
        }

        return new CountryContext(
            countryName,
            response.CountryCode.ToUpperInvariant());
    }


    private async Task<IReadOnlyList<string>> ResolveCitiesByCountry(string countryCode, CancellationToken cancellationToken)
    {
        // var postUrl = "https://countriesnow.space/api/v0.1/countries/cities";
        // var postResponse = await PostJsonOrDefault<CountriesNowCitiesRequest, CountriesNowCitiesResponse>(
        //     postUrl,
        //     new CountriesNowCitiesRequest(country),
        //     cancellationToken);

        // if (postResponse is { Error: false, Data.Count: > 0 })
        // {
        //     return postResponse.Data
        //         .Where(city => !string.IsNullOrWhiteSpace(city))
        //         .Distinct(StringComparer.OrdinalIgnoreCase)
        //         .ToList()
        //         .AsReadOnly();
        // }

        var encodedCountry = Uri.EscapeDataString(countryCode);
        var fallbackUrl = $"https://countriesnow.space/api/v0.1/countries/cities/q?iso2={encodedCountry}";
        var fallbackResponse = await GetJsonOrDefault<CountriesNowCitiesResponse>(fallbackUrl, cancellationToken);
        
        if (fallbackResponse is not { Error: false, Data.Count: > 0 })
        {
            return Array.Empty<string>();
        }

        return fallbackResponse.Data
            .Where(city => !string.IsNullOrWhiteSpace(city))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList().AsReadOnly();
    }

    private async Task<IReadOnlyList<GeocodedCity>> ResolveCityCoordinates(
        IReadOnlyList<string> cityNames,
        string countryCode,
        CancellationToken cancellationToken)
    {
        var geocoded = new Dictionary<string, GeocodedCity>(StringComparer.OrdinalIgnoreCase);

        foreach (var cityName in cityNames)
        {
            var encodedCityName = Uri.EscapeDataString(cityName);
            var geocodingUrl =
                $"https://geocoding-api.open-meteo.com/v1/search?name={encodedCityName}&count=10&language=en&format=json";

            var response = await GetJsonOrDefault<SearchGeocodingResponse>(geocodingUrl, cancellationToken);
            
            if (response?.Results is null)
            {
                continue;
            }

            var match = response.Results
                .Where(result => result is not null &&
                                 !string.IsNullOrWhiteSpace(result.Name) &&
                                 !string.IsNullOrWhiteSpace(result.Country) &&
                                 !string.IsNullOrWhiteSpace(result.CountryCode) &&
                                 string.Equals(result.CountryCode, countryCode, StringComparison.OrdinalIgnoreCase))
                .Select(result => new GeocodedCity(
                    result!.Name!,
                    result.Country!,
                    result.CountryCode!.ToUpperInvariant(),
                    result.Latitude,
                    result.Longitude,
                    result.FeatureCode,
                    result.Population))
                .FirstOrDefault();

            if (match is null)
            {
                continue;
            }

            if (!geocoded.ContainsKey(match.Name))
            {
                geocoded[match.Name] = match;
            }

            if(geocoded.Count == 20)
            {
                break;
            }
        }

        var randomCities = geocoded.Values.ToList();
        for (var i = randomCities.Count - 1; i > 0; i--)
        {
            var j = Random.Shared.Next(i + 1);
            (randomCities[i], randomCities[j]) = (randomCities[j], randomCities[i]);
        }

        return randomCities.Take(TargetCityCount).ToList();
    }

    private async Task<IReadOnlyList<WeatherForecastDayDto>> ResolveForecast(
        double latitude,
        double longitude,
        CancellationToken cancellationToken)
    {
        var lat = latitude.ToString(CultureInfo.InvariantCulture);
        var lng = longitude.ToString(CultureInfo.InvariantCulture);
        var forecastUrl =
            $"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lng}&daily=temperature_2m_max,temperature_2m_min,weathercode&forecast_days=3&timezone=auto";

        var response = await GetJsonOrDefault<ForecastResponse>(forecastUrl, cancellationToken);
        var days = response?.Daily;

        if (days is null || days.Time is null || days.Temperature2mMin is null || days.Temperature2mMax is null || days.WeatherCode is null)
        {
            return [];
        }

        var count = Math.Min(days.Time.Count, Math.Min(days.Temperature2mMin.Count, Math.Min(days.Temperature2mMax.Count, days.WeatherCode.Count)));
        var forecast = new List<WeatherForecastDayDto>(count);
        for (var i = 0; i < count; i++)
        {
            forecast.Add(new WeatherForecastDayDto(
                days.Time[i],
                days.Temperature2mMin[i],
                days.Temperature2mMax[i],
                days.WeatherCode[i]));
        }

        return forecast;
    }

    private async Task<T?> GetJsonOrDefault<T>(string url, CancellationToken cancellationToken)
    {
        try
        {
            using var response = await _httpClient.GetAsync(url, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                return default;
            }

            return await response.Content.ReadFromJsonAsync<T>(cancellationToken);
        }
        catch (HttpRequestException)
        {
            return default;
        }
        catch (TaskCanceledException)
        {
            return default;
        }
        catch (NotSupportedException)
        {
            return default;
        }
        catch (JsonException)
        {
            return default;
        }
    }

    private async Task<TResponse?> PostJsonOrDefault<TRequest, TResponse>(
        string url,
        TRequest body,
        CancellationToken cancellationToken)
    {
        try
        {
            using var response = await _httpClient.PostAsJsonAsync(url, body, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                return default;
            }

            return await response.Content.ReadFromJsonAsync<TResponse>(cancellationToken);
        }
        catch (HttpRequestException)
        {
            return default;
        }
        catch (TaskCanceledException)
        {
            return default;
        }
        catch (NotSupportedException)
        {
            return default;
        }
        catch (JsonException)
        {
            return default;
        }
    }

    private sealed record BigDataCloudReverseResponse(
        string? CountryName,
        string? CountryCode,
        string? City,
        string? PrincipalSubdivision,
        string? Locality);

    private sealed record CountryContext(
        string Country,
        string CountryCode);

    private sealed record CountriesNowCitiesRequest(string Country);

    private sealed record CountriesNowCitiesResponse(
        bool Error,
        string? Msg,
        List<string>? Data);

    private sealed record SearchGeocodingResponse(List<SearchGeocodingResult>? Results);

    private sealed record SearchGeocodingResult(
        string? Name,
        string? Country,
        [property: JsonPropertyName("country_code")] string? CountryCode,
        [property: JsonPropertyName("feature_code")] string? FeatureCode,
        [property: JsonPropertyName("population")] int? Population,
        double Latitude,
        double Longitude);

    private sealed record ForecastResponse(ForecastDaily? Daily);

    private sealed record ForecastDaily(
        List<string>? Time,
        [property: JsonPropertyName("temperature_2m_max")] List<double>? Temperature2mMax,
        [property: JsonPropertyName("temperature_2m_min")] List<double>? Temperature2mMin,
        [property: JsonPropertyName("weathercode")] List<int>? WeatherCode);

    private sealed record GeocodedCity(
        string Name,
        string Country,
        string CountryCode,
        double Latitude,
        double Longitude,
        string? FeatureCode,
        int? Population);
}