using SmartFlightCompanion.WebServices.Application.Dto;

namespace SmartFlightCompanion.WebServices.Application.Services;

public interface IAirportService
{
    Task<AirportDto?> GetById(Guid id, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<AirportDto>> GetAll(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<AirportDto>> Search(string query, CancellationToken cancellationToken = default);
}