package com.smartflightcompanion.mobile.data

import com.smartflightcompanion.mobile.data.api.AuthenticationResultDto
import com.smartflightcompanion.mobile.data.api.UserDto
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

data class AuthSession(
    val user: UserDto,
    val accessToken: String,
    val refreshToken: String
)

object AuthSessionStore {
    private val _session = MutableStateFlow<AuthSession?>(null)
    val session: StateFlow<AuthSession?> = _session.asStateFlow()

    fun set(result: AuthenticationResultDto) {
        _session.value = AuthSession(result.user, result.accessToken, result.refreshToken)
    }

    fun clear() {
        _session.value = null
    }
}
