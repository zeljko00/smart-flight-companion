using SmartFlightCompanion.WebServices.Application.Dto;

namespace SmartFlightCompanion.WebServices.Application.Services;

public interface IAIExchangeService
{
    Task<PagedResultDto<AIExchangeDto>> GetPaged(int page, int pageSize, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<AIExchangeDto>> GetByFlightAndUserId(Guid flightId, Guid userId, CancellationToken cancellationToken = default);
}