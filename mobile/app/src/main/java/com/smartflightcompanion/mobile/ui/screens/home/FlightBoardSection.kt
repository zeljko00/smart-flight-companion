package com.smartflightcompanion.mobile.ui.screens.home

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.PressInteraction
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.Euro
import androidx.compose.material.icons.filled.ExpandLess
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material.icons.filled.FilterList
import androidx.compose.material.icons.filled.Flight
import androidx.compose.material.icons.filled.FlightLand
import androidx.compose.material.icons.filled.FlightTakeoff
import androidx.compose.material.icons.filled.Info
import androidx.compose.material3.Button
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.SelectableDates
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.smartflightcompanion.mobile.R
import com.smartflightcompanion.mobile.domain.model.FlightStatus
import com.smartflightcompanion.mobile.domain.model.FlightSummary
import com.smartflightcompanion.mobile.ui.components.SfcDropdownField
import com.smartflightcompanion.mobile.ui.components.SfcPanel
import com.smartflightcompanion.mobile.ui.components.SfcTextField
import com.smartflightcompanion.mobile.ui.components.StatusPill
import com.smartflightcompanion.mobile.ui.components.StatusText
import com.smartflightcompanion.mobile.ui.format.currentLocale
import com.smartflightcompanion.mobile.ui.format.formatDate
import com.smartflightcompanion.mobile.ui.format.formatDateTime
import com.smartflightcompanion.mobile.ui.format.formatEuro
import com.smartflightcompanion.mobile.ui.theme.Spacing
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset
import java.time.format.FormatStyle

private val PageSizeFieldWidth = 120.dp

class FilterActions(
    val onSemanticQueryChange: (String) -> Unit,
    val onAirlineChange: (String) -> Unit,
    val onStartChange: (String) -> Unit,
    val onDestinationChange: (String) -> Unit,
    val onDepartureDateChange: (LocalDate?) -> Unit,
    val onMaxPriceChange: (String) -> Unit,
    val onStatusChange: (String?) -> Unit,
    val onApply: () -> Unit,
    val onReset: () -> Unit
)

