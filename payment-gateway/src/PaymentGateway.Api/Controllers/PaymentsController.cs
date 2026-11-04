using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PaymentGateway.Api.Data;
using PaymentGateway.Api.Models;

namespace PaymentGateway.Api.Controllers;

[ApiController]
[Route("payments")]
public sealed class PaymentsController(PaymentGatewayDbContext dbContext) : ControllerBase
{
    [HttpPost]
    [ProducesResponseType(typeof(Payment), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<string>> Create(CancellationToken cancellationToken)
    {
        return Created(string.Empty, "test");
    }
}
