package com.smartflightcompanion.mobile.domain

enum class UsernameError { Required, Length, Invalid }

enum class PasswordError { Required, Length, Invalid }

object CredentialsValidator {
    private const val USERNAME_MIN = 12
    private const val USERNAME_MAX = 50
    private const val PASSWORD_MIN = 15
    private const val PASSWORD_MAX = 128
    private val FORBIDDEN_USERNAME_CHARS = setOf('@', '#', '/')

    fun validateUsername(value: String): UsernameError? = when {
        value.isBlank() -> UsernameError.Required
        value.length !in USERNAME_MIN..USERNAME_MAX -> UsernameError.Length
        value.any { it in FORBIDDEN_USERNAME_CHARS } -> UsernameError.Invalid
        else -> null
    }

    fun validatePassword(value: String): PasswordError? = when {
        value.isEmpty() -> PasswordError.Required
        value.length !in PASSWORD_MIN..PASSWORD_MAX -> PasswordError.Length
        !(value.any { it in 'a'..'z' } && value.any { it in 'A'..'Z' } && value.any { it in '0'..'9' }) ->
            PasswordError.Invalid
        else -> null
    }
}
