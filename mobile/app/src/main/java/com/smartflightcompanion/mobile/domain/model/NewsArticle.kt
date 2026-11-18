package com.smartflightcompanion.mobile.domain.model

import java.time.OffsetDateTime

data class NewsArticle(
    val title: String,
    val link: String,
    /** Sanitized HTML limited to basic formatting tags and http(s) links. */
    val summaryHtml: String,
    val publishedAt: OffsetDateTime?
)
