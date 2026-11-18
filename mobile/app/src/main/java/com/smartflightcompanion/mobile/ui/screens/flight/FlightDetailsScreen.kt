package com.smartflightcompanion.mobile.ui.screens.flight

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.smartflightcompanion.mobile.R
import com.smartflightcompanion.mobile.domain.model.AirportDetails
import com.smartflightcompanion.mobile.domain.model.BoardingGuide
import com.smartflightcompanion.mobile.domain.model.CityWeather
import com.smartflightcompanion.mobile.domain.model.WeatherCondition
import com.smartflightcompanion.mobile.domain.model.WeatherDay
import androidx.compose.material.icons.filled.AcUnit
import androidx.compose.material.icons.filled.Cloud
import androidx.compose.material.icons.filled.FilterDrama
import androidx.compose.material.icons.filled.Grain
import androidx.compose.material.icons.filled.Thunderstorm
import androidx.compose.material.icons.filled.Umbrella
import androidx.compose.material.icons.filled.WbSunny
import androidx.compose.ui.graphics.vector.ImageVector
import java.time.format.DateTimeFormatter
import java.time.format.FormatStyle
import java.text.NumberFormat
import java.util.Locale
import com.smartflightcompanion.mobile.domain.model.FlightDetails
import com.smartflightcompanion.mobile.domain.model.SeatClass
import com.smartflightcompanion.mobile.ui.components.AppHeader
import com.smartflightcompanion.mobile.ui.components.SfcDropdownField
import com.smartflightcompanion.mobile.ui.components.SfcPanel
import com.smartflightcompanion.mobile.ui.components.StatusPill
import com.smartflightcompanion.mobile.ui.components.StatusText
import com.smartflightcompanion.mobile.ui.format.currentLocale
import com.smartflightcompanion.mobile.ui.format.formatDateTime
import com.smartflightcompanion.mobile.ui.format.formatEuro
import com.smartflightcompanion.mobile.ui.screens.home.flightStatusLabel
import com.smartflightcompanion.mobile.ui.theme.Spacing
import java.time.Duration
import java.time.OffsetDateTime

@Composable
fun FlightDetailsScreen(
    onBack: () -> Unit,
    viewModel: FlightDetailsViewModel = viewModel()
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .safeDrawingPadding()
            .verticalScroll(rememberScrollState())
            .padding(Spacing.md),
        verticalArrangement = Arrangement.spacedBy(Spacing.md)
    ) {
        AppHeader()
        TextButton(onClick = onBack) {
            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null)
            Text(
                text = stringResource(R.string.flight_details_back),
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(start = Spacing.sm)
            )
        }
        when (val load = state.flight) {
            FlightLoadState.Loading -> Loading(stringResource(R.string.flight_details_loading))
            FlightLoadState.NotFound -> StatusText(stringResource(R.string.flight_details_not_found), isError = true)
            FlightLoadState.Error -> {
                StatusText(stringResource(R.string.flight_details_load_error), isError = true)
                TextButton(onClick = viewModel::load) { Text(stringResource(R.string.flight_details_retry)) }
            }
            is FlightLoadState.Loaded -> {
                OverviewSection(load.flight)
                TechnicalSection(load.flight)
                ScheduleSection(load.flight)
                PricingSection(load.flight)
                AirportsSection(load.flight)
                GuidesSection(state.guides)
                WeatherSection(state.weather)
                PurchaseSection(load.flight, state.selectedSeat, viewModel::selectSeat)
            }
        }
    }
}

@Composable
private fun Loading(text: String) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(Spacing.sm),
        verticalAlignment = Alignment.CenterVertically
    ) {
        CircularProgressIndicator(modifier = Modifier.padding(Spacing.xs))
        Text(text, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
private fun DetailRow(label: String, value: String) {
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(
            text = label,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.weight(1f)
        )
        Text(
            text = value,
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.SemiBold,
            color = MaterialTheme.colorScheme.onSurface,
            textAlign = TextAlign.End,
            modifier = Modifier.weight(1f)
        )
    }
}

@Composable
private fun OverviewSection(flight: FlightDetails) {
    SfcPanel {
        Text(
            text = stringResource(R.string.flight_details_title),
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface
        )
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = flight.flightNumber,
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary
            )
            StatusPill(flightStatusLabel(flight.status))
        }
        DetailRow(
            stringResource(R.string.flight_details_airline),
            "${flight.airline} · ${flight.aircraft}"
        )
        DetailRow(
            stringResource(R.string.flight_details_route),
            "${flight.departureAirport.iata} → ${flight.arrivalAirport.iata}"
        )
    }
}

@Composable
private fun TechnicalSection(flight: FlightDetails) {
    SfcPanel(title = stringResource(R.string.flight_details_technical)) {
        DetailRow(stringResource(R.string.flight_details_terminal), flight.terminal?.toString() ?: TBD)
        DetailRow(stringResource(R.string.flight_details_gate), flight.gate)
        DetailRow(stringResource(R.string.flight_details_aircraft), flight.aircraft)
        DetailRow(stringResource(R.string.flight_details_seat_capacity), flight.seatCapacity?.toString() ?: TBD)
        DetailRow(stringResource(R.string.flight_details_seats_free), flight.seatsFree?.toString() ?: TBD)
    }
}

