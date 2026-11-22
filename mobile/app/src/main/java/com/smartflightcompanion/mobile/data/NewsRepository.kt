package com.smartflightcompanion.mobile.data

import com.smartflightcompanion.mobile.data.api.ApiClient
import com.smartflightcompanion.mobile.data.api.NewsApi
import com.smartflightcompanion.mobile.data.api.apiCall
import com.smartflightcompanion.mobile.domain.model.NewsArticle

class NewsRepository(private val api: NewsApi = ApiClient.newsApi) {

    suspend fun getLatest(count: Int): List<NewsArticle> =
        apiCall { api.latest(count) }.mapNotNull { it.toDomain() }
}
