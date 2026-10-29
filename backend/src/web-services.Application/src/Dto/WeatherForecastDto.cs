namespace SmartFlightCompanion.WebServices.Application.Dto;

public sealed record WeatherForecastDayDto(
    string Date,
    double MinTemperatureCelsius,
    double MaxTemperatureCelsius,
    int WeatherCode);

public sealed record CityWeatherForecastDto(
    string City,
    string Country,
    IReadOnlyList<WeatherForecastDayDto> Forecast);