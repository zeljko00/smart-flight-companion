using SmartFlightCompanion.WebServices.Application.Dto;

namespace SmartFlightCompanion.WebServices.Application.Services;

public interface IRequestLogService
{
    Task<PagedResultDto<RequestLogDto>> GetPaged(int page, int pageSize, DateTimeOffset? from, DateTimeOffset? to, CancellationToken cancellationToken = default);

    Task<Guid> RecordRequest(string ipAddress, string method, string path, Guid? userId = null, CancellationToken cancellationToken = default);

    Task RecordResult(Guid requestLogId, int statusCode, Guid? userId = null, CancellationToken cancellationToken = default);

    Task<byte[]> GetPdfByTimeWindow(DateTimeOffset? from, DateTimeOffset? to, CancellationToken cancellationToken = default);
}
