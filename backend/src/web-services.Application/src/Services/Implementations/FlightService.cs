using SmartFlightCompanion.WebServices.Application.Dto;
using SmartFlightCompanion.WebServices.Infrastructure.Entities;
using SmartFlightCompanion.WebServices.Infrastructure.Persistence.Abstractions;

namespace SmartFlightCompanion.WebServices.Application.Services;

public sealed class FlightService : IFlightService
{
    private readonly IFlightRepository _flightRepository;
    private readonly IAirportRepository _airportRepository;
    private readonly IBoardingPassService _boardingPassService;

    public FlightService(
        IFlightRepository flightRepository,
        IAirportRepository airportRepository,
        IBoardingPassService boardingPassService)
    {
        _flightRepository = flightRepository;
        _airportRepository = airportRepository;
        _boardingPassService = boardingPassService;
    }

    public async Task<FlightDto?> GetById(Guid id, CancellationToken cancellationToken = default)
    {
        var flight = await _flightRepository.GetByIdAsync(id, cancellationToken);

        if (flight is null)
        {
            return null;
        }

        int count = await _boardingPassService.GetCountByFlightId(flight.Id, cancellationToken);
        int seatsFree = Math.Max(0, flight.SeatCapacity - count);
        return FlightDto.FromEntity(flight) with { SeatsFree = seatsFree }; 
    }

    public async Task<PagedResultDto<FlightDto>> GetAll(int? page, int? pageSize, CancellationToken cancellationToken = default)
    {
        var flights = await _flightRepository.GetPaged(page, pageSize, cancellationToken);

        var result = new List<FlightDto>(flights.Items.Count);

        foreach (var flightEntity in flights.Items)
        {
            var flight = FlightDto.FromEntity(flightEntity);
            var count = await _boardingPassService.GetCountByFlightId(flight.Id, cancellationToken);
            var seatsFree = Math.Max(0, flight.SeatCapacity - count);

            result.Add(flight with { SeatsFree = seatsFree });
        }

        var effectivePage = page ?? 1;
        var effectivePageSize = pageSize ?? Math.Max(1, flights.Items.Count);
        var hasNextPage = page.HasValue && pageSize.HasValue
            ? (effectivePage * effectivePageSize) < flights.TotalCount
            : false;

        return new PagedResultDto<FlightDto>(
            result.AsReadOnly(),
            effectivePage,
            effectivePageSize,
            flights.TotalCount,
            hasNextPage);
    }

    public async Task<PagedResultDto<FlightDto>> Search(
        string? flightNumber,
        string? departure,
        string? destination,
        string? status,
        string? airline,
        decimal? maxPrice,
        DateTimeOffset? departureTime,
        int? page,
        int? pageSize,
        CancellationToken cancellationToken = default)
    {
        var flights = await _flightRepository.Search(
            flightNumber,
            departure,
            destination,
            status,
            airline,
            maxPrice,
            departureTime,
            page,
            pageSize,
            cancellationToken);

        var result = new List<FlightDto>(flights.Items.Count);

        foreach (var flightEntity in flights.Items)
        {
            var flight = FlightDto.FromEntity(flightEntity);
            var count = await _boardingPassService.GetCountByFlightId(flight.Id, cancellationToken);
            var seatsFree = Math.Max(0, flight.SeatCapacity - count);

            result.Add(flight with { SeatsFree = seatsFree });
        }

        var effectivePage = page ?? 1;
        var effectivePageSize = pageSize ?? Math.Max(1, flights.Items.Count);
        var hasNextPage = page.HasValue && pageSize.HasValue
            ? (effectivePage * effectivePageSize) < flights.TotalCount
            : false;

        return new PagedResultDto<FlightDto>(
            result.AsReadOnly(),
            effectivePage,
            effectivePageSize,
            flights.TotalCount,
            hasNextPage);
    }

    public async Task<FlightDto> Create(FlightRequestDto request, CancellationToken cancellationToken = default)
    {
        var values = await ValidateAndResolve(request, cancellationToken);

        var flight = new Flight
        {
            FlightNumber = values.FlightNumber,
            DepartureAirport = values.DepartureAirport,
            ArrivalAirport = values.ArrivalAirport,
            Status = values.Status,
            Terminal = request.Terminal!.Value,
            Gate = request.Gate!.Trim(),
            Airline = request.Airline!.Trim(),
            Aircraft = request.Aircraft!.Trim(),
            SeatCapacity = request.SeatCapacity!.Value,
            ScheduledDepartureTime = values.ScheduledDepartureTime,
            ScheduledArrivalTime = values.ScheduledArrivalTime,
            DepartureTime = values.DepartureTime,
            ArrivalTime = values.ArrivalTime,
            EconomyPrice = request.EconomyPrice,
            PremiumEconomyPrice = request.PremiumEconomyPrice,
            BusinessPrice = request.BusinessPrice,
            FirstClassPrice = request.FirstClassPrice,
        };

        var created = await _flightRepository.CreateAsync(flight, cancellationToken);

        return FlightDto.FromEntity(created) with { SeatsFree = created.SeatCapacity };
    }

