package com.smartflightcompanion.mobile.ui.screens.flight

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.smartflightcompanion.mobile.data.AuthSessionStore
import com.smartflightcompanion.mobile.data.FlightsRepository
import com.smartflightcompanion.mobile.domain.model.AiExchange
import com.smartflightcompanion.mobile.domain.model.BoardingGuide
import com.smartflightcompanion.mobile.domain.model.CityWeather
import com.smartflightcompanion.mobile.domain.model.FlightDetails
import com.smartflightcompanion.mobile.domain.model.FlightComment
import com.smartflightcompanion.mobile.domain.model.SeatClass
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.time.OffsetDateTime

sealed interface FlightLoadState {
    data object Loading : FlightLoadState
    data object NotFound : FlightLoadState
    data object Error : FlightLoadState
    data class Loaded(val flight: FlightDetails) : FlightLoadState
}

sealed interface GuidesState {
    data object Loading : GuidesState
    data object Error : GuidesState
    data class Loaded(val guides: List<BoardingGuide>) : GuidesState
}

sealed interface WeatherState {
    data object Loading : WeatherState
    data object Error : WeatherState
    data class Loaded(val cities: List<CityWeather>) : WeatherState
}

data class FlightDetailsUiState(
    val flight: FlightLoadState = FlightLoadState.Loading,
    val guides: GuidesState = GuidesState.Loading,
    val weather: WeatherState = WeatherState.Loading,
    val selectedSeat: SeatClass? = null,
    val comments: CommentsState = CommentsState.Loading,
    val commentDraft: String = "",
    val commentSubmitError: CommentSubmitError? = null,
    val isSubmittingComment: Boolean = false,
    val aiAssistant: AiAssistantState = AiAssistantState()
)

data class AiAssistantState(
    val isAvailable: Boolean = false,
    val exchanges: List<AiExchange> = emptyList(),
    val draft: String = "",
    val submitError: AiSubmitError? = null,
    val isSubmitting: Boolean = false
)

enum class AiSubmitError {
    Empty,
    Failed
}

sealed interface CommentsState {
    data object Loading : CommentsState
    data object Error : CommentsState
    data class Loaded(val comments: List<FlightComment>) : CommentsState
}

enum class CommentSubmitError {
    Empty,
    Failed
}

class FlightDetailsViewModel @JvmOverloads constructor(
    savedStateHandle: SavedStateHandle,
    private val repository: FlightsRepository = FlightsRepository(),
    private val sessionStore: AuthSessionStore = AuthSessionStore
) : ViewModel() {
    private val flightId: String = checkNotNull(savedStateHandle["flightId"])

    private val _state = MutableStateFlow(FlightDetailsUiState())
    val state: StateFlow<FlightDetailsUiState> = _state.asStateFlow()

    init {
        load()
    }

    fun load() {
        _state.value = FlightDetailsUiState()
        viewModelScope.launch {
            val guides = async { runCatching { repository.getBoardingGuides(flightId) } }
            val comments = async { runCatching { repository.getComments(flightId) } }
            val flight = runCatching { repository.getById(flightId) }
            flight.exceptionOrNull()?.let { if (it is CancellationException) throw it }
            _state.update { current ->
                current.copy(
                    flight = flight.fold(
                        onSuccess = { it?.let(FlightLoadState::Loaded) ?: FlightLoadState.NotFound },
                        onFailure = { FlightLoadState.Error }
                    ),
                    selectedSeat = flight.getOrNull()?.prices?.keys?.firstOrNull(),
                    aiAssistant = AiAssistantState(
                        isAvailable = isAiAssistantAvailable(),
                        exchanges = flight.getOrNull()?.aiExchanges.orEmpty()
                    )
                )
            }
            val arrival = flight.getOrNull()?.arrivalAirport
            val latitude = arrival?.latitude
            val longitude = arrival?.longitude
            if (latitude != null && longitude != null) {
                launch {
                    val weather = runCatching { repository.getDestinationWeather(latitude, longitude) }
                    weather.exceptionOrNull()?.let { if (it is CancellationException) throw it }
                    _state.update {
                        it.copy(weather = weather.fold({ list -> WeatherState.Loaded(list) }, { WeatherState.Error }))
                    }
                }
            } else {
                _state.update { it.copy(weather = WeatherState.Loaded(emptyList())) }
            }
            val result = guides.await()
            _state.update {
                it.copy(guides = result.fold({ list -> GuidesState.Loaded(list) }, { GuidesState.Error }))
            }
            val commentsResult = comments.await()
            _state.update {
                it.copy(comments = commentsResult.fold({ list -> CommentsState.Loaded(list) }, { CommentsState.Error }))
            }
        }
    }

    fun selectSeat(seat: SeatClass) = _state.update { it.copy(selectedSeat = seat) }

    fun updateCommentDraft(value: String) {
        _state.update { it.copy(commentDraft = value, commentSubmitError = null) }
    }

    fun submitComment() {
        val content = _state.value.commentDraft.trim()
        if (content.isEmpty()) {
            _state.update { it.copy(commentSubmitError = CommentSubmitError.Empty) }
            return
        }

        _state.update { it.copy(isSubmittingComment = true, commentSubmitError = null) }
        viewModelScope.launch {
            val result = runCatching { repository.createComment(flightId, content) }
            _state.update { current ->
                result.fold(
                    onSuccess = { comment ->
                        val existing = (current.comments as? CommentsState.Loaded)?.comments.orEmpty()
                        current.copy(
                            comments = CommentsState.Loaded(existing + comment),
                            commentDraft = "",
                            isSubmittingComment = false
                        )
                    },
                    onFailure = {
                        current.copy(
                            commentSubmitError = CommentSubmitError.Failed,
                            isSubmittingComment = false
                        )
                    }
                )
            }
        }
    }

    fun updateAiDraft(value: String) = updateAiAssistant {
        it.copy(draft = value.take(MAX_AI_QUESTION_LENGTH), submitError = null)
    }

    fun askAiAssistant() {
        val current = _state.value.aiAssistant
        if (current.isSubmitting) return
        val query = current.draft.trim()
        if (query.isEmpty()) {
            updateAiAssistant { it.copy(submitError = AiSubmitError.Empty) }
            return
        }

        updateAiAssistant { it.copy(isSubmitting = true, submitError = null) }
        viewModelScope.launch {
            val result = runCatching { repository.askAdvice(flightId, query) }
            result.exceptionOrNull()?.let { if (it is CancellationException) throw it }
            updateAiAssistant { assistant ->
                result.fold(
                    onSuccess = { advice ->
                        val exchange = AiExchange(
                            id = "local-${System.currentTimeMillis()}",
                            request = query,
                            response = advice,
                            timestamp = OffsetDateTime.now()
                        )
                        assistant.copy(exchanges = assistant.exchanges + exchange, draft = "", isSubmitting = false)
                    },
                    onFailure = { assistant.copy(submitError = AiSubmitError.Failed, isSubmitting = false) }
                )
            }
        }
    }

    private fun updateAiAssistant(transform: (AiAssistantState) -> AiAssistantState) =
        _state.update { it.copy(aiAssistant = transform(it.aiAssistant)) }

    private fun isAiAssistantAvailable(): Boolean =
        sessionStore.session.value?.user?.role?.equals(ADMIN_ROLE, ignoreCase = true) != true

    private companion object {
        const val ADMIN_ROLE = "admin"
        const val MAX_AI_QUESTION_LENGTH = 1200
    }
}
