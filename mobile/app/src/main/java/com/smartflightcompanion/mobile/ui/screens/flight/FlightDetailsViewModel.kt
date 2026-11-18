package com.smartflightcompanion.mobile.ui.screens.flight

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.smartflightcompanion.mobile.data.FlightsRepository
import com.smartflightcompanion.mobile.domain.model.BoardingGuide
import com.smartflightcompanion.mobile.domain.model.CityWeather
import com.smartflightcompanion.mobile.domain.model.FlightDetails
import com.smartflightcompanion.mobile.domain.model.SeatClass
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

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
    val selectedSeat: SeatClass? = null
)

class FlightDetailsViewModel @JvmOverloads constructor(
    savedStateHandle: SavedStateHandle,
    private val repository: FlightsRepository = FlightsRepository()
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
            val flight = runCatching { repository.getById(flightId) }
            flight.exceptionOrNull()?.let { if (it is CancellationException) throw it }
            _state.update { current ->
                current.copy(
                    flight = flight.fold(
                        onSuccess = { it?.let(FlightLoadState::Loaded) ?: FlightLoadState.NotFound },
                        onFailure = { FlightLoadState.Error }
                    ),
                    selectedSeat = flight.getOrNull()?.prices?.keys?.firstOrNull()
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
        }
    }

    fun selectSeat(seat: SeatClass) = _state.update { it.copy(selectedSeat = seat) }
}
