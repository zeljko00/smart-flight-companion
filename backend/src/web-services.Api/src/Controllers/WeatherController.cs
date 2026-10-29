using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;
using SmartFlightCompanion.WebServices.Application.Dto;
using SmartFlightCompanion.WebServices.Application.Services;

namespace SmartFlightCompanion.WebServices.Api.Controllers;

[ApiController]
[Route("weather")]
public sealed class WeatherController : ControllerBase
{
    private readonly IWeatherService _weatherService;

    public WeatherController(IWeatherService weatherService)
    {
        _weatherService = weatherService;
    }

    [HttpGet("destination")]
    [ProducesResponseType(typeof(IReadOnlyList<CityWeatherForecastDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IReadOnlyList<CityWeatherForecastDto>>> GetDestinationForecast(
        [FromQuery] DestinationForecastRequest request,
        CancellationToken cancellationToken)
    {
        var forecast = await _weatherService.GetForecastByDestinationCoordinates(
            request.Lat,
            request.Lng,
            cancellationToken);

        if (forecast is null)
        {
            return NotFound("Weather forecast not available.");
        }

        return Ok(forecast);
    }
}

public sealed class DestinationForecastRequest
{
    [FromQuery(Name = "lat")]
    [Range(-90, 90)]
    public double Lat { get; set; }

    [FromQuery(Name = "lng")]
    [Range(-180, 180)]
    public double Lng { get; set; }
}