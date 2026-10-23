namespace SmartFlightCompanion.WebServices.Infrastructure.Mail;

public interface IEmailQueueReader
{
    IAsyncEnumerable<EmailQueueItem> ReadAllAsync(CancellationToken cancellationToken = default);
}
