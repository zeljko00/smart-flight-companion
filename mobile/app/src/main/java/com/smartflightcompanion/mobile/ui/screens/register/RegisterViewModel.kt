package com.smartflightcompanion.mobile.ui.screens.register

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.smartflightcompanion.mobile.data.AuthRepository
import com.smartflightcompanion.mobile.data.api.ApiException
import com.smartflightcompanion.mobile.data.api.RegisterRequest
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

private const val USER_ROLE = "user"

sealed interface RegisterStatus {
    data object None : RegisterStatus
    data object PasswordMismatch : RegisterStatus
    /** [serverMessage] is null when the failure did not come from the backend. */
    data class Failure(val serverMessage: String?) : RegisterStatus
    data class Success(val name: String) : RegisterStatus
}

data class RegisterUiState(
    val firstName: String = "",
    val lastName: String = "",
    val username: String = "",
    val email: String = "",
    val password: String = "",
    val passwordConfirmation: String = "",
    val usernameError: UsernameError? = null,
    val passwordError: PasswordError? = null,
    val isSubmitting: Boolean = false,
    val status: RegisterStatus = RegisterStatus.None
)

class RegisterViewModel(
    private val repository: AuthRepository = AuthRepository()
) : ViewModel() {

    private val _state = MutableStateFlow(RegisterUiState())
    val state: StateFlow<RegisterUiState> = _state.asStateFlow()

    private val _registeredAsUser = Channel<Unit>(Channel.BUFFERED)
    /** Emits when the new account is an active USER and may go straight to Home. */
    val registeredAsUser: Flow<Unit> = _registeredAsUser.receiveAsFlow()

    fun onFirstNameChange(value: String) = _state.update { it.copy(firstName = value) }

    fun onLastNameChange(value: String) = _state.update { it.copy(lastName = value) }

    fun onEmailChange(value: String) = _state.update { it.copy(email = value) }

    fun onPasswordConfirmationChange(value: String) = _state.update { it.copy(passwordConfirmation = value) }

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

        val usernameError = CredentialsValidator.validateUsername(current.username)
        val passwordError = CredentialsValidator.validatePassword(current.password)
        _state.update {
            it.copy(usernameError = usernameError, passwordError = passwordError, status = RegisterStatus.None)
        }
        if (usernameError != null || passwordError != null) return

        if (current.password != current.passwordConfirmation) {
            _state.update { it.copy(status = RegisterStatus.PasswordMismatch) }
            return
        }

        _state.update { it.copy(isSubmitting = true) }
        viewModelScope.launch {
            val request = RegisterRequest(
                username = current.username.trim(),
                email = current.email.trim(),
                firstName = current.firstName.trim(),
                lastName = current.lastName.trim(),
                password = current.password
            )
            val result = runCatching { repository.register(request) }
            val user = result.getOrNull()
            if (user != null && user.isActive && user.role.equals(USER_ROLE, ignoreCase = true)) {
                _state.update { it.copy(isSubmitting = false, password = "", passwordConfirmation = "") }
                _registeredAsUser.send(Unit)
                return@launch
            }
            _state.update { state ->
                result.fold(
                    onSuccess = { user ->
                        state.copy(
                            isSubmitting = false,
                            password = "",
                            passwordConfirmation = "",
                            status = RegisterStatus.Success(user.firstName.ifBlank { user.username })
                        )
                    },
                    onFailure = { error ->
                        val serverMessage = (error as? ApiException)?.message
                        state.copy(isSubmitting = false, status = RegisterStatus.Failure(serverMessage))
                    }
                )
            }
        }
    }
}
