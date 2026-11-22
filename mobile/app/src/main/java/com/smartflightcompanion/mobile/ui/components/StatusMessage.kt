package com.smartflightcompanion.mobile.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.ui.unit.dp
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import com.smartflightcompanion.mobile.ui.theme.Spacing

private const val CONTAINER_ALPHA = 0.10f
private const val BORDER_ALPHA = 0.24f

@Composable
fun StatusMessage(text: String, color: Color, modifier: Modifier = Modifier) {
    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = MaterialTheme.shapes.small,
        color = color.copy(alpha = CONTAINER_ALPHA),
        border = BorderStroke(1.dp, color.copy(alpha = BORDER_ALPHA))
    ) {
        Text(
            text = text,
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.SemiBold,
            color = color,
            modifier = Modifier.padding(horizontal = Spacing.md - Spacing.xs, vertical = Spacing.sm + Spacing.xs / 2)
        )
    }
}
