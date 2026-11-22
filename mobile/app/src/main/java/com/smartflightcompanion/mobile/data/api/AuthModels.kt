package com.smartflightcompanion.mobile.data.api

data class LoginRequest(
    val username: String,
    val password: String
)

data class RegisterRequest(
    val username: String,
    val email: String,
    val firstName: String,
    val lastName: String,
    val password: String
)

data class UserDto(
    val id: String,
    val username: String,
    val email: String,
    val firstName: String,
    val lastName: String,
    val role: String,
    val isActive: Boolean,
    val createdAt: String
)

data class AuthenticationResultDto(
    val user: UserDto,
    val accessToken: String,
    val refreshToken: String
)
