namespace SmartFlightCompanion.WebServices.Infrastructure.Mail;

public sealed record EmailQueueItem(
    string ToAddress,
    string Subject,
    string BodyTemplate,
    IReadOnlyDictionary<string, string> TemplateValues
);
