package com.smartflightcompanion.mobile.ui.screens.home

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Download
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.smartflightcompanion.mobile.R
import com.smartflightcompanion.mobile.domain.model.BoardingPass
import com.smartflightcompanion.mobile.domain.model.SeatClass
import com.smartflightcompanion.mobile.ui.components.SfcPanel
import com.smartflightcompanion.mobile.ui.components.StatusMessage
import com.smartflightcompanion.mobile.ui.components.StatusPill
import com.smartflightcompanion.mobile.ui.components.StatusText
import com.smartflightcompanion.mobile.ui.format.currentLocale
import com.smartflightcompanion.mobile.ui.format.formatDateTime
import com.smartflightcompanion.mobile.ui.format.formatEuro
import com.smartflightcompanion.mobile.ui.theme.LocalSfcExtraColors
import com.smartflightcompanion.mobile.ui.theme.Spacing

private val DownloadIconSize = 18.dp

@Composable
fun BoardingPassesSection(state: BoardingPassesState, onDownload: (String) -> Unit) {
    SfcPanel(title = stringResource(R.string.home_boarding_title)) {
        when (state.downloadError) {
            DownloadError.Failed ->
                StatusMessage(stringResource(R.string.home_boarding_download_error), MaterialTheme.colorScheme.error)
            DownloadError.SaveFailed ->
                StatusMessage(stringResource(R.string.home_boarding_save_error), MaterialTheme.colorScheme.error)
            DownloadError.NoViewer ->
                StatusMessage(stringResource(R.string.home_boarding_no_pdf_viewer), MaterialTheme.colorScheme.error)
            null -> Unit
        }
        when {
            state.isLoading -> StatusText(stringResource(R.string.home_boarding_loading))
            state.hasError -> StatusText(stringResource(R.string.home_boarding_load_error), isError = true)
            state.items.isEmpty() -> StatusText(stringResource(R.string.home_boarding_empty))
            else -> state.items.forEach { pass ->
                BoardingPassCard(
                    pass = pass,
                    isDownloading = state.downloadingId == pass.id,
                    downloadEnabled = state.downloadingId == null,
                    onDownload = { onDownload(pass.id) }
                )
            }
        }
    }
}

@Composable
private fun BoardingPassCard(
    pass: BoardingPass,
    isDownloading: Boolean,
    downloadEnabled: Boolean,
    onDownload: () -> Unit
) {
    val locale = currentLocale()
    val validityColor = if (pass.isValid) LocalSfcExtraColors.current.success else MaterialTheme.colorScheme.error

    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = MaterialTheme.shapes.medium,
        color = MaterialTheme.colorScheme.surface,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
    ) {
        Column(
            modifier = Modifier.padding(Spacing.sm + Spacing.xs),
            verticalArrangement = Arrangement.spacedBy(Spacing.sm)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "${pass.flightNumber} · ${pass.airline}",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Text(
                        text = "${pass.fromLabel} → ${pass.toLabel}",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.primary
                    )
                }
                StatusPill(
                    text = stringResource(if (pass.isValid) R.string.home_boarding_valid else R.string.home_boarding_invalid),
                    color = validityColor
                )
            }
            Row {
                LabeledValue(
                    label = stringResource(R.string.home_columns_departure),
                    value = pass.departureAt?.formatDateTime(locale) ?: "TBD",
                    modifier = Modifier.weight(1f)
                )
                LabeledValue(
                    label = stringResource(R.string.home_boarding_seat),
                    value = pass.seat?.let { stringResource(it.labelRes()) } ?: "-",
                    modifier = Modifier.weight(1f),
                    alignEnd = true
                )
            }
            Row {
                LabeledValue(
                    label = stringResource(R.string.home_boarding_issued_at),
                    value = pass.issuedAt?.formatDateTime(locale) ?: "TBD",
                    modifier = Modifier.weight(1f)
                )
                LabeledValue(
                    label = stringResource(R.string.home_boarding_price),
                    value = pass.price?.formatEuro(locale) ?: stringResource(R.string.home_columns_no_price),
                    modifier = Modifier.weight(1f),
                    alignEnd = true
                )
            }
            OutlinedButton(
                onClick = onDownload,
                enabled = downloadEnabled,
                shape = MaterialTheme.shapes.small,
                modifier = Modifier.align(Alignment.End)
            ) {
                Icon(Icons.Filled.Download, contentDescription = null, modifier = Modifier.size(DownloadIconSize))
                Text(
                    text = stringResource(if (isDownloading) R.string.home_boarding_downloading else R.string.home_boarding_download),
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(start = Spacing.xs)
                )
            }
        }
    }
}

private fun SeatClass.labelRes(): Int = when (this) {
    SeatClass.Economy -> R.string.home_seat_economy
    SeatClass.PremiumEconomy -> R.string.home_seat_premium_economy
    SeatClass.Business -> R.string.home_seat_business
    SeatClass.FirstClass -> R.string.home_seat_first_class
}
