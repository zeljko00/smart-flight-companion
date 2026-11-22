package com.smartflightcompanion.mobile.domain.model

import java.time.Duration
import java.time.OffsetDateTime

data class AirportDetails(
    val iata: String,
    val name: String,
    val address: String,
    val latitude: Double? = null,
    val longitude: Double? = null
)

data class FlightDetails(
    val id: String,
    val flightNumber: String,
    val airline: String,
    val status: String,
    val terminal: Int?,
    val gate: String,
    val aircraft: String,
    val seatCapacity: Int?,
    val seatsFree: Int?,
    val departureAirport: AirportDetails,
    val arrivalAirport: AirportDetails,
    val scheduledDeparture: OffsetDateTime?,
    val scheduledArrival: OffsetDateTime?,
    val departure: OffsetDateTime?,
    val arrival: OffsetDateTime?,
    val prices: Map<SeatClass, Double>,
    val aiExchanges: List<AiExchange> = emptyList()
) {
    val isSoldOut: Boolean get() = seatsFree == 0

    val duration: Duration?
        get() {
            val start = departure ?: return null
            val end = arrival ?: return null
            return Duration.between(start, end).takeIf { !it.isNegative && !it.isZero }
        }
}

data class AiExchange(
    val id: String,
    val request: String,
    val response: String,
    val timestamp: OffsetDateTime?
)

data class BoardingGuide(
    val id: String,
    val description: String,
    val opensAt: OffsetDateTime?,
    val closesAt: OffsetDateTime?,
    val imageUrls: List<String>,
    val videoUrls: List<String>
)
