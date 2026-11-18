package com.smartflightcompanion.mobile.data

import com.google.gson.JsonElement
import com.smartflightcompanion.mobile.data.api.AirportSummaryDto
import com.smartflightcompanion.mobile.data.api.BoardingPassDto
import com.smartflightcompanion.mobile.data.api.FlightDto
import com.smartflightcompanion.mobile.data.api.NewsArticleDto
import com.smartflightcompanion.mobile.data.api.PagedResultDto
import com.smartflightcompanion.mobile.domain.model.BoardingPass
import com.smartflightcompanion.mobile.domain.model.FlightPage
import com.smartflightcompanion.mobile.domain.model.FlightSummary
import com.smartflightcompanion.mobile.domain.model.NewsArticle
import com.smartflightcompanion.mobile.domain.model.SeatClass
import java.time.OffsetDateTime
import java.time.format.DateTimeParseException

private const val UNKNOWN_FLIGHT_NUMBER = "Unknown #"
private const val UNKNOWN_AIRLINE = "Unknown airline"
private const val UNKNOWN_AIRPORT = "TBD"
private const val DEFAULT_STATUS = "Scheduled"

internal fun String?.toOffsetDateTimeOrNull(): OffsetDateTime? =
    if (isNullOrBlank()) null else try {
        OffsetDateTime.parse(this)
    } catch (_: DateTimeParseException) {
        null
    }

private fun String?.orFallback(fallback: String): String = this?.trim()?.takeIf { it.isNotEmpty() } ?: fallback

private fun AirportSummaryDto?.label(): String =
    this?.iata?.trim()?.takeIf { it.isNotEmpty() } ?: this?.name.orFallback(UNKNOWN_AIRPORT)

internal fun FlightDto.toDomain(): FlightSummary? {
    val flightId = id?.takeIf { it.isNotBlank() } ?: return null
    return FlightSummary(
        id = flightId,
        flightNumber = (flightNumber ?: fligtNumber).orFallback(UNKNOWN_FLIGHT_NUMBER),
        airline = airline.orFallback(UNKNOWN_AIRLINE),
        fromLabel = departureAirport.label(),
        toLabel = arrivalAirport.label(),
        departureAt = departureTime.toOffsetDateTimeOrNull() ?: scheduledDepartureTime.toOffsetDateTimeOrNull(),
        lowestPrice = listOfNotNull(economyPrice, premiumEconomyPrice, businessPrice, firstClassPrice)
            .filter { it >= 0 }
            .minOrNull(),
        status = status.orFallback(DEFAULT_STATUS)
    )
}

internal fun PagedResultDto<FlightDto>?.toFlightPage(requestedPage: Int, requestedPageSize: Int): FlightPage {
    val items = this?.items.orEmpty()
        .mapNotNull { it.toDomain() }
        .sortedWith(compareBy(nullsLast()) { it.departureAt?.toInstant() })
    return FlightPage(
        items = items,
        page = this?.page ?: requestedPage,
        pageSize = this?.pageSize ?: requestedPageSize,
        totalCount = this?.totalCount ?: items.size,
        hasNextPage = this?.hasNextPage ?: false
    )
}

private fun JsonElement?.toSeatClass(): SeatClass? {
    if (this == null || !isJsonPrimitive) return null
    val primitive = asJsonPrimitive
    if (primitive.isNumber) {
        return when (primitive.asInt) {
            0 -> SeatClass.Economy
            1 -> SeatClass.PremiumEconomy
            2 -> SeatClass.Business
            3 -> SeatClass.FirstClass
            else -> null
        }
    }
    return when (primitive.asString.lowercase().filter { it.isLetter() }) {
        "economy" -> SeatClass.Economy
        "premiumeconomy" -> SeatClass.PremiumEconomy
        "business" -> SeatClass.Business
        "firstclass", "first" -> SeatClass.FirstClass
        else -> null
    }
}

internal fun BoardingPassDto.toDomain(): BoardingPass? {
    val passId = id?.takeIf { it.isNotBlank() } ?: return null
    return BoardingPass(
        id = passId,
        flightId = flightId?.takeIf { it.isNotBlank() },
        flightNumber = flightNumber.orFallback(UNKNOWN_FLIGHT_NUMBER),
        airline = flightAirline.orFallback(UNKNOWN_AIRLINE),
        fromLabel = flightDepartureAirport.orFallback(UNKNOWN_AIRPORT),
        toLabel = flightArrivalAirport.orFallback(UNKNOWN_AIRPORT),
        departureAt = flightDepartureTime.toOffsetDateTimeOrNull(),
        seat = seat.toSeatClass(),
        price = price?.takeIf { it >= 0 },
        issuedAt = issuedAt.toOffsetDateTimeOrNull(),
        isValid = isValid == true
    )
}

internal fun NewsArticleDto.toDomain(): NewsArticle? {
    val cleanTitle = title?.trim()?.takeIf { it.isNotEmpty() } ?: return null
    val cleanLink = link?.trim()?.takeIf { it.isHttpUrl() } ?: return null
    return NewsArticle(
        title = cleanTitle,
        link = cleanLink,
        summaryHtml = NewsHtmlSanitizer.sanitize(summary.orEmpty()),
        publishedAt = publishedAt.toOffsetDateTimeOrNull()
    )
}

internal fun String.isHttpUrl(): Boolean =
    startsWith("https://", ignoreCase = true) || startsWith("http://", ignoreCase = true)
