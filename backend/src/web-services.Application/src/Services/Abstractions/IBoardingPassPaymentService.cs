using SmartFlightCompanion.WebServices.Application.Dto;
using SmartFlightCompanion.WebServices.Infrastructure.Entities;

namespace SmartFlightCompanion.WebServices.Application.Services;

public interface IPaymentService
{
    Task<PaymentSessionDto?> RequestPaymentSessionAsync(
        Guid flightId,
        Guid ownerId,
        Seat seat,
        string returnPath,
        CancellationToken cancellationToken = default);

    Task<BoardingPassPaymentStateDto?> HandlePaymentCallbackAsync(
        PaymentResultDto callback,
        CancellationToken cancellationToken = default);
}
