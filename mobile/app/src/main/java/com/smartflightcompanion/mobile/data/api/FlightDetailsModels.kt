package com.smartflightcompanion.mobile.data.api

// Fields are nullable because Gson bypasses Kotlin null-safety; mappers apply the web app's fallbacks.

data class FlightDetailsResponseDto(
    val flight: FlightDetailsDto?
)

data class FlightDetailsDto(
    val id: String?,
    val flightNumber: String?,
    /** The backend DTO misspells this property; kept for compatibility. */
    val fligtNumber: String?,
    val airline: String?,
    val status: String?,
    val terminal: Int?,
    val gate: String?,
    val aircraft: String?,
    val seatCapacity: Int?,
    val seatsFree: Int?,
    val departureAirport: AirportSummaryDto?,
    val arrivalAirport: AirportSummaryDto?,
    val scheduledDepartureTime: String?,
    val scheduledArrivalTime: String?,
    val departureTime: String?,
    val arrivalTime: String?,
    val economyPrice: Double?,
    val premiumEconomyPrice: Double?,
    val businessPrice: Double?,
    val firstClassPrice: Double?
)

data class CityWeatherDto(
    val city: String?,
    val country: String?,
    val forecast: List<WeatherDayDto>?
)

data class WeatherDayDto(
    val date: String?,
    val minTemperatureCelsius: Double?,
    val maxTemperatureCelsius: Double?,
    val weatherCode: Int?
)

data class BoardingGuideDto(
    val id: String?,
    val description: String?,
    val opensAt: String?,
    val closesAt: String?,
    val imageUrls: List<String>?,
    val videoUrls: List<String>?
)
