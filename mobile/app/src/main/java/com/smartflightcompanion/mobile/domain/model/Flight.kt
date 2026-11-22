package com.smartflightcompanion.mobile.domain.model

import java.time.LocalDate
import java.time.OffsetDateTime

data class FlightSummary(
    val id: String,
    val flightNumber: String,
    val airline: String,
    val fromLabel: String,
    val toLabel: String,
    val departureAt: OffsetDateTime?,
    val lowestPrice: Double?,
    val status: String
)

data class FlightPage(
    val items: List<FlightSummary>,
    val page: Int,
    val pageSize: Int,
    val totalCount: Int,
    val hasNextPage: Boolean
)

data class FlightSearchFilters(
    val airline: String = "",
    val start: String = "",
    val destination: String = "",
    val departureDate: LocalDate? = null,
    val maxPrice: Double? = null,
    val status: String? = null
)

enum class FlightStatus(val apiValue: String) {
    Scheduled("Scheduled"),
    Delayed("Delayed"),
    Departed("Departed"),
    Arrived("Arrived"),
    Cancelled("Cancelled");

    companion object {
        fun fromApi(value: String): FlightStatus? = entries.firstOrNull { it.apiValue.equals(value, ignoreCase = true) }
    }
}
