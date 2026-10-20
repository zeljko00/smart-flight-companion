namespace SmartFlightCompanion.WebServices.Infrastructure.Persistence;

public sealed class DuplicateResourceException : Exception
{
    public DuplicateResourceException(string message, Exception? innerException = null)
        : base(message, innerException)
    {
    }
}