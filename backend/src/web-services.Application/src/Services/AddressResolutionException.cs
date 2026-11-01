namespace SmartFlightCompanion.WebServices.Application.Services;

public sealed class AddressResolutionException : Exception
{
    public AddressResolutionException(string message)
        : base(message)
    {
    }
}
