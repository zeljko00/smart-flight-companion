namespace SmartFlightCompanion.WebServices.Application.Services;

public interface IGeocodingService
{
    /// <summary>
    /// Converts coordinates to a human-readable address.
    /// Returns <c>null</c> when no address can be determined (nothing at the location or the provider is unavailable).
    /// </summary>
    Task<string?> ReverseGeocode(double latitude, double longitude, CancellationToken cancellationToken = default);
}
