using SmartFlightCompanion.WebServices.Infrastructure.Persistence.Abstractions;
using SmartFlightCompanion.WebServices.Application.Dto;

namespace SmartFlightCompanion.WebServices.Application.Services;

public class AirportService : IAirportService
{
    private readonly IAirportRepository _airportRepository;
    private readonly IGeocodingService _geocodingService;

    public AirportService(IAirportRepository airportRepository, IGeocodingService geocodingService)
    {
        _airportRepository = airportRepository;
        _geocodingService = geocodingService;
    }

    public async Task<AirportDto?> GetById(Guid id, CancellationToken cancellationToken = default)
    {
        var airport = await _airportRepository.GetByIdAsync(id, cancellationToken);
        return airport is null ? null : AirportDto.FromEntity(airport);
    }

    public async Task<IReadOnlyList<AirportDto>> GetAll(CancellationToken cancellationToken = default)
    {
        var airports = await _airportRepository.GetAsync(cancellationToken);
        return airports.Select(AirportDto.FromEntity).ToList().AsReadOnly();
    }

    public async Task<IReadOnlyList<AirportDto>> Search(string query, CancellationToken cancellationToken = default)
    {
        var airports = await _airportRepository.SearchAsync(query, cancellationToken);
        return airports.Select(AirportDto.FromEntity).ToList().AsReadOnly();
    }

    public async Task<AirportDto> Create(AirportCreateRequestDto request, CancellationToken cancellationToken = default)
    {
        var address = await _geocodingService.ReverseGeocode(
                request.Latitude!.Value,
                request.Longitude!.Value,
                cancellationToken)
            ?? throw new AddressResolutionException(
                "Could not determine an address for the selected location. Choose another point or try again later.");

        var airport = await _airportRepository.CreateAsync(request.ToEntity(address), cancellationToken);
        return AirportDto.FromEntity(airport);
    }
}