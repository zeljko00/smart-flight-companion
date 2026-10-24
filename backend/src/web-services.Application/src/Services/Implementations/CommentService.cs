using SmartFlightCompanion.WebServices.Application.Dto;
using SmartFlightCompanion.WebServices.Infrastructure.Persistence.Abstractions;
using SmartFlightCompanion.WebServices.Infrastructure.Entities;
using System;
using System.Text;
using System.Security.Cryptography;

namespace SmartFlightCompanion.WebServices.Application.Services;

public sealed class CommentService : ICommentService
{
    private readonly ICommentRepository _commentRepository;
    private readonly IUserRepository _userRepository;
    private readonly IFlightRepository _flightRepository;

    public CommentService(ICommentRepository commentRepository, IUserRepository userRepository, IFlightRepository flightRepository)
    {
        _commentRepository = commentRepository;
        _userRepository = userRepository;
        _flightRepository = flightRepository;
    }

    public async Task<CommentDto?> Create(Guid authorId, Guid flightId, string content, CancellationToken cancellationToken = default)
    {
        User? author = await _userRepository.GetByIdAsync(authorId, cancellationToken);
        Flight? flight = await _flightRepository.GetByIdAsync(flightId, cancellationToken);

        if(author is null || flight is null)
        {
            return null;
        }

        Comment comment = new Comment
        {
            Author = author,
            Flight = flight,
            Content = content,
        };

        var result = await _commentRepository.CreateAsync(comment, cancellationToken);

        return CommentDto.FromEntity(result);
    }

    public async Task<bool> Delete(Guid id, CancellationToken cancellationToken = default)
    {
        return await _commentRepository.DeleteByIdAsync(id, cancellationToken) > 0;
    }

    public async Task<IReadOnlyList<CommentDto>> GetAllGroupedByFlight(CancellationToken cancellationToken = default)
    {
        return (await _commentRepository.GetAllGroupedByFlightAsync(cancellationToken))
            .Select(CommentDto.FromEntity)
            .ToList()
            .AsReadOnly();
    }
    public async Task<IReadOnlyList<CommentDto>> GetByFlightId(Guid flightId, CancellationToken cancellationToken = default)
    {
        return (await _commentRepository.GetByFlightIdAsync(flightId, cancellationToken))
            .Select(CommentDto.FromEntity)
            .ToList()
            .AsReadOnly();
    }
}