@Composable
private fun ScheduleSection(flight: FlightDetails) {
    val locale = currentLocale()
    fun OffsetDateTime?.text() = this?.formatDateTime(locale) ?: TBD
    SfcPanel(title = stringResource(R.string.flight_details_schedule)) {
        DetailRow(stringResource(R.string.flight_details_scheduled_departure), flight.scheduledDeparture.text())
        DetailRow(stringResource(R.string.flight_details_scheduled_arrival), flight.scheduledArrival.text())
        DetailRow(stringResource(R.string.flight_details_actual_departure), flight.departure.text())
        DetailRow(stringResource(R.string.flight_details_actual_arrival), flight.arrival.text())
        DetailRow(
            stringResource(R.string.flight_details_duration),
            flight.duration?.let { formatDuration(it) } ?: TBD
        )
    }
}

@Composable
private fun PricingSection(flight: FlightDetails) {
    val locale = currentLocale()
    SfcPanel(title = stringResource(R.string.flight_details_pricing)) {
        SeatClass.entries.forEach { seat ->
            DetailRow(
                label = stringResource(seat.labelRes()),
                value = flight.prices[seat]?.formatEuro(locale) ?: stringResource(R.string.flight_details_no_price)
            )
        }
    }
}

@Composable
private fun AirportsSection(flight: FlightDetails) {
    SfcPanel(title = stringResource(R.string.flight_details_airports)) {
        AirportBlock(stringResource(R.string.flight_details_departure_airport), flight.departureAirport)
        AirportBlock(stringResource(R.string.flight_details_arrival_airport), flight.arrivalAirport)
    }
}

