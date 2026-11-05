using System.ComponentModel.DataAnnotations;
using SmartFlightCompanion.WebServices.Infrastructure.Entities;

namespace SmartFlightCompanion.WebServices.Application.Dto;

public sealed record BoardingPassPaymentSessionRequestDto(
    [Required]
    Seat Seat,
    [Required]
    Guid OwnerId,
    [Required]
    string ReturnPath
);

public sealed record PaymentSessionDto(
    string PaymentId,
    string CheckoutUrl
);

public sealed record PaymentResultDto(
    [Required]
    string PaymentId,
    [Required]
    string Status,
    string? FailureReason
);

public sealed record BoardingPassPaymentStateDto(
    string SessionId,
    string Status,
    Guid? BoardingPassId,
    string? FailureReason
);
