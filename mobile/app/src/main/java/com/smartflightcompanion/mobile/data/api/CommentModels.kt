package com.smartflightcompanion.mobile.data.api

data class CommentDto(
    val id: String?,
    val authorId: String?,
    val author: String?,
    val content: String?,
    val flightId: String?,
    val flightNumber: String?,
    val createdAt: String?
)

data class CreateCommentRequest(
    val flightId: String,
    val content: String
)
