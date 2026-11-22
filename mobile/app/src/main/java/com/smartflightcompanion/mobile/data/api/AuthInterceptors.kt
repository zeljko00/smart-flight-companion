package com.smartflightcompanion.mobile.data.api

import com.smartflightcompanion.mobile.data.AuthSessionStore
import okhttp3.Authenticator
import okhttp3.Interceptor
import okhttp3.Request
import okhttp3.Response
import okhttp3.Route

private const val AUTHORIZATION_HEADER = "Authorization"
private const val BEARER_PREFIX = "Bearer "
private const val REFRESH_COOKIE_NAME = "sfc_refresh_token"

internal class BearerTokenInterceptor(private val sessionStore: AuthSessionStore) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val token = sessionStore.session.value?.accessToken
        val request = if (token.isNullOrBlank()) {
            chain.request()
        } else {
            chain.request().newBuilder().header(AUTHORIZATION_HEADER, BEARER_PREFIX + token).build()
        }
        return chain.proceed(request)
    }
}

internal class TokenRefreshAuthenticator(
    private val sessionStore: AuthSessionStore,
    private val authApiProvider: () -> AuthApi
) : Authenticator {

    private val lock = Any()

    override fun authenticate(route: Route?, response: Response): Request? {
        if (response.priorResponse != null) return null
        val failedToken = response.request.header(AUTHORIZATION_HEADER)?.removePrefix(BEARER_PREFIX)
            ?: return null

        synchronized(lock) {
            val session = sessionStore.session.value ?: return null
            if (session.accessToken != failedToken) {
                return response.request.withBearer(session.accessToken)
            }

            val refreshed = runCatching {
                authApiProvider().refresh("$REFRESH_COOKIE_NAME=${session.refreshToken}").execute()
            }.getOrNull()?.takeIf { it.isSuccessful }?.body()

            if (refreshed == null) {
                sessionStore.clear()
                return null
            }
            sessionStore.set(refreshed)
            return response.request.withBearer(refreshed.accessToken)
        }
    }

    private fun Request.withBearer(token: String): Request =
        newBuilder().header(AUTHORIZATION_HEADER, BEARER_PREFIX + token).build()
}
