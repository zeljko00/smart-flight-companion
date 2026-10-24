using SmartFlightCompanion.WebServices.Application.Dto;
using SmartFlightCompanion.WebServices.Infrastructure.Persistence.Abstractions;
using SmartFlightCompanion.WebServices.Infrastructure.Entities;
using System;
using System.Text;
using System.Security.Cryptography;

namespace SmartFlightCompanion.WebServices.Application.Services;

public sealed class BoardingPassService : IBoardingPassService
{
    private readonly IBoardingPassRepository _BoardingPassRepository;
    private readonly IUserRepository _userRepository;
    private readonly IFlightRepository _flightRepository;

    public BoardingPassService(IBoardingPassRepository BoardingPassRepository, IUserRepository userRepository, IFlightRepository flightRepository)
    {
        _BoardingPassRepository = BoardingPassRepository;
        _userRepository = userRepository;
        _flightRepository = flightRepository;
    }

    public async Task<BoardingPassDto?> Create(Guid flightId, Guid ownerId, Seat seat, CancellationToken cancellationToken = default)
    {
        var flight = await _flightRepository.GetByIdAsync(flightId, cancellationToken);
        var user = await _userRepository.GetByIdAsync(ownerId, cancellationToken);
        if (flight is null || user is null)
        {
            return null;
        }

        int seatsTaken = await _BoardingPassRepository.GetCountByFlightIdAsync(flightId, cancellationToken);
        if (seatsTaken >= flight.SeatCapacity)
        {
            return null;
        }

        decimal? price = flight.FirstClassPrice;

        if(seat == Seat.Economy)
        {
            price = flight.EconomyPrice;
        }
        else if(seat == Seat.PremiumEconomy)
        {
            price = flight.PremiumEconomyPrice;
        }
        else if(seat == Seat.Business)
        {
            price = flight.BusinessPrice;
        }

        if(price is null)
        {
            return null;
        }

        var boardingPass = new BoardingPass
        {
            User = user,
            Flight = flight,
            Seat = seat,
            Price = price ?? 0,
            IsValid = true
        };

        var result = await _BoardingPassRepository.CreateAsync(boardingPass, cancellationToken);

        return BoardingPassDto.FromEntity(result);
    }
    public async Task<IReadOnlyList<BoardingPassDto>> GetByOwnerId(Guid ownerId, CancellationToken cancellationToken = default)
    {
        var boardingPasses = await _BoardingPassRepository.GetByOwnerIdAsync(ownerId, cancellationToken);

        return boardingPasses
            .Select(BoardingPassDto.FromEntity)
            .ToList()
            .AsReadOnly();
    }

    public async Task<int> GetCountByFlightId(Guid flightId, CancellationToken cancellationToken = default)
    {
        return await _BoardingPassRepository.GetCountByFlightIdAsync(flightId, cancellationToken);
    }
}
