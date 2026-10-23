using System.Threading.Channels;

namespace SmartFlightCompanion.WebServices.Infrastructure.Mail;

public sealed class InMemoryEmailQueue : IEmailQueue, IEmailQueueReader
{
    private readonly Channel<EmailQueueItem> _channel = Channel.CreateUnbounded<EmailQueueItem>(
        new UnboundedChannelOptions
        {
            SingleReader = true,
            SingleWriter = false
        });

    public ValueTask EnqueueAsync(EmailQueueItem item, CancellationToken cancellationToken = default)
    {
        return _channel.Writer.WriteAsync(item, cancellationToken);
    }

    public IAsyncEnumerable<EmailQueueItem> ReadAllAsync(CancellationToken cancellationToken = default)
    {
        return _channel.Reader.ReadAllAsync(cancellationToken);
    }
}
