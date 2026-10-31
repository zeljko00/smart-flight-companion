using SmartFlightCompanion.WebServices.Application.Services;

namespace SmartFlightCompanion.WebServices.Api.Middleware;

public sealed class RequestLoggingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RequestLoggingMiddleware> _logger;

    public RequestLoggingMiddleware(RequestDelegate next, ILogger<RequestLoggingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context, IRequestLogService requestLogService)
    {
        var requestLogId = await TryRecordRequest(context, requestLogService);
        var statusCode = StatusCodes.Status500InternalServerError;

        try
        {
            await _next(context);
            statusCode = context.Response.StatusCode;
        }
        finally
        {
            if (requestLogId is { } id)
            {
                await TryRecordResult(requestLogService, id, statusCode);
            }
        }
    }

    private async Task<Guid?> TryRecordRequest(HttpContext context, IRequestLogService requestLogService)
    {
        try
        {
            var ipAddress = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            return await requestLogService.RecordRequest(
                ipAddress,
                context.Request.Method,
                context.Request.Path.Value + context.Request.QueryString.Value,
                context.RequestAborted);
        }
        catch (Exception exception)
        {
            _logger.LogError(exception, "Failed to store incoming request.");
            return null;
        }
    }

    private async Task TryRecordResult(IRequestLogService requestLogService, Guid requestLogId, int statusCode)
    {
        try
        {
            // Not tied to RequestAborted so the result is stored even if the client disconnected.
            await requestLogService.RecordResult(requestLogId, statusCode);
        }
        catch (Exception exception)
        {
            _logger.LogError(exception, "Failed to store result of request {RequestLogId}.", requestLogId);
        }
    }
}
