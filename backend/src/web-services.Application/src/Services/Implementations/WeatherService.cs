using System.Globalization;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using SmartFlightCompanion.WebServices.Application.Dto;

namespace SmartFlightCompanion.WebServices.Application.Services;

public sealed class WeatherService : IWeatherService
{
    private const int RequiredCityCount = 3;
    private const int DesiredCandidateCount = 12;
    private const int CityPopulationThreshold = 50_000;

    private readonly HttpClient _httpClient;

    public WeatherService(HttpClient httpClient)
    {
        _httpClient = httpClient;
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

        var cityCandidates = await ResolveCities(context, cancellationToken);
        if (cityCandidates.Count < RequiredCityCount)
        {
            return null;
        }

        var cities = new List<CityWeatherForecastDto>(RequiredCityCount);
        foreach (var cityCandidate in cityCandidates)
        {
            var forecast = await ResolveForecast(cityCandidate.Latitude, cityCandidate.Longitude, cancellationToken);
            if (forecast.Count == 0)
            {
                continue;
            }

            cities.Add(new CityWeatherForecastDto(
                cityCandidate.Name,
                cityCandidate.Country,
                cityCandidate.CountryCode,
                forecast));

            if (cities.Count == RequiredCityCount)
            {
                break;
            }
        }

        if (cities.Count < RequiredCityCount)
        {
            return null;
        }

        return cities.AsReadOnly();
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

        return new CountryContext(
            response.CountryName,
            response.CountryCode.ToUpperInvariant(),
            response.City,
            response.PrincipalSubdivision,
            response.Locality);
    }

    private async Task<IReadOnlyList<GeocodedCity>> ResolveCities(
        CountryContext context,
        CancellationToken cancellationToken)
    {
        var countryCodeCities = await ResolveCitiesByCountryCode(context, cancellationToken);
        if (countryCodeCities.Count >= RequiredCityCount)
        {
            return countryCodeCities;
        }

        var seedQueries = BuildCitySeedQueries(context);
        var candidates = new List<GeocodedCity>(DesiredCandidateCount * 2);

        candidates.AddRange(countryCodeCities);

        foreach (var seed in seedQueries)
        {
            var seedParam = Uri.EscapeDataString(seed);
            var searchUrl = $"https://geocoding-api.open-meteo.com/v1/search?name={seedParam}&count=100&language=en&format=json";

            var response = await GetJsonOrDefault<SearchGeocodingResponse>(searchUrl, cancellationToken);
            var cities = response?.Results ?? [];

            var filtered = cities
                .Where(city =>
                    !string.IsNullOrWhiteSpace(city.Name) &&
                    IsAcceptableCityName(city.Name!) &&
                    !string.IsNullOrWhiteSpace(city.Country) &&
                    !string.IsNullOrWhiteSpace(city.CountryCode) &&
                    string.Equals(city.CountryCode, context.CountryCode, StringComparison.OrdinalIgnoreCase) &&
                    !string.IsNullOrWhiteSpace(city.FeatureCode) &&
                    city.FeatureCode.StartsWith("PPL", StringComparison.OrdinalIgnoreCase))
                .OrderByDescending(city => city.Population ?? 0)
                .ThenBy(city => city.Name, StringComparer.OrdinalIgnoreCase)
                .Select(city => new GeocodedCity(
                    city.Name!,
                    city.Country!,
                    city.CountryCode!,
                    city.Latitude,
                    city.Longitude,
                    city.FeatureCode,
                    city.Population));

            foreach (var city in filtered)
            {
                AddCandidate(candidates, city);
            }
        }

        var cityPriority = candidates
            .Where(IsLikelyCity)
            .OrderByDescending(city => GetFeatureScore(city.FeatureCode))
            .ThenByDescending(city => city.Population ?? 0)
            .ThenBy(city => city.Name, StringComparer.OrdinalIgnoreCase)
            .Take(DesiredCandidateCount)
            .ToList();

        if (cityPriority.Count >= RequiredCityCount)
        {
            return cityPriority;
        }

        return candidates
            .OrderByDescending(city => GetFeatureScore(city.FeatureCode))
            .ThenByDescending(city => city.Population ?? 0)
            .ThenBy(city => city.Name, StringComparer.OrdinalIgnoreCase)
            .Take(DesiredCandidateCount)
            .ToList();
    }

