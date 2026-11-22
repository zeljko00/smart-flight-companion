package com.smartflightcompanion.mobile.data

import com.microsoft.signalr.HubConnection
import com.microsoft.signalr.HubConnectionBuilder
import com.microsoft.signalr.HubConnectionState
import com.smartflightcompanion.mobile.BuildConfig
import io.reactivex.rxjava3.core.Single
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

data class NotificationPayload(
    val title: String?,
    val message: String?,
    val timestamp: String?
)

private const val RECEIVE_METHOD = "ReceiveNotification"
private const val RECONNECT_DELAY_MS = 5_000L

class NotificationsClient(
    private val onNotification: (title: String, message: String) -> Unit
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val mutex = Mutex()
    private val hubUrl = BuildConfig.API_BASE_URL.trimEnd('/') + "/notifications"

    private var connection: HubConnection? = null
    private var reconnectJob: Job? = null
    private var userId: String? = null
    private var flightIds: Set<String> = emptySet()
    private var stopped = false

    fun updateSubscriptions(userId: String, flightIds: Collection<String>) {
        scope.launch {
            mutex.withLock {
                stopped = false
                val previousUserId = this@NotificationsClient.userId
                val previousFlights = this@NotificationsClient.flightIds
                this@NotificationsClient.userId = userId
                this@NotificationsClient.flightIds = flightIds.filter { it.isNotBlank() }.toSet()

                val hub = connection?.takeIf { it.connectionState == HubConnectionState.CONNECTED }
                if (hub == null) {
                    connectLocked()
                    return@withLock
                }
                runCatchingNonCancellation {
                    if (previousUserId != null && previousUserId != userId) hub.send("LeaveUserGroup", previousUserId)
                    (previousFlights - this@NotificationsClient.flightIds).forEach { hub.send("LeaveFlightGroup", it) }
                    if (previousUserId != userId) hub.send("JoinUserGroup", userId)
                    (this@NotificationsClient.flightIds - previousFlights).forEach { hub.send("JoinFlightGroup", it) }
                }
            }
        }
    }

    fun stop() {
        scope.launch {
            mutex.withLock {
                stopped = true
                reconnectJob?.cancel()
                connection?.let { hub -> runCatchingNonCancellation { hub.stop().blockingAwait() } }
                connection = null
            }
        }.invokeOnCompletion { scope.cancel() }
    }

    private fun connectLocked() {
        connection?.let { runCatchingNonCancellation { it.stop().blockingAwait() } }
        val hub = HubConnectionBuilder.create(hubUrl)
            .withAccessTokenProvider(Single.defer { Single.just(AuthSessionStore.session.value?.accessToken.orEmpty()) })
            .build()
        hub.on(RECEIVE_METHOD, { payload: NotificationPayload ->
            val title = payload.title?.trim().orEmpty()
            val message = payload.message?.trim().orEmpty()
            if (title.isNotEmpty() && message.isNotEmpty()) onNotification(title, message)
        }, NotificationPayload::class.java)
        hub.onClosed { if (!stopped) scheduleReconnect() }
        connection = hub

        val result = runCatchingNonCancellation {
            hub.start().blockingAwait()
            userId?.let { hub.send("JoinUserGroup", it) }
            flightIds.forEach { hub.send("JoinFlightGroup", it) }
        }
        if (result.isFailure && !stopped) scheduleReconnect()
    }

    private fun scheduleReconnect() {
        reconnectJob?.cancel()
        reconnectJob = scope.launch {
            delay(RECONNECT_DELAY_MS)
            mutex.withLock { if (!stopped) connectLocked() }
        }
    }
}

private inline fun <T> runCatchingNonCancellation(block: () -> T): Result<T> =
    try {
        Result.success(block())
    } catch (e: CancellationException) {
        throw e
    } catch (e: Exception) {
        Result.failure(e)
    }
