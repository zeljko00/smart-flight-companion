package com.smartflightcompanion.mobile.data.api

import okhttp3.ResponseBody
import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.PUT
import retrofit2.http.Path
import retrofit2.http.Streaming

interface UserApi {
    @GET("users/me/boarding-passes")
    suspend fun boardingPasses(): List<BoardingPassDto>

    @Streaming
    @GET("users/me/boarding-passes/{id}/pdf")
    suspend fun boardingPassPdf(@Path("id") id: String): ResponseBody

    @PUT("users/me/logout")
    suspend fun logout(): Response<Unit>
}
