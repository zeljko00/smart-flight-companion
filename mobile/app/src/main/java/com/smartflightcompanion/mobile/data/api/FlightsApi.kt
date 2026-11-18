package com.smartflightcompanion.mobile.data.api

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Query

interface FlightsApi {
    @GET("flights/search")
    suspend fun search(
        @Query("page") page: Int,
        @Query("pageSize") pageSize: Int,
        @Query("airline") airline: String? = null,
        @Query("start") start: String? = null,
        @Query("destination") destination: String? = null,
        @Query("status") status: String? = null,
        @Query("maxPrice") maxPrice: Double? = null,
        @Query("departure") departure: String? = null
    ): PagedResultDto<FlightDto>

    @POST("flights/search/natural-language")
    suspend fun searchNaturalLanguage(@Body request: NaturalLanguageSearchRequest): NaturalLanguageSearchResponseDto
}
