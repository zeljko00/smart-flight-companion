package com.smartflightcompanion.mobile.ui.components

import android.app.Activity
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DarkMode
import androidx.compose.material.icons.filled.LightMode
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import com.smartflightcompanion.mobile.R
import com.smartflightcompanion.mobile.data.AppLanguage
import com.smartflightcompanion.mobile.data.AppSettings
import com.smartflightcompanion.mobile.ui.theme.isAppInDarkTheme

/** Logo with the language and theme switches (web `AuthHeader`). */
@Composable
fun AppHeader(modifier: Modifier = Modifier) {
    Row(
        modifier = modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        AppLogo(modifier = Modifier.weight(1f))
        LanguageSwitch()
        ThemeSwitch()
    }
}

@Composable
private fun LanguageSwitch() {
    val activity = LocalContext.current as? Activity
    val current = AppSettings.language()
    val languages = AppLanguage.entries
    val next = languages[(languages.indexOf(current) + 1) % languages.size]

    OutlinedButton(
        onClick = {
            AppSettings.setLanguage(next)
            activity?.recreate()
        },
        shape = MaterialTheme.shapes.small
    ) {
        Text(text = current.code.uppercase(), fontWeight = FontWeight.Bold)
    }
}

@Composable
private fun ThemeSwitch() {
    val isDark = isAppInDarkTheme()
    IconButton(onClick = { AppSettings.setDarkTheme(!isDark) }) {
        Icon(
            imageVector = if (isDark) Icons.Filled.LightMode else Icons.Filled.DarkMode,
            contentDescription = stringResource(if (isDark) R.string.theme_switch_to_light else R.string.theme_switch_to_dark),
            tint = MaterialTheme.colorScheme.onBackground
        )
    }
}
