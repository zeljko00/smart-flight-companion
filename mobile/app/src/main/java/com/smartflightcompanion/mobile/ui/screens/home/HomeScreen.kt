package com.smartflightcompanion.mobile.ui.screens.home

import android.content.ActivityNotFoundException
import android.content.Context
import android.Manifest
import android.content.Intent
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.core.content.FileProvider
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.smartflightcompanion.mobile.ui.components.AppLogo
import com.smartflightcompanion.mobile.ui.theme.Spacing
import java.io.File

private const val PDF_MIME_TYPE = "application/pdf"

@Composable
fun HomeScreen(
    onOpenFlight: (flightId: String) -> Unit,
    onSignedOut: () -> Unit,
    viewModel: HomeViewModel = viewModel()
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val user by viewModel.user.collectAsStateWithLifecycle()
    val context = LocalContext.current

    // Covers explicit logout, a failed token refresh and a lost in-memory session after process death.
    LaunchedEffect(user) {
        if (user == null) onSignedOut()
    }

    val notificationPermission = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) {}
    LaunchedEffect(Unit) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            notificationPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
    }

    LaunchedEffect(viewModel) {
        viewModel.events.collect { event ->
            when (event) {
                is HomeEvent.OpenPdf -> if (!context.openPdf(event.file)) viewModel.onPdfViewerMissing()
            }
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .safeDrawingPadding()
            .verticalScroll(rememberScrollState())
            .padding(Spacing.md),
        verticalArrangement = Arrangement.spacedBy(Spacing.md)
    ) {
        AppLogo()
        UserInfoBar(user = user, onLogout = viewModel::logout)
        FlightBoardSection(
            state = state,
            onToggleFilters = viewModel::toggleFilterPanel,
            filterActions = FilterActions(
                onSemanticQueryChange = viewModel::onSemanticQueryChange,
                onAirlineChange = viewModel::onAirlineChange,
                onStartChange = viewModel::onStartChange,
                onDestinationChange = viewModel::onDestinationChange,
                onDepartureDateChange = viewModel::onDepartureDateChange,
                onMaxPriceChange = viewModel::onMaxPriceChange,
                onStatusChange = viewModel::onStatusChange,
                onApply = viewModel::applyFilters,
                onReset = viewModel::resetFilters
            ),
            onOpenFlight = onOpenFlight,
            onPreviousPage = viewModel::previousPage,
            onNextPage = viewModel::nextPage,
            onPageSizeChange = viewModel::onPageSizeChange
        )
        NewsSection(state = state.news)
        BoardingPassesSection(state = state.boardingPasses, onDownload = viewModel::downloadBoardingPass)
    }
}

/** Opens the PDF in an external viewer; returns false when no app can handle it. */
private fun Context.openPdf(file: File): Boolean {
    val uri = FileProvider.getUriForFile(this, "$packageName.fileprovider", file)
    val intent = Intent(Intent.ACTION_VIEW)
        .setDataAndType(uri, PDF_MIME_TYPE)
        .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
    return try {
        startActivity(intent)
        true
    } catch (_: ActivityNotFoundException) {
        false
    }
}
