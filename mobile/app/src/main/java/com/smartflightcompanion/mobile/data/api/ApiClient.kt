package com.smartflightcompanion.mobile.data.api

import com.google.gson.JsonElement
import com.google.gson.JsonParser
import com.smartflightcompanion.mobile.BuildConfig
import com.smartflightcompanion.mobile.data.AuthSessionStore
import okhttp3.OkHttpClient
import retrofit2.HttpException
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

/** Error returned by the backend; [message] is the server-provided text when available. */
class ApiException(message: String?, val status: Int) : Exception(message)

object ApiClient {
    private const val CONNECT_TIMEOUT_SECONDS = 15L
    private const val READ_TIMEOUT_SECONDS = 30L

    private val baseHttpClient: OkHttpClient by lazy {
        OkHttpClient.Builder()
            .connectTimeout(CONNECT_TIMEOUT_SECONDS, TimeUnit.SECONDS)
            .readTimeout(READ_TIMEOUT_SECONDS, TimeUnit.SECONDS)
            .build()
    }

    /** Used for login/register/refresh: never carries a bearer token and never retries on 401. */
    private val publicRetrofit: Retrofit by lazy { retrofit(baseHttpClient) }

    private val authorizedRetrofit: Retrofit by lazy {
        val client = baseHttpClient.newBuilder()
            .addInterceptor(BearerTokenInterceptor(AuthSessionStore))
            .authenticator(TokenRefreshAuthenticator(AuthSessionStore) { authApi })
            .build()
        retrofit(client)
    }

    val authApi: AuthApi by lazy { publicRetrofit.create(AuthApi::class.java) }
    val flightsApi: FlightsApi by lazy { authorizedRetrofit.create(FlightsApi::class.java) }
    val userApi: UserApi by lazy { authorizedRetrofit.create(UserApi::class.java) }
    val newsApi: NewsApi by lazy { authorizedRetrofit.create(NewsApi::class.java) }

    private fun retrofit(client: OkHttpClient): Retrofit =
        Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL)
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
}

/** Runs [block] and converts Retrofit HTTP errors into [ApiException]. */
suspend fun <T> apiCall(block: suspend () -> T): T =
    try {
        block()
    } catch (e: HttpException) {
        throw e.toApiException()
    }

/** Mirrors the web client's error extraction: message, first validation error, then title. */
fun HttpException.toApiException(): ApiException {
    val body = response()?.errorBody()?.string().orEmpty()
    val parsed = runCatching { JsonParser.parseString(body) }.getOrNull()
    return ApiException(parsed.extractMessage() ?: body.takeIf { it.isNotBlank() }, code())
}

private fun JsonElement?.extractMessage(): String? {
    if (this == null || !isJsonObject) return null
    val obj = asJsonObject
    obj.stringOrNull("message")?.let { return it }
    val firstValidationError = obj.get("errors")
        ?.takeIf { it.isJsonObject }
        ?.asJsonObject?.entrySet()
        ?.flatMap { entry -> entry.value.takeIf { it.isJsonArray }?.asJsonArray?.toList().orEmpty() }
        ?.firstNotNullOfOrNull { element -> element.takeIf { it.isJsonPrimitive }?.asString?.takeIf { it.isNotBlank() } }
    return firstValidationError ?: obj.stringOrNull("title")
}

private fun com.google.gson.JsonObject.stringOrNull(key: String): String? =
    get(key)?.takeIf { it.isJsonPrimitive }?.asString?.takeIf { it.isNotBlank() }
