using SmartFlightCompanion.WebServices.Application.Dto;
using SmartFlightCompanion.WebServices.Infrastructure.Entities;
using SmartFlightCompanion.WebServices.Infrastructure.Persistence.Abstractions;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace SmartFlightCompanion.WebServices.Application.Services;

public sealed class RequestLogService : IRequestLogService
{
    public const int MaxPdfRows = 10_000;

    private readonly IRequestLogRepository _requestLogRepository;

    public RequestLogService(IRequestLogRepository requestLogRepository)
    {
        _requestLogRepository = requestLogRepository;
    }

    public async Task<PagedResultDto<RequestLogDto>> GetPaged(
        int page,
        int pageSize,
        DateTimeOffset? from,
        DateTimeOffset? to,
        CancellationToken cancellationToken = default)
    {
        var result = await _requestLogRepository.GetPagedAsync(page, pageSize, from, to, cancellationToken);
        var hasNextPage = (long)page * pageSize < result.TotalCount;

        return new PagedResultDto<RequestLogDto>(
            result.Items.Select(RequestLogDto.FromEntity).ToList().AsReadOnly(),
            page,
            pageSize,
            result.TotalCount,
            hasNextPage);
    }

    public async Task<Guid> RecordRequest(string ipAddress, string method, string path, CancellationToken cancellationToken = default)
    {
        var requestLog = new RequestLog
        {
            IpAddress = Truncate(ipAddress, RequestLog.MaxIpAddressLength),
            HttpMethod = Truncate(method, RequestLog.MaxMethodLength),
            Path = Truncate(path, RequestLog.MaxPathLength),
        };

        var created = await _requestLogRepository.CreateAsync(requestLog, cancellationToken);
        return created.Id;
    }

    public async Task RecordResult(Guid requestLogId, int statusCode, CancellationToken cancellationToken = default)
    {
        await _requestLogRepository.SetStatusCodeAsync(requestLogId, statusCode, cancellationToken);
    }

    public async Task<byte[]> GetPdfByTimeWindow(DateTimeOffset? from, DateTimeOffset? to, CancellationToken cancellationToken = default)
    {
        var totalCount = await _requestLogRepository.CountByTimeWindowAsync(from, to, cancellationToken);
        var requestLogs = await _requestLogRepository.GetByTimeWindowAsync(from, to, MaxPdfRows, cancellationToken);

        return GenerateRequestLogPdf(requestLogs, totalCount, from, to);
    }

    private static string Truncate(string value, int maxLength)
    {
        return value.Length <= maxLength ? value : value[..maxLength];
    }

    private static byte[] GenerateRequestLogPdf(
        IReadOnlyList<RequestLog> requestLogs,
        int totalCount,
        DateTimeOffset? from,
        DateTimeOffset? to)
    {
        QuestPDF.Settings.License = LicenseType.Community;

        return Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Size(PageSizes.A4.Landscape());
                    page.Margin(24);
                    page.DefaultTextStyle(style => style.FontSize(9));

                    page.Header().Column(column =>
                    {
                        column.Item()
                            .Text("SmartFlightCompanion Request Log")
                            .FontSize(18)
                            .SemiBold()
                            .FontColor(Colors.Blue.Darken2);
                        var fromText = from.HasValue ? FormatTimestamp(from.Value) : "beginning";
                        var toText = to.HasValue ? FormatTimestamp(to.Value) : "now";
                        column.Item().Text($"Time span: {fromText} - {toText}");

                        var summary = $"Requests: {totalCount}";
                        if (totalCount > requestLogs.Count)
                        {
                            summary += $" (showing first {requestLogs.Count})";
                        }

                        column.Item().Text(summary);
                    });

                    page.Content().PaddingTop(12).Table(table =>
                    {
                        table.ColumnsDefinition(columns =>
                        {
                            columns.ConstantColumn(120);
                            columns.ConstantColumn(100);
                            columns.ConstantColumn(50);
                            columns.RelativeColumn();
                            columns.ConstantColumn(50);
                        });

                        table.Header(header =>
                        {
                            header.Cell().Element(HeaderCell).Text("Received At (UTC)");
                            header.Cell().Element(HeaderCell).Text("IP Address");
                            header.Cell().Element(HeaderCell).Text("Method");
                            header.Cell().Element(HeaderCell).Text("Path");
                            header.Cell().Element(HeaderCell).Text("Result");
                        });

                        foreach (var requestLog in requestLogs)
                        {
                            table.Cell().Element(BodyCell).Text(FormatTimestamp(requestLog.ReceivedAt));
                            table.Cell().Element(BodyCell).Text(requestLog.IpAddress);
                            table.Cell().Element(BodyCell).Text(requestLog.HttpMethod);
                            table.Cell().Element(BodyCell).Text(requestLog.Path);
                            table.Cell().Element(BodyCell).Text(requestLog.StatusCode?.ToString() ?? "-");
                        }
                    });

                    page.Footer().Row(row =>
                    {
                        row.RelativeItem().Text(text =>
                        {
                            text.Span("Generated on ");
                            text.Span(DateTimeOffset.UtcNow.ToString("yyyy-MM-dd HH:mm:ss 'UTC'"));
                        });

                        row.RelativeItem().AlignRight().Text(text =>
                        {
                            text.Span("Page ");
                            text.CurrentPageNumber();
                            text.Span(" / ");
                            text.TotalPages();
                        });
                    });
                });
            })
            .GeneratePdf();
    }

    private static string FormatTimestamp(DateTimeOffset value)
    {
        return value.ToUniversalTime().ToString("yyyy-MM-dd HH:mm:ss");
    }

    private static IContainer HeaderCell(IContainer container)
    {
        return container
            .Background(Colors.Grey.Lighten3)
            .BorderBottom(1)
            .BorderColor(Colors.Grey.Medium)
            .Padding(4)
            .DefaultTextStyle(style => style.SemiBold());
    }

    private static IContainer BodyCell(IContainer container)
    {
        return container
            .BorderBottom(1)
            .BorderColor(Colors.Grey.Lighten2)
            .Padding(4);
    }
}
