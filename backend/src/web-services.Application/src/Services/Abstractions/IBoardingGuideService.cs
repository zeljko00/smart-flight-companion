using SmartFlightCompanion.WebServices.Application.Dto;
using SmartFlightCompanion.WebServices.Infrastructure.Entities;

namespace SmartFlightCompanion.WebServices.Application.Services;

public interface IBoardingGuideService
{
    Task<IReadOnlyList<BoardingGuideDto>> GetByFlightIdAsync(Guid flightId, bool includeInactive = false, CancellationToken cancellationToken = default);
    Task<BoardingGuideDto?> CreateAsync(BoardingGuideDto boardingGuideDto, CancellationToken cancellationToken = default);
    Task<string?> UploadMediaUrlAsync(Guid id, MediaType type, string? url, string? extension, CancellationToken cancellationToken = default);
}