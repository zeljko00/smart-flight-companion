namespace SmartFlightCompanion.WebServices.Infrastructure.Mail;

public sealed record EmailAttachment(
    string FileName,
    string ContentType,
    byte[] Content
);

public sealed record EmailQueueItem(
    string ToAddress,
    string Subject,
    string BodyTemplate,
    IReadOnlyDictionary<string, string> TemplateValues,
    IReadOnlyList<EmailAttachment>? Attachments = null
);
