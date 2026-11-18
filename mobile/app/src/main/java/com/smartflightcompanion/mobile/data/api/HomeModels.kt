package com.smartflightcompanion.mobile.data.api

import com.google.gson.JsonElement

// Fields are nullable because Gson bypasses Kotlin null-safety; mappers apply the web app's fallbacks.

data class PagedResultDto<T>(
    val items: List<T>?,
    val page: Int?,
    val pageSize: Int?,
    val totalCount: Int?,
    val hasNextPage: Boolean?
)

data class AirportSummaryDto(
    val name: String?,
    val iata: String?,
    val address: String?,
    val latitude: Double? = null,
    val longitude: Double? = null
)

data class FlightDto(
    val id: String?,
    val flightNumber: String?,
    /** The backend DTO misspells this property; kept for compatibility. */
    val fligtNumber: String?,
    val departureAirport: AirportSummaryDto?,
    val arrivalAirport: AirportSummaryDto?,
    val status: String?,
    val airline: String?,
    val scheduledDepartureTime: String?,
    val departureTime: String?,
    val economyPrice: Double?,
    val premiumEconomyPrice: Double?,
    val businessPrice: Double?,
    val firstClassPrice: Double?
)

data class NaturalLanguageSearchRequest(
    val query: String,
    val page: Int,
    val pageSize: Int
)

data class NaturalLanguageSearchResponseDto(
    val flights: PagedResultDto<FlightDto>?
)

data class BoardingPassDto(
    val id: String?,
    val flightId: String?,
    val flightNumber: String?,
    val flightAirline: String?,
    val flightDepartureAirport: String?,
    val flightArrivalAirport: String?,
    val flightDepartureTime: String?,
    /** Enum serialized either as a number or as its name depending on server settings. */
    val seat: JsonElement?,
    val price: Double?,
    val issuedAt: String?,
    val isValid: Boolean?
)

data class NewsArticleDto(
    val title: String?,
    val link: String?,
    val summary: String?,
    val publishedAt: String?
)
