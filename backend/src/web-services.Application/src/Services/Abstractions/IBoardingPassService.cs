using SmartFlightCompanion.WebServices.Application.Dto;
using SmartFlightCompanion.WebServices.Infrastructure.Entities;

namespace SmartFlightCompanion.WebServices.Application.Services;

public interface IBoardingPassService
{
    Task<BoardingPassDto?> Create(Guid flightId, Guid ownerId, Seat seat, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<BoardingPassDto>> GetByOwnerId(Guid ownerId, CancellationToken cancellationToken = default);
    Task<int> GetCountByFlightId(Guid flightId, CancellationToken cancellationToken = default);
}