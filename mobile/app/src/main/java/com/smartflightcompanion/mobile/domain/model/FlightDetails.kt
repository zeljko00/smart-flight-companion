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
    /** Published non-negative prices in EUR; seat classes without a price are absent. */
    val prices: Map<SeatClass, Double>
) {
    val isSoldOut: Boolean get() = seatsFree == 0

    /** Actual flight time, or null when either time is unknown or the range is not positive. */
    val duration: Duration?
        get() {
            val start = departure ?: return null
            val end = arrival ?: return null
            return Duration.between(start, end).takeIf { !it.isNegative && !it.isZero }
        }
}

data class BoardingGuide(
    val id: String,
    val description: String,
    val opensAt: OffsetDateTime?,
    val closesAt: OffsetDateTime?,
    val imageUrls: List<String>,
    val videoUrls: List<String>
)
