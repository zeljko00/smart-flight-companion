package com.smartflightcompanion.mobile.ui.screens.welcome

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.smartflightcompanion.mobile.R
import com.smartflightcompanion.mobile.domain.PasswordError
import com.smartflightcompanion.mobile.domain.UsernameError
import com.smartflightcompanion.mobile.ui.components.AppHeader
import com.smartflightcompanion.mobile.ui.components.SfcTextField
import com.smartflightcompanion.mobile.ui.components.StatusMessage
import com.smartflightcompanion.mobile.ui.theme.LocalSfcExtraColors
import com.smartflightcompanion.mobile.ui.theme.Spacing

private val SubmitButtonHeight = 48.dp

@Composable
fun WelcomeScreen(
    onNavigateToRegister: () -> Unit,
    onLoggedIn: () -> Unit,
    viewModel: LoginViewModel = viewModel()
) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    LaunchedEffect(viewModel) {
        viewModel.loggedIn.collect { onLoggedIn() }
    }

    BoxWithConstraints(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .safeDrawingPadding()
            .imePadding()
    ) {
    // Min height = viewport keeps the form vertically centered while still scrolling when it doesn't fit.
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState())
            .heightIn(min = maxHeight)
            .padding(Spacing.md),
        verticalArrangement = Arrangement.spacedBy(Spacing.md, Alignment.CenterVertically)
    ) {
        AppHeader()

        Column(verticalArrangement = Arrangement.spacedBy(Spacing.sm)) {
            Text(
                text = stringResource(R.string.login_title),
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onBackground
            )
            Text(
                text = stringResource(R.string.login_subtitle),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }

        SfcTextField(
            label = stringResource(R.string.login_username),
            value = state.username,
            onValueChange = viewModel::onUsernameChange,
            placeholder = stringResource(R.string.login_username_placeholder),
            leadingIcon = Icons.Filled.Person,
            enabled = !state.isSubmitting,
            error = state.usernameError?.let { stringResource(it.messageRes()) },
            onFocusLost = viewModel::onUsernameFocusLost
        )
        SfcTextField(
            label = stringResource(R.string.login_password),
            value = state.password,
            onValueChange = viewModel::onPasswordChange,
            placeholder = stringResource(R.string.login_password_placeholder),
            leadingIcon = Icons.Filled.Lock,
            enabled = !state.isSubmitting,
            isPassword = true,
            imeAction = ImeAction.Done,
            error = state.passwordError?.let { stringResource(it.messageRes()) },
            onFocusLost = viewModel::onPasswordFocusLost
        )

        when (state.status) {
            LoginStatus.None -> Unit
            LoginStatus.Failure ->
                StatusMessage(stringResource(R.string.login_failure), MaterialTheme.colorScheme.error)
            LoginStatus.PendingApproval ->
                StatusMessage(stringResource(R.string.login_guest_pending_approval), LocalSfcExtraColors.current.success)
        }

        Button(
            onClick = viewModel::submit,
            enabled = !state.isSubmitting,
            shape = MaterialTheme.shapes.medium,
            modifier = Modifier
                .fillMaxWidth()
                .height(SubmitButtonHeight)
        ) {
            Text(
                text = stringResource(if (state.isSubmitting) R.string.login_submitting else R.string.login_submit),
                fontWeight = FontWeight.Bold
            )
        }

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = stringResource(R.string.login_register_prompt),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            TextButton(onClick = onNavigateToRegister) {
                Text(text = stringResource(R.string.login_register_action), fontWeight = FontWeight.Bold)
            }
        }
    }
}
}

private fun UsernameError.messageRes(): Int = when (this) {
    UsernameError.Required -> R.string.login_username_missing
    UsernameError.Length -> R.string.login_invalid_username_length
    UsernameError.Invalid -> R.string.login_invalid_username
}

private fun PasswordError.messageRes(): Int = when (this) {
    PasswordError.Required -> R.string.login_password_missing
    PasswordError.Length -> R.string.login_invalid_password_length
    PasswordError.Invalid -> R.string.login_invalid_password
}