    private async Task<IReadOnlyList<GeocodedCity>> ResolveCitiesByCountryCode(
        CountryContext context,
        CancellationToken cancellationToken)
    {
        var url = FormattableString.Invariant(
            $"http://geodb-free-service.wirefreethought.com/v1/geo/cities?countryIds={context.CountryCode}&minPopulation={CityPopulationThreshold}&limit=30&sort=-population");

        var response = await GetJsonOrDefault<GeoDbCitiesResponse>(url, cancellationToken);
        var data = response?.Data ?? [];

        var candidates = new List<GeocodedCity>(DesiredCandidateCount);
        foreach (var row in data)
        {
            if (!string.Equals(row.CountryCode, context.CountryCode, StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            if (string.IsNullOrWhiteSpace(row.City) || !IsAcceptableCityName(row.City))
            {
                continue;
            }

            // Skip administrative and non-city place types.
            if (!string.Equals(row.Type, "CITY", StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            var candidate = new GeocodedCity(
                row.City,
                row.Country ?? context.Country,
                row.CountryCode,
                row.Latitude,
                row.Longitude,
                "PPLA",
                row.Population);

            AddCandidate(candidates, candidate);
            if (candidates.Count >= DesiredCandidateCount)
            {
                break;
            }
        }

        return candidates;
    }

    private static bool IsLikelyCity(GeocodedCity city)
    {
        if (!IsAcceptableCityName(city.Name))
        {
            return false;
        }

        if (string.IsNullOrWhiteSpace(city.FeatureCode))
        {
            return false;
        }

        if (!city.FeatureCode.StartsWith("PPL", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        if (GetFeatureScore(city.FeatureCode) >= 3)
        {
            return true;
        }

        return (city.Population ?? 0) >= CityPopulationThreshold;
    }

    private static int GetFeatureScore(string? featureCode)
    {
        return featureCode?.ToUpperInvariant() switch
        {
            "PPLC" => 5,
            "PPLA" => 4,
            "PPLA2" => 3,
            "PPLA3" => 2,
            "PPLA4" => 1,
            "PPL" => 0,
            _ => -1,
        };
    }

    private static IReadOnlyList<string> BuildCitySeedQueries(CountryContext context)
    {
        var seeds = new List<string>(8);
        AddSeed(seeds, context.City);
        AddSeed(seeds, context.PrincipalSubdivision);
        AddSeed(seeds, context.Locality);
        AddSeed(seeds, NormalizeCountryName(context.Country));
        return seeds;
    }

    private static bool IsAcceptableCityName(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return false;
        }

        var name = value.Trim();
        var blockedTokens = new[]
        {
            "municipality",
            "district",
            "province",
            "region",
            "settlement",
            "republic",
            "country",
            "national",
        };

        return !blockedTokens.Any(token => name.Contains(token, StringComparison.OrdinalIgnoreCase));
    }

    private static void AddCandidate(List<GeocodedCity> candidates, GeocodedCity city)
    {
        if (candidates.Any(existing =>
                string.Equals(existing.Name, city.Name, StringComparison.OrdinalIgnoreCase) &&
                string.Equals(existing.CountryCode, city.CountryCode, StringComparison.OrdinalIgnoreCase)))
        {
            return;
        }

        candidates.Add(city);
    }

    private static void AddSeed(List<string> seeds, string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return;
        }

        if (seeds.Any(seed => string.Equals(seed, value, StringComparison.OrdinalIgnoreCase)))
        {
            return;
        }

        seeds.Add(value);
    }

    private static string NormalizeCountryName(string country)
    {
        return country.Trim() switch
        {
            "Turkiye" => "Turkey",
            "Türkiye" => "Turkey",
            _ => country,
        };
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

    private sealed record BigDataCloudReverseResponse(
        string? CountryName,
        string? CountryCode,
        string? City,
        string? PrincipalSubdivision,
        string? Locality);

    private sealed record CountryContext(
        string Country,
        string CountryCode,
        string? City,
        string? PrincipalSubdivision,
        string? Locality);

    private sealed record SearchGeocodingResponse(List<SearchGeocodingResult>? Results);

    private sealed record GeoDbCitiesResponse(List<GeoDbCity>? Data);

    private sealed record GeoDbCity(
        string? Type,
        string City,
        string? Country,
        string CountryCode,
        double Latitude,
        double Longitude,
        int? Population);

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