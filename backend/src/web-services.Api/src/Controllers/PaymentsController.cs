using Microsoft.AspNetCore.Mvc;
using SmartFlightCompanion.WebServices.Application.Dto;
using SmartFlightCompanion.WebServices.Application.Services;

namespace SmartFlightCompanion.WebServices.Api.Controllers;

[ApiController]
[Route("payments")]
public sealed class BoardingPassPaymentsController : ControllerBase
{
    private readonly IPaymentService _paymentService;

    public BoardingPassPaymentsController(IPaymentService paymentService)
    {
        _paymentService = paymentService;
    }

    [HttpPost("callback")]
    [ProducesResponseType(typeof(BoardingPassPaymentStateDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<BoardingPassPaymentStateDto>> HandleCallback(
        [FromBody] PaymentResultDto request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.PaymentId))
        {
            return BadRequest("Payment ID is required.");
        }

        if (string.IsNullOrWhiteSpace(request.Status))
        {
            return BadRequest("Payment status is required.");
        }

        var result = await _paymentService.HandlePaymentCallbackAsync(request, cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }
}
