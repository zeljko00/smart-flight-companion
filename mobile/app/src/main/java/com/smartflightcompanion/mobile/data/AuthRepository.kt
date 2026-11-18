package com.smartflightcompanion.mobile.data

import com.smartflightcompanion.mobile.data.api.ApiClient
import com.smartflightcompanion.mobile.data.api.AuthApi
import com.smartflightcompanion.mobile.data.api.AuthenticationResultDto
import com.smartflightcompanion.mobile.data.api.LoginRequest
import com.smartflightcompanion.mobile.data.api.RegisterRequest
import com.smartflightcompanion.mobile.data.api.UserApi
import com.smartflightcompanion.mobile.data.api.UserDto
import com.smartflightcompanion.mobile.data.api.toApiException
import kotlinx.coroutines.CancellationException
import retrofit2.HttpException

class AuthRepository(
    private val api: AuthApi = ApiClient.authApi,
    private val userApi: UserApi = ApiClient.userApi,
    private val sessionStore: AuthSessionStore = AuthSessionStore
) {

    suspend fun login(request: LoginRequest): UserDto = authenticate { api.login(request) }

    suspend fun register(request: RegisterRequest): UserDto = authenticate { api.register(request) }

    /** Best-effort server logout; the local session is always cleared. */
    suspend fun logout() {
        try {
            userApi.logout()
        } catch (e: CancellationException) {
            throw e
        } catch (_: Exception) {
            // Matches the web app: a failed server logout must not keep the user signed in.
        } finally {
            sessionStore.clear()
        }
    }

    private suspend fun authenticate(call: suspend () -> AuthenticationResultDto): UserDto {
        val result = try {
            call()
        } catch (e: HttpException) {
            throw e.toApiException()
        }
        sessionStore.set(result)
        return result.user
    }
}
