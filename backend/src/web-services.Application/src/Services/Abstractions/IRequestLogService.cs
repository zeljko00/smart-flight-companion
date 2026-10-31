using SmartFlightCompanion.WebServices.Application.Dto;

namespace SmartFlightCompanion.WebServices.Application.Services;

public interface IRequestLogService
{
    Task<PagedResultDto<RequestLogDto>> GetPaged(int page, int pageSize, DateTimeOffset? from, DateTimeOffset? to, CancellationToken cancellationToken = default);

    Task<Guid> RecordRequest(string ipAddress, string method, string path, CancellationToken cancellationToken = default);

    Task RecordResult(Guid requestLogId, int statusCode, CancellationToken cancellationToken = default);

    Task<byte[]> GetPdfByTimeWindow(DateTimeOffset? from, DateTimeOffset? to, CancellationToken cancellationToken = default);
}
