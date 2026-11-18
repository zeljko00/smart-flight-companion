package com.smartflightcompanion.mobile.data

import com.smartflightcompanion.mobile.data.api.AirportSummaryDto
import com.smartflightcompanion.mobile.data.api.BoardingGuideDto
import com.smartflightcompanion.mobile.data.api.FlightDetailsDto
import com.smartflightcompanion.mobile.domain.model.AirportDetails
import com.smartflightcompanion.mobile.domain.model.BoardingGuide
import com.smartflightcompanion.mobile.domain.model.FlightDetails
import com.smartflightcompanion.mobile.domain.model.CityWeather
import com.smartflightcompanion.mobile.domain.model.SeatClass
import com.smartflightcompanion.mobile.domain.model.WeatherCondition
import com.smartflightcompanion.mobile.domain.model.WeatherDay
import com.smartflightcompanion.mobile.data.api.CityWeatherDto
import java.time.LocalDate
import java.time.format.DateTimeParseException

private const val UNKNOWN_FLIGHT_NUMBER = "Unknown #"
private const val UNKNOWN_AIRLINE = "Unknown airline"
private const val TO_BE_DETERMINED = "TBD"
private const val DEFAULT_STATUS = "Scheduled"

private fun AirportSummaryDto?.toDomain() = AirportDetails(
    iata = this?.iata.orFallback(TO_BE_DETERMINED),
    name = this?.name.orFallback(TO_BE_DETERMINED),
    address = this?.address.orFallback(TO_BE_DETERMINED),
    latitude = this?.latitude?.takeIf { it.isFinite() },
    longitude = this?.longitude?.takeIf { it.isFinite() }
)

internal fun FlightDetailsDto.toDomain(): FlightDetails? {
    val flightId = id?.takeIf { it.isNotBlank() } ?: return null
    val prices = buildMap {
        economyPrice?.takeIf { it >= 0 }?.let { put(SeatClass.Economy, it) }
        premiumEconomyPrice?.takeIf { it >= 0 }?.let { put(SeatClass.PremiumEconomy, it) }
        businessPrice?.takeIf { it >= 0 }?.let { put(SeatClass.Business, it) }
        firstClassPrice?.takeIf { it >= 0 }?.let { put(SeatClass.FirstClass, it) }
    }
    return FlightDetails(
        id = flightId,
        flightNumber = (flightNumber ?: fligtNumber).orFallback(UNKNOWN_FLIGHT_NUMBER),
        airline = airline.orFallback(UNKNOWN_AIRLINE),
        status = status.orFallback(DEFAULT_STATUS),
        terminal = terminal,
        gate = gate.orFallback(TO_BE_DETERMINED),
        aircraft = aircraft.orFallback(TO_BE_DETERMINED),
        seatCapacity = seatCapacity,
        seatsFree = seatsFree,
        departureAirport = departureAirport.toDomain(),
        arrivalAirport = arrivalAirport.toDomain(),
        scheduledDeparture = scheduledDepartureTime.toOffsetDateTimeOrNull(),
        scheduledArrival = scheduledArrivalTime.toOffsetDateTimeOrNull(),
        departure = departureTime.toOffsetDateTimeOrNull(),
        arrival = arrivalTime.toOffsetDateTimeOrNull(),
        prices = prices
    )
}

internal fun BoardingGuideDto.toDomain(): BoardingGuide? {
    val guideId = id?.takeIf { it.isNotBlank() } ?: return null
    return BoardingGuide(
        id = guideId,
        description = description.orEmpty(),
        opensAt = opensAt.toOffsetDateTimeOrNull(),
        closesAt = closesAt.toOffsetDateTimeOrNull(),
        imageUrls = imageUrls.orEmpty().filter { it.isNotBlank() },
        videoUrls = videoUrls.orEmpty().filter { it.isNotBlank() }
    )
}

private fun String.toLocalDateOrNull(): LocalDate? =
    try {
        LocalDate.parse(take(DATE_LENGTH))
    } catch (_: DateTimeParseException) {
        null
    }

private const val DATE_LENGTH = 10

internal fun CityWeatherDto.toDomain(): CityWeather? {
    val days = forecast.orEmpty().mapNotNull { day ->
        val min = day.minTemperatureCelsius ?: return@mapNotNull null
        val max = day.maxTemperatureCelsius ?: return@mapNotNull null
        val rawDate = day.date.orEmpty()
        WeatherDay(
            date = rawDate.toLocalDateOrNull(),
            dateText = rawDate,
            minCelsius = min,
            maxCelsius = max,
            condition = WeatherCondition.fromCode(day.weatherCode ?: -1)
        )
    }
    if (days.isEmpty()) return null
    return CityWeather(city.orFallback(TO_BE_DETERMINED), country.orEmpty(), days)
}
