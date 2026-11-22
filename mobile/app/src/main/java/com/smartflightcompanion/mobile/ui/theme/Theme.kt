package com.smartflightcompanion.mobile.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import com.smartflightcompanion.mobile.data.AppSettings

data class SfcExtraColors(val success: Color)

val LocalSfcExtraColors = staticCompositionLocalOf { SfcExtraColors(success = LightSuccess) }

private val LightColorScheme = lightColorScheme(
    primary = LightPrimary,
    onPrimary = Color.White,
    background = LightBackground,
    onBackground = LightTextPrimary,
    surface = LightSurface,
    onSurface = LightTextPrimary,
    surfaceVariant = LightElevated,
    onSurfaceVariant = LightTextSecondary,
    outline = LightBorder,
    outlineVariant = LightBorder,
    error = LightError
)

private val DarkColorScheme = darkColorScheme(
    primary = DarkPrimary,
    onPrimary = Color.White,
    background = DarkBackground,
    onBackground = DarkTextPrimary,
    surface = DarkSurface,
    onSurface = DarkTextPrimary,
    surfaceVariant = DarkInputBackground,
    onSurfaceVariant = DarkTextSecondary,
    outline = DarkBorder,
    outlineVariant = DarkBorder,
    error = DarkError
)

@Composable
fun isAppInDarkTheme(): Boolean {
    val selected by AppSettings.darkTheme.collectAsState()
    return selected ?: isSystemInDarkTheme()
}

@Composable
fun SmartFlightCompanionTheme(
    darkTheme: Boolean = isAppInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme
    val extraColors = SfcExtraColors(success = if (darkTheme) DarkSuccess else LightSuccess)

    CompositionLocalProvider(LocalSfcExtraColors provides extraColors) {
        MaterialTheme(
            colorScheme = colorScheme,
            typography = Typography,
            shapes = SfcShapes,
            content = content
        )
    }
}
