using SmartFlightCompanion.WebServices.Application.Dto;

namespace SmartFlightCompanion.WebServices.Application.Services;

public interface IWeatherService
{
    Task<IReadOnlyList<CityWeatherForecastDto>?> GetForecastByDestinationCoordinates(
        double destinationLatitude,
        double destinationLongitude,
        CancellationToken cancellationToken = default);
}