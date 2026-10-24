using SmartFlightCompanion.WebServices.Application.Dto;

namespace SmartFlightCompanion.WebServices.Application.Services;

public interface ICommentService
{
    Task<CommentDto?> Create(Guid authorId,Guid flightId, string content, CancellationToken cancellationToken = default);
    Task<bool> Delete(Guid id, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<CommentDto>> GetAllGroupedByFlight(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<CommentDto>> GetByFlightId(Guid flightId, CancellationToken cancellationToken = default);
}