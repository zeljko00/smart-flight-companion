using System.Net;
using System.Net.Mail;
using System.Text;
using System.IO;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace SmartFlightCompanion.WebServices.Infrastructure.Mail;

public sealed class MailWorker : BackgroundService
{
    private readonly IEmailQueueReader _queueReader;
    private readonly ILogger<MailWorker> _logger;
    private readonly SmtpOptions _smtpOptions;

    public MailWorker(
        IEmailQueueReader queueReader,
        IOptions<SmtpOptions> smtpOptions,
        ILogger<MailWorker> logger)
    {
        _queueReader = queueReader;
        _logger = logger;
        _smtpOptions = smtpOptions.Value;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await foreach (var queuedEmail in _queueReader.ReadAllAsync(stoppingToken))
        {
            try
            {
                await SendAsync(queuedEmail, stoppingToken);
            }
            catch (Exception exception)
            {
                _logger.LogError(
                    exception,
                    "Failed to send email to {EmailAddress} with subject {Subject}.",
                    queuedEmail.ToAddress,
                    queuedEmail.Subject);
            }
        }
    }

    private async Task SendAsync(EmailQueueItem queuedEmail, CancellationToken cancellationToken)
    {
        if (!_smtpOptions.Enabled)
        {
            _logger.LogInformation(
                "SMTP is disabled. Skipping email to {EmailAddress}.",
                queuedEmail.ToAddress);
            return;
        }

        if (string.IsNullOrWhiteSpace(_smtpOptions.Host) || string.IsNullOrWhiteSpace(_smtpOptions.FromAddress))
        {
            _logger.LogWarning(
                "SMTP is enabled but Host/FromAddress are not configured. Email to {EmailAddress} skipped.",
                queuedEmail.ToAddress);
            return;
        }

        if (string.IsNullOrWhiteSpace(_smtpOptions.Username) || string.IsNullOrWhiteSpace(_smtpOptions.Password))
        {
            _logger.LogWarning(
                "SMTP is enabled but credentials are missing. Configure Smtp__Username and Smtp__Password environment variables. Email to {EmailAddress} skipped.",
                queuedEmail.ToAddress);
            return;
        }

        using var message = new MailMessage
        {
            From = new MailAddress(_smtpOptions.FromAddress, _smtpOptions.FromName),
            Subject = queuedEmail.Subject,
            Body = RenderTemplate(queuedEmail.BodyTemplate, queuedEmail.TemplateValues),
            BodyEncoding = Encoding.UTF8,
            SubjectEncoding = Encoding.UTF8,
            IsBodyHtml = false
        };
        message.To.Add(queuedEmail.ToAddress);

        if (queuedEmail.Attachments is not null)
        {
            foreach (var queuedAttachment in queuedEmail.Attachments)
            {
                var attachmentStream = new MemoryStream(queuedAttachment.Content, writable: false);
                var attachment = new Attachment(attachmentStream, queuedAttachment.FileName, queuedAttachment.ContentType);
                message.Attachments.Add(attachment);
            }
        }

        using var client = new SmtpClient(_smtpOptions.Host, _smtpOptions.Port)
        {
            EnableSsl = _smtpOptions.UseSsl,
            DeliveryMethod = SmtpDeliveryMethod.Network,
            UseDefaultCredentials = false,
            Credentials = new NetworkCredential(_smtpOptions.Username, _smtpOptions.Password)
        };

        await client.SendMailAsync(message, cancellationToken);

        _logger.LogInformation(
            "Email sent to {EmailAddress} with subject {Subject}.",
            queuedEmail.ToAddress,
            queuedEmail.Subject);
    }

    private static string RenderTemplate(string template, IReadOnlyDictionary<string, string> values)
    {
        var output = template;

        foreach (var (key, value) in values)
        {
            output = output.Replace($"{{{{{key}}}}}", value, StringComparison.Ordinal);
        }

        return output;
    }
}
