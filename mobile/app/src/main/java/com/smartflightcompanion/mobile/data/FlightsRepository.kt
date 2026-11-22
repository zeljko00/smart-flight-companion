package com.smartflightcompanion.mobile.data

import com.smartflightcompanion.mobile.data.api.ApiClient
import com.smartflightcompanion.mobile.data.api.ApiException
import com.smartflightcompanion.mobile.data.api.FlightsApi
import com.smartflightcompanion.mobile.data.api.NaturalLanguageSearchRequest
import com.smartflightcompanion.mobile.data.api.CreateCommentRequest
import com.smartflightcompanion.mobile.data.api.FlightAdviceRequest
import com.smartflightcompanion.mobile.data.api.apiCall
import com.smartflightcompanion.mobile.domain.model.BoardingGuide
import com.smartflightcompanion.mobile.domain.model.CityWeather
import com.smartflightcompanion.mobile.domain.model.FlightDetails
import com.smartflightcompanion.mobile.domain.model.FlightComment
import com.smartflightcompanion.mobile.domain.model.FlightPage
import com.smartflightcompanion.mobile.domain.model.FlightSearchFilters
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import java.time.OffsetDateTime

private const val DATE_FILTER_HOUR_UTC = 12
private const val HTTP_NOT_FOUND = 404

class FlightsRepository(private val api: FlightsApi = ApiClient.flightsApi) {

    suspend fun search(filters: FlightSearchFilters, page: Int, pageSize: Int): FlightPage {
        val response = apiCall {
            api.search(
                page = page,
                pageSize = pageSize,
                airline = filters.airline.trim().ifEmpty { null },
                start = filters.start.trim().ifEmpty { null },
                destination = filters.destination.trim().ifEmpty { null },
                status = filters.status?.trim()?.ifEmpty { null },
                maxPrice = filters.maxPrice?.takeIf { it >= 0 },
                departure = filters.departureDate?.let {
                    DateTimeFormatter.ISO_INSTANT.format(it.atTime(DATE_FILTER_HOUR_UTC, 0).toInstant(ZoneOffset.UTC))
                }
            )
        }
        return response.toFlightPage(page, pageSize)
    }

    suspend fun searchNaturalLanguage(query: String, page: Int, pageSize: Int): FlightPage {
        val response = apiCall {
            api.searchNaturalLanguage(NaturalLanguageSearchRequest(query.trim(), page, pageSize))
        }
        return response.flights.toFlightPage(page, pageSize)
    }

    suspend fun getById(id: String): FlightDetails? =
        try {
            val response = apiCall { api.flightById(id) }
            response.flight?.toDomain(response.aiExchanges)
        } catch (e: ApiException) {
            if (e.status == HTTP_NOT_FOUND) null else throw e
        }

    suspend fun askAdvice(flightId: String, query: String): String =
        formatAiResponse(apiCall { api.flightAdvice(flightId, FlightAdviceRequest(query)) }.advice.orEmpty())

    suspend fun getDestinationWeather(latitude: Double, longitude: Double): List<CityWeather> =
        try {
            apiCall { api.destinationWeather(latitude, longitude) }.mapNotNull { it.toDomain() }
        } catch (e: ApiException) {
            if (e.status == HTTP_NOT_FOUND) emptyList() else throw e
        }

    suspend fun getBoardingGuides(flightId: String): List<BoardingGuide> =
        apiCall { api.boardingGuides(flightId) }.mapNotNull { it.toDomain() }

    suspend fun getComments(flightId: String): List<FlightComment> =
        apiCall { api.commentsByFlight(flightId) }
            .mapNotNull { it.toDomain() }
            .sortedBy { it.createdAt }

    suspend fun createComment(flightId: String, content: String): FlightComment =
        apiCall { api.createComment(CreateCommentRequest(flightId, content)) }
            .toDomain()
            ?: error("The comments API returned an invalid comment.")

    private fun com.smartflightcompanion.mobile.data.api.CommentDto.toDomain(): FlightComment? {
        val id = id?.takeIf { it.isNotBlank() } ?: return null
        val content = content?.trim()?.takeIf { it.isNotEmpty() } ?: return null
        return FlightComment(
            id = id,
            author = author?.trim().orEmpty().ifEmpty { "Unknown" },
            content = content,
            createdAt = createdAt?.let { runCatching { OffsetDateTime.parse(it) }.getOrNull() }
        )
    }
}