@Composable
fun FlightBoardSection(
    state: HomeUiState,
    onToggleFilters: () -> Unit,
    filterActions: FilterActions,
    onOpenFlight: (String) -> Unit,
    onPreviousPage: () -> Unit,
    onNextPage: () -> Unit,
    onPageSizeChange: (Int) -> Unit
) {
    val flights = state.flights

    SfcPanel {
        Text(
            text = stringResource(R.string.home_title),
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface
        )
        Text(
            text = stringResource(R.string.home_subtitle),
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        OutlinedButton(onClick = onToggleFilters, shape = MaterialTheme.shapes.small) {
            Icon(Icons.Filled.FilterList, contentDescription = null)
            Text(
                text = stringResource(R.string.home_filters_toggle),
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(horizontal = Spacing.sm)
            )
            Icon(if (state.isFilterPanelOpen) Icons.Filled.ExpandLess else Icons.Filled.ExpandMore, contentDescription = null)
        }

        AnimatedVisibility(visible = state.isFilterPanelOpen) {
            FlightFilters(filters = state.filters, isLoading = flights.isLoading, actions = filterActions)
        }

        when {
            flights.isLoading -> StatusText(stringResource(R.string.home_loading))
            flights.hasError -> StatusText(stringResource(R.string.home_load_error), isError = true)
            flights.items.isEmpty() -> StatusText(stringResource(R.string.home_empty))
            else -> flights.items.forEach { flight -> FlightCard(flight = flight, onClick = { onOpenFlight(flight.id) }) }
        }

        if (!flights.hasError) {
            Pagination(
                state = flights,
                onPreviousPage = onPreviousPage,
                onNextPage = onNextPage,
                onPageSizeChange = onPageSizeChange
            )
        }
    }
}

@Composable
private fun FlightFilters(filters: FilterInputs, isLoading: Boolean, actions: FilterActions) {
    Column(verticalArrangement = Arrangement.spacedBy(Spacing.sm + Spacing.xs)) {
        SfcTextField(
            label = stringResource(R.string.home_filters_ai_prompt),
            value = filters.semanticQuery,
            onValueChange = actions.onSemanticQueryChange,
            placeholder = stringResource(R.string.home_filters_ai_prompt_placeholder),
            leadingIcon = Icons.Filled.AutoAwesome,
            hint = stringResource(R.string.home_filters_ai_prompt_hint)
        )
        SfcTextField(
            label = stringResource(R.string.home_filters_airline),
            value = filters.airline,
            onValueChange = actions.onAirlineChange,
            placeholder = stringResource(R.string.home_filters_airline_placeholder),
            leadingIcon = Icons.Filled.Flight
        )
        SfcTextField(
            label = stringResource(R.string.home_filters_start),
            value = filters.start,
            onValueChange = actions.onStartChange,
            placeholder = stringResource(R.string.home_filters_start_placeholder),
            leadingIcon = Icons.Filled.FlightTakeoff
        )
        SfcTextField(
            label = stringResource(R.string.home_filters_destination),
            value = filters.destination,
            onValueChange = actions.onDestinationChange,
            placeholder = stringResource(R.string.home_filters_destination_placeholder),
            leadingIcon = Icons.Filled.FlightLand
        )
        DepartureDateField(date = filters.departureDate, onDateChange = actions.onDepartureDateChange)
        SfcTextField(
            label = stringResource(R.string.home_filters_max_price),
            value = filters.maxPrice,
            onValueChange = actions.onMaxPriceChange,
            placeholder = stringResource(R.string.home_filters_max_price_placeholder),
            leadingIcon = Icons.Filled.Euro,
            keyboardType = KeyboardType.Decimal,
            imeAction = ImeAction.Done
        )
        SfcDropdownField(
            label = stringResource(R.string.home_filters_status),
            selected = filters.status?.let(FlightStatus::fromApi),
            options = listOf<FlightStatus?>(null) + FlightStatus.entries,
            optionLabel = { status -> status?.let { stringResource(it.labelRes()) } ?: stringResource(R.string.home_filters_all_statuses) },
            onSelected = { status -> actions.onStatusChange(status?.apiValue) },
            leadingIcon = Icons.Filled.Info
        )
        Row(horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
            Button(
                onClick = actions.onApply,
                enabled = !isLoading,
                shape = MaterialTheme.shapes.small,
                modifier = Modifier.weight(1f)
            ) {
                Text(stringResource(R.string.home_filters_apply), fontWeight = FontWeight.Bold)
            }
            OutlinedButton(
                onClick = actions.onReset,
                enabled = !isLoading,
                shape = MaterialTheme.shapes.small,
                modifier = Modifier.weight(1f)
            ) {
                Text(stringResource(R.string.home_filters_reset), fontWeight = FontWeight.Bold)
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun DepartureDateField(date: LocalDate?, onDateChange: (LocalDate?) -> Unit) {
    var showPicker by rememberSaveable { mutableStateOf(false) }
    val interactionSource = remember { MutableInteractionSource() }
    val locale = currentLocale()

    LaunchedEffect(interactionSource) {
        interactionSource.interactions.collect { if (it is PressInteraction.Release) showPicker = true }
    }

    Column {
        Text(
            text = stringResource(R.string.home_filters_departure_time),
            style = MaterialTheme.typography.labelLarge,
            fontWeight = FontWeight.SemiBold,
            color = MaterialTheme.colorScheme.onBackground,
            modifier = Modifier.padding(bottom = Spacing.xs)
        )
        OutlinedTextField(
            value = date?.formatDate(locale).orEmpty(),
            onValueChange = {},
            readOnly = true,
            singleLine = true,
            placeholder = { Text(stringResource(R.string.home_filters_departure_any)) },
            leadingIcon = { Icon(Icons.Filled.CalendarMonth, contentDescription = null) },
            trailingIcon = if (date != null) {
                {
                    IconButton(onClick = { onDateChange(null) }) {
                        Icon(Icons.Filled.Clear, contentDescription = stringResource(R.string.home_filters_reset))
                    }
                }
            } else null,
            interactionSource = interactionSource,
            shape = MaterialTheme.shapes.medium,
            modifier = Modifier.fillMaxWidth()
        )
    }

    if (showPicker) {
        val todayUtcMillis = LocalDate.now().toUtcMillis()
        val pickerState = rememberDatePickerState(
            initialSelectedDateMillis = date?.toUtcMillis(),
            selectableDates = object : SelectableDates {
                override fun isSelectableDate(utcTimeMillis: Long) = utcTimeMillis >= todayUtcMillis
                override fun isSelectableYear(year: Int) = year >= LocalDate.now().year
            }
        )
        DatePickerDialog(
            onDismissRequest = { showPicker = false },
            confirmButton = {
                TextButton(onClick = {
                    showPicker = false
                    pickerState.selectedDateMillis?.let { millis ->
                        onDateChange(Instant.ofEpochMilli(millis).atZone(ZoneOffset.UTC).toLocalDate())
                    }
                }) { Text(stringResource(R.string.common_ok)) }
            },
            dismissButton = {
                TextButton(onClick = { showPicker = false }) { Text(stringResource(R.string.common_cancel)) }
            }
        ) {
            DatePicker(state = pickerState)
        }
    }
}

private fun LocalDate.toUtcMillis(): Long = atStartOfDay(ZoneOffset.UTC).toInstant().toEpochMilli()

@Composable
private fun FlightCard(flight: FlightSummary, onClick: () -> Unit) {
    val locale = currentLocale()
    Surface(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth(),
        shape = MaterialTheme.shapes.medium,
        color = MaterialTheme.colorScheme.surface,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
    ) {
        Column(
            modifier = Modifier.padding(Spacing.sm + Spacing.xs),
            verticalArrangement = Arrangement.spacedBy(Spacing.xs)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = flight.flightNumber,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface,
                    modifier = Modifier.weight(1f)
                )
                StatusPill(text = flightStatusLabel(flight.status))
            }
            Text(
                text = "${flight.fromLabel} → ${flight.toLabel}",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.primary
            )
            Text(
                text = flight.airline,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Row {
                LabeledValue(
                    label = stringResource(R.string.home_columns_departure),
                    value = flight.departureAt?.formatDateTime(locale, FormatStyle.SHORT) ?: "TBD",
                    modifier = Modifier.weight(1f)
                )
                LabeledValue(
                    label = stringResource(R.string.home_columns_lowest_price),
                    value = flight.lowestPrice?.formatEuro(locale) ?: stringResource(R.string.home_columns_no_price),
                    modifier = Modifier.weight(1f),
                    alignEnd = true
                )
            }
        }
    }
}

@Composable
internal fun LabeledValue(label: String, value: String, modifier: Modifier = Modifier, alignEnd: Boolean = false) {
    val textAlign = if (alignEnd) TextAlign.End else TextAlign.Start
    Column(modifier = modifier) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = textAlign,
            modifier = Modifier.fillMaxWidth()
        )
        Text(
            text = value,
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.SemiBold,
            color = MaterialTheme.colorScheme.onSurface,
            textAlign = textAlign,
            modifier = Modifier.fillMaxWidth()
        )
    }
}

@Composable
private fun Pagination(
    state: FlightsState,
    onPreviousPage: () -> Unit,
    onNextPage: () -> Unit,
    onPageSizeChange: (Int) -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(Spacing.sm)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            OutlinedButton(onClick = onPreviousPage, enabled = state.canGoPrevious, shape = MaterialTheme.shapes.small) {
                Text(stringResource(R.string.home_pagination_previous))
            }
            Text(
                text = stringResource(R.string.home_pagination_page, state.page, state.totalPages),
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onSurface,
                textAlign = TextAlign.Center,
                modifier = Modifier.weight(1f)
            )
            OutlinedButton(onClick = onNextPage, enabled = state.canGoNext, shape = MaterialTheme.shapes.small) {
                Text(stringResource(R.string.home_pagination_next))
            }
        }
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                text = stringResource(R.string.home_pagination_total, state.totalCount),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.weight(1f)
            )
            Text(
                text = stringResource(R.string.home_pagination_page_size),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(end = Spacing.sm)
            )
            SfcDropdownField(
                selected = state.pageSize,
                options = PAGE_SIZE_OPTIONS,
                optionLabel = { it.toString() },
                onSelected = onPageSizeChange,
                enabled = !state.isLoading,
                modifier = Modifier.width(PageSizeFieldWidth)
            )
        }
    }
}

@Composable
private fun flightStatusLabel(status: String): String =
    FlightStatus.fromApi(status)?.let { stringResource(it.labelRes()) } ?: status

private fun FlightStatus.labelRes(): Int = when (this) {
    FlightStatus.Scheduled -> R.string.status_scheduled
    FlightStatus.Delayed -> R.string.status_delayed
    FlightStatus.Departed -> R.string.status_departed
    FlightStatus.Arrived -> R.string.status_arrived
    FlightStatus.Cancelled -> R.string.status_cancelled
}
