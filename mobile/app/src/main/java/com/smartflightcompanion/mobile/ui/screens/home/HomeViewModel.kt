package com.smartflightcompanion.mobile.ui.screens.home

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.smartflightcompanion.mobile.data.AuthRepository
import com.smartflightcompanion.mobile.data.AuthSessionStore
import com.smartflightcompanion.mobile.data.BoardingPassesRepository
import com.smartflightcompanion.mobile.data.DownloadsSaver
import com.smartflightcompanion.mobile.data.FlightsRepository
import com.smartflightcompanion.mobile.data.NewsRepository
import com.smartflightcompanion.mobile.data.NotificationsClient
import com.smartflightcompanion.mobile.data.SystemNotifier
import com.smartflightcompanion.mobile.data.api.UserDto
import com.smartflightcompanion.mobile.domain.model.BoardingPass
import com.smartflightcompanion.mobile.domain.model.FlightPage
import com.smartflightcompanion.mobile.domain.model.FlightSearchFilters
import com.smartflightcompanion.mobile.domain.model.FlightSummary
import com.smartflightcompanion.mobile.domain.model.NewsArticle
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.io.File
import java.time.LocalDate

const val DEFAULT_PAGE_SIZE = 20
val PAGE_SIZE_OPTIONS = listOf(2, 5, 10, 20, 50)
private const val NEWS_COUNT = 6
private const val BOARDING_PASS_CACHE_DIR = "boarding-passes"

enum class SearchMode { Filters, Semantic }

/** Editable filter inputs, kept as raw text like the web form. */
data class FilterInputs(
    val semanticQuery: String = "",
    val airline: String = "",
    val start: String = "",
    val destination: String = "",
    val departureDate: LocalDate? = LocalDate.now(),
    val maxPrice: String = "",
    val status: String? = null
)

data class FlightsState(
    val items: List<FlightSummary> = emptyList(),
    val page: Int = 1,
    val pageSize: Int = DEFAULT_PAGE_SIZE,
    val totalCount: Int = 0,
    val hasNextPage: Boolean = false,
    val isLoading: Boolean = true,
    val hasError: Boolean = false
) {
    val totalPages: Int get() = maxOf(1, (totalCount + pageSize - 1) / pageSize)
    val canGoPrevious: Boolean get() = !isLoading && page > 1
    val canGoNext: Boolean get() = !isLoading && items.isNotEmpty() && hasNextPage && page * pageSize < totalCount
}

data class BoardingPassesState(
    val items: List<BoardingPass> = emptyList(),
    val isLoading: Boolean = true,
    val hasError: Boolean = false,
    val downloadingId: String? = null,
    val downloadError: DownloadError? = null
)

enum class DownloadError { Failed, NoViewer }

data class NewsState(
    val items: List<NewsArticle> = emptyList(),
    val isLoading: Boolean = true,
    val hasError: Boolean = false
)

data class HomeUiState(
    val isFilterPanelOpen: Boolean = false,
    val filters: FilterInputs = FilterInputs(),
    val flights: FlightsState = FlightsState(),
    val boardingPasses: BoardingPassesState = BoardingPassesState(),
    val news: NewsState = NewsState()
)

sealed interface HomeEvent {
    data class OpenPdf(val file: File, val savedToDownloads: Boolean) : HomeEvent
}

