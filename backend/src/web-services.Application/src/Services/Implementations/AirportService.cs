using SmartFlightCompanion.WebServices.Infrastructure.Persistence.Abstractions;
using SmartFlightCompanion.WebServices.Application.Dto;

namespace SmartFlightCompanion.WebServices.Application.Services;

public class AirportService : IAirportService
{
    private readonly IAirportRepository _airportRepository;

    public AirportService(IAirportRepository airportRepository)
    {
        _airportRepository = airportRepository;
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
}