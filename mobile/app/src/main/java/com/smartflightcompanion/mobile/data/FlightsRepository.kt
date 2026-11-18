package com.smartflightcompanion.mobile.data

import com.smartflightcompanion.mobile.data.api.ApiClient
import com.smartflightcompanion.mobile.data.api.ApiException
import com.smartflightcompanion.mobile.data.api.FlightsApi
import com.smartflightcompanion.mobile.data.api.NaturalLanguageSearchRequest
import com.smartflightcompanion.mobile.data.api.apiCall
import com.smartflightcompanion.mobile.domain.model.BoardingGuide
import com.smartflightcompanion.mobile.domain.model.CityWeather
import com.smartflightcompanion.mobile.domain.model.FlightDetails
import com.smartflightcompanion.mobile.domain.model.FlightPage
import com.smartflightcompanion.mobile.domain.model.FlightSearchFilters
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter

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
                // UTC noon, like the web app, so the backend resolves the intended calendar day.
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

    /** Returns null when the backend has no such flight. */
    suspend fun getById(id: String): FlightDetails? =
        try {
            apiCall { api.flightById(id) }.flight?.toDomain()
        } catch (e: ApiException) {
            if (e.status == HTTP_NOT_FOUND) null else throw e
        }

    /** Empty when the backend has no forecast (404) for the coordinates. */
    suspend fun getDestinationWeather(latitude: Double, longitude: Double): List<CityWeather> =
        try {
            apiCall { api.destinationWeather(latitude, longitude) }.mapNotNull { it.toDomain() }
        } catch (e: ApiException) {
            if (e.status == HTTP_NOT_FOUND) emptyList() else throw e
        }

    suspend fun getBoardingGuides(flightId: String): List<BoardingGuide> =
        apiCall { api.boardingGuides(flightId) }.mapNotNull { it.toDomain() }
}