@Composable
private fun AirportBlock(label: String, airport: AirportDetails) {
    Column(verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
        Text(label, style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(
            text = "${airport.iata} · ${airport.name}",
            style = MaterialTheme.typography.bodyLarge,
            fontWeight = FontWeight.SemiBold,
            color = MaterialTheme.colorScheme.onSurface
        )
        Text(airport.address, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
private fun GuidesSection(state: GuidesState) {
    SfcPanel(title = stringResource(R.string.flight_details_guides)) {
        when (state) {
            GuidesState.Loading -> Loading(stringResource(R.string.flight_details_guides_loading))
            GuidesState.Error -> StatusText(stringResource(R.string.flight_details_guides_error), isError = true)
            is GuidesState.Loaded ->
                if (state.guides.isEmpty()) {
                    StatusText(stringResource(R.string.flight_details_guides_empty))
                } else {
                    state.guides.forEach { GuideItem(it) }
                }
        }
    }
}

@Composable
private fun WeatherSection(state: WeatherState) {
    SfcPanel(title = stringResource(R.string.flight_details_weather)) {
        when (state) {
            WeatherState.Loading -> Loading(stringResource(R.string.flight_details_weather_loading))
            WeatherState.Error -> StatusText(stringResource(R.string.flight_details_weather_error), isError = true)
            is WeatherState.Loaded ->
                if (state.cities.isEmpty()) {
                    StatusText(stringResource(R.string.flight_details_weather_empty))
                } else {
                    state.cities.forEach { CityWeatherBlock(it) }
                }
        }
    }
}

@Composable
private fun CityWeatherBlock(city: CityWeather) {
    Column(verticalArrangement = Arrangement.spacedBy(Spacing.sm)) {
        Row(horizontalArrangement = Arrangement.spacedBy(Spacing.sm), verticalAlignment = Alignment.CenterVertically) {
            Text(
                text = city.city,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface
            )
            Text(city.country, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        city.days.forEach { WeatherDayRow(it) }
    }
}

@Composable
private fun WeatherDayRow(day: WeatherDay) {
    val locale = currentLocale()
    val dateText = day.date?.format(
        DateTimeFormatter.ofLocalizedDate(FormatStyle.MEDIUM).withLocale(locale)
    ) ?: day.dateText
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(Spacing.sm),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            imageVector = day.condition.icon(),
            contentDescription = null,
            tint = MaterialTheme.colorScheme.primary
        )
        Column(modifier = Modifier.weight(1f)) {
            Text(dateText, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurface)
            Text(
                text = stringResource(day.condition.labelRes()),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
        Text(
            text = stringResource(
                R.string.flight_details_weather_range,
                formatTemperature(day.minCelsius, locale),
                formatTemperature(day.maxCelsius, locale)
            ),
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurface
        )
    }
}

private fun formatTemperature(value: Double, locale: Locale): String =
    NumberFormat.getNumberInstance(locale).apply {
        minimumFractionDigits = 0
        maximumFractionDigits = 1
    }.format(value)

private fun WeatherCondition.icon(): ImageVector = when (this) {
    WeatherCondition.ClearSky -> Icons.Filled.WbSunny
    WeatherCondition.MainlyClear, WeatherCondition.PartlyCloudy -> Icons.Filled.FilterDrama
    WeatherCondition.Overcast, WeatherCondition.Fog, WeatherCondition.Unknown -> Icons.Filled.Cloud
    WeatherCondition.Drizzle -> Icons.Filled.Grain
    WeatherCondition.Rain -> Icons.Filled.Umbrella
    WeatherCondition.Snow -> Icons.Filled.AcUnit
    WeatherCondition.Thunderstorm -> Icons.Filled.Thunderstorm
}

private fun WeatherCondition.labelRes(): Int = when (this) {
    WeatherCondition.ClearSky -> R.string.weather_clear_sky
    WeatherCondition.MainlyClear -> R.string.weather_mainly_clear
    WeatherCondition.PartlyCloudy -> R.string.weather_partly_cloudy
    WeatherCondition.Overcast -> R.string.weather_overcast
    WeatherCondition.Fog -> R.string.weather_fog
    WeatherCondition.Drizzle -> R.string.weather_drizzle
    WeatherCondition.Rain -> R.string.weather_rain
    WeatherCondition.Snow -> R.string.weather_snow
    WeatherCondition.Thunderstorm -> R.string.weather_thunderstorm
    WeatherCondition.Unknown -> R.string.weather_unknown
}

@Composable
private fun GuideItem(guide: BoardingGuide) {
    val locale = currentLocale()
    val uriHandler = LocalUriHandler.current
    Column(verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
        if (guide.description.isNotBlank()) {
            Text(guide.description, style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurface)
        }
        guide.closesAt?.let { closesAt ->
            DetailRow(stringResource(R.string.flight_details_guide_closes_at), closesAt.formatDateTime(locale))
            DetailRow(stringResource(R.string.flight_details_guide_closes_in), closesInText(closesAt))
        }
        guide.imageUrls.forEachIndexed { index, url ->
            TextButton(onClick = { uriHandler.openUri(url) }) {
                Text(stringResource(R.string.flight_details_guide_image, index + 1))
            }
        }
        guide.videoUrls.forEach { url ->
            TextButton(onClick = { uriHandler.openUri(url) }) {
                Text(stringResource(R.string.flight_details_guide_video))
            }
        }
    }
}

@Composable
private fun closesInText(closesAt: OffsetDateTime): String {
    val remaining = Duration.between(OffsetDateTime.now(), closesAt)
    val totalMinutes = remaining.toMinutes()
    val hours = remaining.toHours()
    val days = remaining.toDays()
    return when {
        totalMinutes <= 0 -> stringResource(R.string.flight_details_guide_closing_now)
        days > 0 -> stringResource(R.string.flight_details_guide_days_hours, days, hours % HOURS_PER_DAY)
        hours > 0 -> stringResource(R.string.flight_details_guide_hours_minutes, hours, totalMinutes % MINUTES_PER_HOUR)
        else -> stringResource(R.string.flight_details_guide_minutes, totalMinutes)
    }
}

@Composable
private fun PurchaseSection(flight: FlightDetails, selected: SeatClass?, onSelect: (SeatClass) -> Unit) {
    val locale = currentLocale()
    SfcPanel(title = stringResource(R.string.flight_details_purchase)) {
        if (selected == null) {
            StatusText(stringResource(R.string.flight_details_purchase_unavailable))
            return@SfcPanel
        }
        var showNotice by rememberSaveable { mutableStateOf(false) }
        SfcDropdownField(
            label = stringResource(R.string.flight_details_seat_type),
            selected = selected,
            options = flight.prices.keys.toList(),
            optionLabel = { stringResource(it.labelRes()) },
            onSelected = {
                showNotice = false
                onSelect(it)
            }
        )
        DetailRow(
            stringResource(R.string.flight_details_selected_price),
            flight.prices[selected]?.formatEuro(locale).orEmpty()
        )
        DetailRow(
            stringResource(R.string.flight_details_seats_left),
            "${flight.seatsFree ?: "?"}/${flight.seatCapacity ?: "?"}"
        )
        if (flight.isSoldOut) StatusText(stringResource(R.string.flight_details_sold_out), isError = true)
        Button(
            onClick = { showNotice = true },
            enabled = !flight.isSoldOut,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text(stringResource(R.string.flight_details_buy))
        }
        if (showNotice) StatusText(stringResource(R.string.flight_details_purchase_not_connected))
    }
}

@Composable
private fun formatDuration(duration: Duration): String {
    val hours = duration.toHours()
    val minutes = duration.toMinutes() % MINUTES_PER_HOUR
    return if (hours == 0L) {
        stringResource(R.string.flight_details_duration_minutes, minutes)
    } else {
        stringResource(R.string.flight_details_duration_hours_minutes, hours, minutes)
    }
}

private fun SeatClass.labelRes(): Int = when (this) {
    SeatClass.Economy -> R.string.home_seat_economy
    SeatClass.PremiumEconomy -> R.string.home_seat_premium_economy
    SeatClass.Business -> R.string.home_seat_business
    SeatClass.FirstClass -> R.string.home_seat_first_class
}

private const val TBD = "TBD"
private const val HOURS_PER_DAY = 24
private const val MINUTES_PER_HOUR = 60
