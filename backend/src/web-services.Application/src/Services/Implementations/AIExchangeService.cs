using SmartFlightCompanion.WebServices.Application.Dto;
using SmartFlightCompanion.WebServices.Infrastructure.Persistence.Abstractions;

namespace SmartFlightCompanion.WebServices.Application.Services;

public sealed class AIExchangeService : IAIExchangeService
{
    private readonly IAIExchangeRepository _aiExchangeRepository;

    public AIExchangeService(IAIExchangeRepository aiExchangeRepository)
    {
        _aiExchangeRepository = aiExchangeRepository;
    }

    public async Task<PagedResultDto<AIExchangeDto>> GetPaged(int page, int pageSize, CancellationToken cancellationToken = default)
    {
        var result = await _aiExchangeRepository.GetPagedAsync(page, pageSize, cancellationToken);
        var hasNextPage = (long)page * pageSize < result.TotalCount;

        return new PagedResultDto<AIExchangeDto>(
            result.Items.Select(AIExchangeDto.FromEntity).ToList().AsReadOnly(),
            page,
            pageSize,
            result.TotalCount,
            hasNextPage);
    }

    public async Task<IReadOnlyList<AIExchangeDto>> GetByFlightAndUserId(
        Guid flightId,
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var entities = await _aiExchangeRepository.GetByFlightIdAsync(flightId, userId, cancellationToken);
        return entities
            .Select(AIExchangeDto.FromEntity)
            .ToList()
            .AsReadOnly();
    }
}