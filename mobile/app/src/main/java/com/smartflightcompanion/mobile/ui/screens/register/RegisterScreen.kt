package com.smartflightcompanion.mobile.ui.screens.register

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Email
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
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.smartflightcompanion.mobile.R
import com.smartflightcompanion.mobile.domain.PasswordError
import com.smartflightcompanion.mobile.domain.UsernameError
import com.smartflightcompanion.mobile.ui.components.AppLogo
import com.smartflightcompanion.mobile.ui.components.SfcTextField
import com.smartflightcompanion.mobile.ui.components.StatusMessage
import com.smartflightcompanion.mobile.ui.theme.LocalSfcExtraColors
import com.smartflightcompanion.mobile.ui.theme.Spacing

private val SubmitButtonHeight = 48.dp

@Composable
fun RegisterScreen(
    onNavigateToLogin: () -> Unit,
    onRegisteredAsUser: () -> Unit,
    viewModel: RegisterViewModel = viewModel()
) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    LaunchedEffect(viewModel) {
        viewModel.registeredAsUser.collect { onRegisteredAsUser() }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .safeDrawingPadding()
            .imePadding()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = Spacing.md, vertical = Spacing.md),
        verticalArrangement = Arrangement.spacedBy(Spacing.md)
    ) {
        AppLogo()

        Column(verticalArrangement = Arrangement.spacedBy(Spacing.sm)) {
            Text(
                text = stringResource(R.string.register_title),
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onBackground
            )
            Text(
                text = stringResource(R.string.register_subtitle),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }

        RegisterFields(state = state, viewModel = viewModel)

        RegisterStatusMessage(state.status)

        Button(
            onClick = viewModel::submit,
            enabled = !state.isSubmitting,
            shape = MaterialTheme.shapes.medium,
            modifier = Modifier
                .fillMaxWidth()
                .height(SubmitButtonHeight)
        ) {
            Text(
                text = stringResource(if (state.isSubmitting) R.string.register_submitting else R.string.register_submit),
                fontWeight = FontWeight.Bold
            )
        }

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = stringResource(R.string.register_login_prompt),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            TextButton(onClick = onNavigateToLogin) {
                Text(text = stringResource(R.string.register_login_action), fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
private fun RegisterFields(state: RegisterUiState, viewModel: RegisterViewModel) {
    val enabled = !state.isSubmitting

    Column(verticalArrangement = Arrangement.spacedBy(Spacing.md)) {
        SfcTextField(
            label = stringResource(R.string.register_first_name),
            value = state.firstName,
            onValueChange = viewModel::onFirstNameChange,
            placeholder = stringResource(R.string.register_first_name_placeholder),
            leadingIcon = Icons.Filled.Person,
            enabled = enabled
        )
        SfcTextField(
            label = stringResource(R.string.register_last_name),
            value = state.lastName,
            onValueChange = viewModel::onLastNameChange,
            placeholder = stringResource(R.string.register_last_name_placeholder),
            leadingIcon = Icons.Filled.Person,
            enabled = enabled
        )
        SfcTextField(
            label = stringResource(R.string.register_username),
            value = state.username,
            onValueChange = viewModel::onUsernameChange,
            placeholder = stringResource(R.string.register_username_placeholder),
            leadingIcon = Icons.Filled.Person,
            enabled = enabled,
            error = state.usernameError?.let { stringResource(it.messageRes()) },
            onFocusLost = viewModel::onUsernameFocusLost
        )
        SfcTextField(
            label = stringResource(R.string.register_email),
            value = state.email,
            onValueChange = viewModel::onEmailChange,
            placeholder = stringResource(R.string.register_email_placeholder),
            leadingIcon = Icons.Filled.Email,
            enabled = enabled,
            keyboardType = KeyboardType.Email
        )
        SfcTextField(
            label = stringResource(R.string.register_password),
            value = state.password,
            onValueChange = viewModel::onPasswordChange,
            placeholder = stringResource(R.string.register_password_placeholder),
            leadingIcon = Icons.Filled.Lock,
            enabled = enabled,
            isPassword = true,
            error = state.passwordError?.let { stringResource(it.messageRes()) },
            onFocusLost = viewModel::onPasswordFocusLost
        )
        SfcTextField(
            label = stringResource(R.string.register_confirm_password),
            value = state.passwordConfirmation,
            onValueChange = viewModel::onPasswordConfirmationChange,
            placeholder = stringResource(R.string.register_confirm_password_placeholder),
            leadingIcon = Icons.Filled.Lock,
            enabled = enabled,
            isPassword = true,
            imeAction = ImeAction.Done
        )
    }
}

@Composable
private fun RegisterStatusMessage(status: RegisterStatus) {
    when (status) {
        RegisterStatus.None -> Unit
        RegisterStatus.PasswordMismatch ->
            StatusMessage(stringResource(R.string.register_mismatch), MaterialTheme.colorScheme.error)
        is RegisterStatus.Failure ->
            StatusMessage(
                status.serverMessage ?: stringResource(R.string.register_failure),
                MaterialTheme.colorScheme.error
            )
        is RegisterStatus.Success ->
            StatusMessage(
                stringResource(R.string.register_success, status.name),
                LocalSfcExtraColors.current.success
            )
    }
}

private fun UsernameError.messageRes(): Int = when (this) {
    UsernameError.Required -> R.string.register_username_missing
    UsernameError.Length -> R.string.register_invalid_username_length
    UsernameError.Invalid -> R.string.register_invalid_username
}

private fun PasswordError.messageRes(): Int = when (this) {
    PasswordError.Required -> R.string.register_password_missing
    PasswordError.Length -> R.string.register_invalid_password_length
    PasswordError.Invalid -> R.string.register_invalid_password
}
