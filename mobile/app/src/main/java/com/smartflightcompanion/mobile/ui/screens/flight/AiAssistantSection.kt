package com.smartflightcompanion.mobile.ui.screens.flight

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.ExpandLess
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material.icons.filled.SmartToy
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.smartflightcompanion.mobile.R
import com.smartflightcompanion.mobile.domain.model.AiExchange
import com.smartflightcompanion.mobile.ui.components.SfcPanel
import com.smartflightcompanion.mobile.ui.components.StatusText
import com.smartflightcompanion.mobile.ui.format.currentLocale
import com.smartflightcompanion.mobile.ui.format.formatDateTime
import com.smartflightcompanion.mobile.ui.theme.Spacing

private val BUBBLE_MAX_WIDTH = 320.dp
private val SUBMIT_PROGRESS_SIZE = 18.dp
private const val QUESTION_MIN_LINES = 2
private const val QUESTION_MAX_LINES = 5

@Composable
fun AiAssistantSection(
    state: AiAssistantState,
    onDraftChange: (String) -> Unit,
    onAsk: () -> Unit
) {
    var isOpen by rememberSaveable { mutableStateOf(false) }

    SfcPanel {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clickable(role = Role.Button) { isOpen = !isOpen },
            horizontalArrangement = Arrangement.spacedBy(Spacing.sm),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(Icons.Filled.SmartToy, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
            Text(
                text = stringResource(R.string.flight_details_ai_title),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface,
                modifier = Modifier.weight(1f)
            )
            Icon(
                imageVector = if (isOpen) Icons.Filled.ExpandLess else Icons.Filled.ExpandMore,
                contentDescription = stringResource(
                    if (isOpen) R.string.flight_details_ai_collapse else R.string.flight_details_ai_expand
                ),
                tint = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }

        AnimatedVisibility(visible = isOpen) {
            Column(verticalArrangement = Arrangement.spacedBy(Spacing.sm + Spacing.xs)) {
                Text(
                    text = stringResource(R.string.flight_details_ai_subtitle),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                if (state.exchanges.isEmpty()) {
                    StatusText(stringResource(R.string.flight_details_ai_empty))
                } else {
                    state.exchanges.forEach { AiExchangeItem(it) }
                }
                AiQuestionForm(state, onDraftChange, onAsk)
            }
        }
    }
}

@Composable
private fun AiExchangeItem(exchange: AiExchange) {
    Column(verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
        ChatBubble(
            text = exchange.request.ifEmpty { stringResource(R.string.flight_details_ai_missing_request) },
            isUser = true
        )
        ChatBubble(
            text = exchange.response.ifEmpty { stringResource(R.string.flight_details_ai_missing_response) },
            isUser = false
        )
        exchange.timestamp?.let {
            Text(
                text = it.formatDateTime(currentLocale()),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
private fun ChatBubble(text: String, isUser: Boolean) {
    val containerColor: Color
    val contentColor: Color
    if (isUser) {
        containerColor = MaterialTheme.colorScheme.primary
        contentColor = MaterialTheme.colorScheme.onPrimary
    } else {
        containerColor = MaterialTheme.colorScheme.surfaceVariant
        contentColor = MaterialTheme.colorScheme.onSurface
    }
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = if (isUser) Arrangement.End else Arrangement.Start
    ) {
        Surface(
            modifier = Modifier.widthIn(max = BUBBLE_MAX_WIDTH),
            shape = MaterialTheme.shapes.medium,
            color = containerColor,
            contentColor = contentColor
        ) {
            Column(
                modifier = Modifier.padding(horizontal = Spacing.sm + Spacing.xs, vertical = Spacing.sm),
            ) {
                Text(text, style = MaterialTheme.typography.bodyMedium)
            }
        }
    }
}

@Composable
private fun AiQuestionForm(state: AiAssistantState, onDraftChange: (String) -> Unit, onAsk: () -> Unit) {
    OutlinedTextField(
        value = state.draft,
        onValueChange = onDraftChange,
        modifier = Modifier.fillMaxWidth(),
        label = { Text(stringResource(R.string.flight_details_ai_input_label)) },
        placeholder = { Text(stringResource(R.string.flight_details_ai_input_placeholder)) },
        minLines = QUESTION_MIN_LINES,
        maxLines = QUESTION_MAX_LINES,
        enabled = !state.isSubmitting,
        isError = state.submitError != null,
        shape = MaterialTheme.shapes.medium,
        supportingText = state.submitError?.let { error ->
            {
                Text(
                    stringResource(
                        when (error) {
                            AiSubmitError.Empty -> R.string.flight_details_ai_validation_required
                            AiSubmitError.Failed -> R.string.flight_details_ai_submit_error
                        }
                    )
                )
            }
        }
    )
    Button(
        onClick = onAsk,
        enabled = !state.isSubmitting,
        modifier = Modifier.fillMaxWidth()
    ) {
        if (state.isSubmitting) {
            CircularProgressIndicator(
                modifier = Modifier.size(SUBMIT_PROGRESS_SIZE),
                strokeWidth = 2.dp,
                color = MaterialTheme.colorScheme.onPrimary
            )
            Text(
                text = stringResource(R.string.flight_details_ai_submitting),
                modifier = Modifier.padding(start = Spacing.sm)
            )
        } else {
            Icon(Icons.AutoMirrored.Filled.Send, contentDescription = null, modifier = Modifier.size(SUBMIT_PROGRESS_SIZE))
            Text(
                text = stringResource(R.string.flight_details_ai_submit),
                modifier = Modifier.padding(start = Spacing.sm)
            )
        }
    }
}
