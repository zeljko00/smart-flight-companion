namespace SmartFlightCompanion.WebServices.Infrastructure.Mail;

public interface IEmailQueue
{
    ValueTask EnqueueAsync(EmailQueueItem item, CancellationToken cancellationToken = default);
}
