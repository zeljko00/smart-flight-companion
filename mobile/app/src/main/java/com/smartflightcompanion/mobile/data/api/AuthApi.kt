package com.smartflightcompanion.mobile.data.api

import retrofit2.Call
import retrofit2.http.Body
import retrofit2.http.Header
import retrofit2.http.POST

interface AuthApi {
    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): AuthenticationResultDto

    @POST("auth/register")
    suspend fun register(@Body request: RegisterRequest): AuthenticationResultDto

    @POST("auth/refresh")
    fun refresh(@Header("Cookie") refreshCookie: String): Call<AuthenticationResultDto>
}
