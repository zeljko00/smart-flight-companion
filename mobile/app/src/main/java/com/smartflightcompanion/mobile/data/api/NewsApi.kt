package com.smartflightcompanion.mobile.data.api

import retrofit2.http.GET
import retrofit2.http.Query

interface NewsApi {
    @GET("news")
    suspend fun latest(@Query("count") count: Int): List<NewsArticleDto>
}