class HomeViewModel(
    application: Application,
    private val flightsRepository: FlightsRepository,
    private val boardingPassesRepository: BoardingPassesRepository,
    private val newsRepository: NewsRepository,
    private val authRepository: AuthRepository
) : AndroidViewModel(application) {

    constructor(application: Application) : this(
        application,
        FlightsRepository(),
        BoardingPassesRepository(),
        NewsRepository(),
        AuthRepository()
    )

    /** Null once the session ends (logout or failed token refresh). */
    val user: StateFlow<UserDto?> = AuthSessionStore.session
        .map { it?.user }
        .stateIn(viewModelScope, SharingStarted.Eagerly, AuthSessionStore.session.value?.user)

    private val _state = MutableStateFlow(HomeUiState())
    val state: StateFlow<HomeUiState> = _state.asStateFlow()

    private val _events = Channel<HomeEvent>(Channel.BUFFERED)
    val events: Flow<HomeEvent> = _events.receiveAsFlow()

    /** Filters/query the current results were loaded with; reused for pagination. */
    private var searchMode = SearchMode.Filters
    private var appliedFilters = FlightSearchFilters(departureDate = LocalDate.now())
    private var appliedQuery = ""
    private var flightsJob: Job? = null

    private val notifier = SystemNotifier(application)
    private val notificationsClient = NotificationsClient(notifier::show)

    init {
        loadFlights(page = 1)
        loadBoardingPasses()
        loadNews()
    }

    fun toggleFilterPanel() = _state.update { it.copy(isFilterPanelOpen = !it.isFilterPanelOpen) }

    fun onSemanticQueryChange(value: String) = updateFilters { it.copy(semanticQuery = value) }
    fun onAirlineChange(value: String) = updateFilters { it.copy(airline = value) }
    fun onStartChange(value: String) = updateFilters { it.copy(start = value) }
    fun onDestinationChange(value: String) = updateFilters { it.copy(destination = value) }
    fun onStatusChange(value: String?) = updateFilters { it.copy(status = value) }

    fun onDepartureDateChange(value: LocalDate?) = updateFilters {
        val today = LocalDate.now()
        it.copy(departureDate = value?.let { date -> if (date.isBefore(today)) today else date })
    }

    fun onMaxPriceChange(value: String) {
        if (value.isEmpty() || value.matches(MAX_PRICE_INPUT)) updateFilters { it.copy(maxPrice = value) }
    }

    /** Mirrors the web form: a non-empty AI query takes precedence and clears the standard filters. */
    fun applyFilters() {
        val inputs = _state.value.filters
        val query = inputs.semanticQuery.trim()
        if (query.isNotEmpty()) {
            _state.update { it.copy(filters = FilterInputs(semanticQuery = inputs.semanticQuery, departureDate = null)) }
            searchMode = SearchMode.Semantic
            appliedQuery = query
        } else {
            val today = LocalDate.now()
            val departureDate = inputs.departureDate?.let { if (it.isBefore(today)) today else it }
            _state.update { it.copy(filters = inputs.copy(semanticQuery = "", departureDate = departureDate)) }
            searchMode = SearchMode.Filters
            appliedFilters = FlightSearchFilters(
                airline = inputs.airline,
                start = inputs.start,
                destination = inputs.destination,
                departureDate = departureDate,
                maxPrice = inputs.maxPrice.trim().replace(',', '.').toDoubleOrNull()?.takeIf { it >= 0 },
                status = inputs.status
            )
        }
        loadFlights(page = 1)
    }

    fun resetFilters() {
        val today = LocalDate.now()
        _state.update { it.copy(filters = FilterInputs(departureDate = today)) }
        searchMode = SearchMode.Filters
        appliedQuery = ""
        appliedFilters = FlightSearchFilters(departureDate = today)
        loadFlights(page = 1)
    }

    fun previousPage() {
        val flights = _state.value.flights
        if (flights.canGoPrevious) loadFlights(page = flights.page - 1)
    }

    fun nextPage() {
        val flights = _state.value.flights
        if (flights.canGoNext) loadFlights(page = flights.page + 1)
    }

    fun onPageSizeChange(size: Int) {
        if (size !in PAGE_SIZE_OPTIONS || _state.value.flights.isLoading) return
        loadFlights(page = 1, pageSize = size)
    }

    fun retryFlights() = loadFlights(page = _state.value.flights.page)

    fun downloadBoardingPass(id: String) {
        if (_state.value.boardingPasses.downloadingId != null) return
        updateBoardingPasses { it.copy(downloadingId = id, downloadError = null) }
        viewModelScope.launch {
            val directory = File(getApplication<Application>().cacheDir, BOARDING_PASS_CACHE_DIR)
            val result = runCatchingNonCancellation { boardingPassesRepository.downloadPdf(id, directory) }
            val file = result.getOrNull()
            val saved = file != null &&
                runCatchingNonCancellation { DownloadsSaver.savePdf(getApplication(), file) }.isSuccess
            updateBoardingPasses {
                it.copy(downloadingId = null, downloadError = if (result.isFailure) DownloadError.Failed else null)
            }
            file?.let { _events.send(HomeEvent.OpenPdf(it, savedToDownloads = saved)) }
        }
    }

    fun onPdfViewerMissing() = updateBoardingPasses { it.copy(downloadError = DownloadError.NoViewer) }

    fun logout() {
        notificationsClient.stop()
        viewModelScope.launch { authRepository.logout() }
    }

    override fun onCleared() {
        notificationsClient.stop()
    }

    private fun loadFlights(page: Int, pageSize: Int = _state.value.flights.pageSize) {
        flightsJob?.cancel()
        updateFlights { it.copy(isLoading = true, hasError = false, pageSize = pageSize) }
        val mode = searchMode
        flightsJob = viewModelScope.launch {
            val result = runCatchingNonCancellation {
                when (mode) {
                    SearchMode.Semantic -> flightsRepository.searchNaturalLanguage(appliedQuery, page, pageSize)
                    SearchMode.Filters -> flightsRepository.search(appliedFilters, page, pageSize)
                }
            }
            result.fold(
                onSuccess = { flightPage -> updateFlights { it.withPage(flightPage) } },
                onFailure = { updateFlights { it.copy(isLoading = false, hasError = true, hasNextPage = false) } }
            )
        }
    }

    private fun loadBoardingPasses() {
        viewModelScope.launch {
            val result = runCatchingNonCancellation { boardingPassesRepository.getMine() }
            user.value?.let { currentUser ->
                notificationsClient.updateSubscriptions(
                    currentUser.id,
                    result.getOrDefault(emptyList()).mapNotNull { it.flightId }
                )
            }
            updateBoardingPasses {
                it.copy(items = result.getOrDefault(emptyList()), isLoading = false, hasError = result.isFailure)
            }
        }
    }

    private fun loadNews() {
        viewModelScope.launch {
            val result = runCatchingNonCancellation { newsRepository.getLatest(NEWS_COUNT) }
            _state.update {
                it.copy(news = NewsState(items = result.getOrDefault(emptyList()), isLoading = false, hasError = result.isFailure))
            }
        }
    }

    private fun FlightsState.withPage(page: FlightPage) = copy(
        items = page.items,
        page = page.page,
        pageSize = page.pageSize,
        totalCount = page.totalCount,
        hasNextPage = page.hasNextPage,
        isLoading = false,
        hasError = false
    )

    private inline fun updateFilters(transform: (FilterInputs) -> FilterInputs) =
        _state.update { it.copy(filters = transform(it.filters)) }

    private inline fun updateFlights(transform: (FlightsState) -> FlightsState) =
        _state.update { it.copy(flights = transform(it.flights)) }

    private inline fun updateBoardingPasses(transform: (BoardingPassesState) -> BoardingPassesState) =
        _state.update { it.copy(boardingPasses = transform(it.boardingPasses)) }

    private companion object {
        val MAX_PRICE_INPUT = Regex("""\d{0,7}([.,]\d{0,2})?""")
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
