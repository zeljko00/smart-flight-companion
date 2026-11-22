package com.smartflightcompanion.mobile.ui.screens.welcome

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.smartflightcompanion.mobile.data.AuthRepository
import com.smartflightcompanion.mobile.data.api.LoginRequest
import com.smartflightcompanion.mobile.data.api.UserDto
import com.smartflightcompanion.mobile.domain.PasswordError
import com.smartflightcompanion.mobile.domain.CredentialsValidator
import com.smartflightcompanion.mobile.domain.UsernameError
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

private const val ROLE_ADMIN = "admin"
private const val ROLE_USER = "user"
private const val ROLE_GUEST = "guest"

enum class LoginStatus { None, PendingApproval, Failure }

data class LoginUiState(
    val username: String = "",
    val password: String = "",
    val usernameError: UsernameError? = null,
    val passwordError: PasswordError? = null,
    val isSubmitting: Boolean = false,
    val status: LoginStatus = LoginStatus.None
)

class LoginViewModel(
    private val repository: AuthRepository = AuthRepository()
) : ViewModel() {

    private val _state = MutableStateFlow(LoginUiState())
    val state: StateFlow<LoginUiState> = _state.asStateFlow()

    private val _loggedIn = Channel<UserDto>(Channel.BUFFERED)
    val loggedIn: Flow<UserDto> = _loggedIn.receiveAsFlow()

    fun onUsernameChange(value: String) = _state.update {
        it.copy(username = value, usernameError = CredentialsValidator.validateUsername(value))
    }

    fun onPasswordChange(value: String) = _state.update {
        it.copy(password = value, passwordError = CredentialsValidator.validatePassword(value))
    }

    fun onUsernameFocusLost() = _state.update {
        it.copy(usernameError = CredentialsValidator.validateUsername(it.username))
    }

    fun onPasswordFocusLost() = _state.update {
        it.copy(passwordError = CredentialsValidator.validatePassword(it.password))
    }

    fun submit() {
        val current = _state.value
        if (current.isSubmitting) return

        _state.update {
            it.copy(
                usernameError = CredentialsValidator.validateUsername(current.username),
                passwordError = CredentialsValidator.validatePassword(current.password),
                status = LoginStatus.None,
                isSubmitting = true
            )
        }

        viewModelScope.launch {
            val result = runCatching {
                repository.login(LoginRequest(username = current.username.trim(), password = current.password))
            }
            val user = result.getOrNull()
            val status = when {
                user == null || !user.isActive -> LoginStatus.Failure
                user.role.equals(ROLE_GUEST, ignoreCase = true) -> LoginStatus.PendingApproval
                user.role.equals(ROLE_USER, ignoreCase = true) ||
                    user.role.equals(ROLE_ADMIN, ignoreCase = true) -> LoginStatus.None
                else -> LoginStatus.Failure
            }
            _state.update { it.copy(isSubmitting = false, status = status) }
            if (user != null && status == LoginStatus.None) {
                _loggedIn.send(user)
            }
        }
    }
}
