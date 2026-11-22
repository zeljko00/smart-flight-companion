package com.smartflightcompanion.mobile.domain.model

import java.time.OffsetDateTime

data class FlightComment(
    val id: String,
    val author: String,
    val content: String,
    val createdAt: OffsetDateTime?
)
