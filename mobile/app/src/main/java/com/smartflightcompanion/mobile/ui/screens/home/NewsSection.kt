package com.smartflightcompanion.mobile.ui.screens.home

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextLinkStyles
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.fromHtml
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import com.smartflightcompanion.mobile.R
import com.smartflightcompanion.mobile.domain.model.NewsArticle
import com.smartflightcompanion.mobile.ui.components.SfcPanel
import com.smartflightcompanion.mobile.ui.components.StatusText
import com.smartflightcompanion.mobile.ui.format.currentLocale
import com.smartflightcompanion.mobile.ui.format.formatDateTime
import com.smartflightcompanion.mobile.ui.theme.Spacing

@Composable
fun NewsSection(state: NewsState) {
    SfcPanel(title = stringResource(R.string.home_news_title)) {
        when {
            state.isLoading -> StatusText(stringResource(R.string.home_news_loading))
            state.hasError -> StatusText(stringResource(R.string.home_news_load_error), isError = true)
            state.items.isEmpty() -> StatusText(stringResource(R.string.home_news_empty))
            else -> state.items.forEach { NewsItem(it) }
        }
    }
}

@Composable
private fun NewsItem(article: NewsArticle) {
    val uriHandler = LocalUriHandler.current
    val locale = currentLocale()
    val linkColor = MaterialTheme.colorScheme.primary
    val summary = remember(article.summaryHtml, linkColor) {
        AnnotatedString.fromHtml(
            htmlString = article.summaryHtml,
            linkStyles = TextLinkStyles(style = SpanStyle(color = linkColor, textDecoration = TextDecoration.Underline))
        )
    }

    Surface(
        onClick = { uriHandler.openUri(article.link) },
        modifier = Modifier.fillMaxWidth(),
        shape = MaterialTheme.shapes.medium,
        color = MaterialTheme.colorScheme.surface,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
    ) {
        Column(
            modifier = Modifier.padding(Spacing.sm + Spacing.xs),
            verticalArrangement = Arrangement.spacedBy(Spacing.xs)
        ) {
            Text(
                text = article.title,
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface
            )
            Text(
                text = article.publishedAt?.formatDateTime(locale) ?: stringResource(R.string.home_news_unknown_date),
                style = MaterialTheme.typography.labelSmall,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            if (summary.isNotBlank()) {
                Text(
                    text = summary,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}
