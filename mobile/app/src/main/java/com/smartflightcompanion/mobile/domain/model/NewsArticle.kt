package com.smartflightcompanion.mobile.domain.model

import java.time.OffsetDateTime

data class NewsArticle(
    val title: String,
    val link: String,
    val summaryHtml: String,
    val publishedAt: OffsetDateTime?
)
