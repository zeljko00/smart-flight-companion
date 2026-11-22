package com.smartflightcompanion.mobile.ui.screens.home

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import com.smartflightcompanion.mobile.R
import com.smartflightcompanion.mobile.data.api.UserDto
import com.smartflightcompanion.mobile.ui.components.StatusPill
import com.smartflightcompanion.mobile.ui.theme.Spacing

private const val ADMIN_ROLE = "admin"

@Composable
fun UserInfoBar(user: UserDto?, onLogout: () -> Unit, modifier: Modifier = Modifier) {
    val fullName = listOfNotNull(user?.firstName, user?.lastName).joinToString(" ").trim()
    val displayName = fullName.ifEmpty { user?.username.orEmpty() }.ifEmpty { stringResource(R.string.home_fallback_name) }
    val isAdmin = user?.role.equals(ADMIN_ROLE, ignoreCase = true)

    Row(
        modifier = modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(Spacing.sm)
    ) {
        Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
            Text(
                text = displayName,
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onBackground,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            if (isAdmin) StatusPill(text = stringResource(R.string.home_role_admin))
        }
        Button(
            onClick = onLogout,
            shape = MaterialTheme.shapes.small,
            colors = ButtonDefaults.buttonColors(
                containerColor = MaterialTheme.colorScheme.error,
                contentColor = Color.White
            )
        ) {
            Text(text = stringResource(R.string.home_logout), fontWeight = FontWeight.Bold)
        }
    }
}