    public async Task<FlightDto?> Update(Guid id, FlightRequestDto request, CancellationToken cancellationToken = default)
    {
        var flight = await _flightRepository.GetByIdAsync(id, cancellationToken);

        if (flight is null)
        {
            return null;
        }

        var values = await ValidateAndResolve(request, cancellationToken);

        var issuedBoardingPasses = await _boardingPassService.GetCountByFlightId(flight.Id, cancellationToken);
        if (request.SeatCapacity!.Value < issuedBoardingPasses)
        {
            throw new FlightValidationException(
                $"Seat capacity cannot be lower than the number of issued boarding passes ({issuedBoardingPasses}).");
        }

        flight.FlightNumber = values.FlightNumber;
        flight.DepartureAirport = values.DepartureAirport;
        flight.ArrivalAirport = values.ArrivalAirport;
        flight.Status = values.Status;
        flight.Terminal = request.Terminal!.Value;
        flight.Gate = request.Gate!.Trim();
        flight.Airline = request.Airline!.Trim();
        flight.Aircraft = request.Aircraft!.Trim();
        flight.SeatCapacity = request.SeatCapacity!.Value;
        flight.ScheduledDepartureTime = values.ScheduledDepartureTime;
        flight.ScheduledArrivalTime = values.ScheduledArrivalTime;
        flight.DepartureTime = values.DepartureTime;
        flight.ArrivalTime = values.ArrivalTime;
        flight.EconomyPrice = request.EconomyPrice;
        flight.PremiumEconomyPrice = request.PremiumEconomyPrice;
        flight.BusinessPrice = request.BusinessPrice;
        flight.FirstClassPrice = request.FirstClassPrice;

        await _flightRepository.UpdateAsync(flight, cancellationToken);

        return FlightDto.FromEntity(flight) with { SeatsFree = Math.Max(0, flight.SeatCapacity - issuedBoardingPasses) };
    }

    private sealed record ResolvedFlightValues(
        string FlightNumber,
        Airport DepartureAirport,
        Airport ArrivalAirport,
        FlightStatus Status,
        DateTimeOffset ScheduledDepartureTime,
        DateTimeOffset ScheduledArrivalTime,
        DateTimeOffset DepartureTime,
        DateTimeOffset ArrivalTime);

    private async Task<ResolvedFlightValues> ValidateAndResolve(FlightRequestDto request, CancellationToken cancellationToken)
    {
        if (!Enum.TryParse<FlightStatus>(request.Status, ignoreCase: true, out var status)
            || !Enum.IsDefined(status))
        {
            throw new FlightValidationException($"Unknown flight status '{request.Status}'.");
        }

        var departureAirport = await _airportRepository.GetByIataAsync(request.DepartureAirportIata!, cancellationToken)
            ?? throw new FlightValidationException($"Departure airport '{request.DepartureAirportIata!.Trim().ToUpperInvariant()}' does not exist.");
        var arrivalAirport = await _airportRepository.GetByIataAsync(request.ArrivalAirportIata!, cancellationToken)
            ?? throw new FlightValidationException($"Arrival airport '{request.ArrivalAirportIata!.Trim().ToUpperInvariant()}' does not exist.");

        if (departureAirport.Id == arrivalAirport.Id)
        {
            throw new FlightValidationException("Departure and arrival airports must be different.");
        }

        // Npgsql only accepts UTC offsets for timestamptz columns.
        var scheduledDeparture = request.ScheduledDepartureTime!.Value.ToUniversalTime();
        var scheduledArrival = request.ScheduledArrivalTime!.Value.ToUniversalTime();
        var departure = request.DepartureTime?.ToUniversalTime() ?? scheduledDeparture;
        var arrival = request.ArrivalTime?.ToUniversalTime() ?? scheduledArrival;

        if (scheduledArrival <= scheduledDeparture)
        {
            throw new FlightValidationException("Scheduled arrival must be later than scheduled departure.");
        }

        if (arrival <= departure)
        {
            throw new FlightValidationException("Arrival time must be later than departure time.");
        }

        return new ResolvedFlightValues(
            request.FlightNumber!.Trim().ToUpperInvariant(),
            departureAirport,
            arrivalAirport,
            status,
            scheduledDeparture,
            scheduledArrival,
            departure,
            arrival);
    }
}
