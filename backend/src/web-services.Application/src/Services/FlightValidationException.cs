namespace SmartFlightCompanion.WebServices.Application.Services;

public sealed class FlightValidationException : Exception
{
    public FlightValidationException(string message)
        : base(message)
    {
    }
}
