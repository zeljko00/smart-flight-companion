package com.smartflightcompanion.mobile.data.api

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
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

    @GET("flights/{id}")
    suspend fun flightById(@Path("id") id: String): FlightDetailsResponseDto

    @GET("weather/destination")
    suspend fun destinationWeather(
        @Query("lat") lat: Double,
        @Query("lng") lng: Double
    ): List<CityWeatherDto>

    @GET("flights/{id}/boarding-guides")
    suspend fun boardingGuides(@Path("id") id: String): List<BoardingGuideDto>

    @GET("flights/{id}/comments")
    suspend fun commentsByFlight(@Path("id") id: String): List<CommentDto>

    @POST("comments")
    suspend fun createComment(@Body request: CreateCommentRequest): CommentDto

    @POST("flights/{id}/advice")
    suspend fun flightAdvice(@Path("id") id: String, @Body request: FlightAdviceRequest): FlightAdviceResponseDto
}
