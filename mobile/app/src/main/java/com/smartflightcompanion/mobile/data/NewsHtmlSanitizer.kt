package com.smartflightcompanion.mobile.data

internal object NewsHtmlSanitizer {
    private val allowedTags = setOf(
        "p", "br", "strong", "b", "em", "i", "u", "ul", "ol", "li", "blockquote", "code", "pre", "a"
    )
    private val droppedWithContent = Regex(
        "<(script|style|iframe|object|embed|template)\\b[^>]*>.*?</\\1\\s*>",
        setOf(RegexOption.IGNORE_CASE, RegexOption.DOT_MATCHES_ALL)
    )
    private val comments = Regex("<!--.*?-->", RegexOption.DOT_MATCHES_ALL)
    private val tag = Regex("<\\s*(/?)\\s*([a-zA-Z0-9]+)([^>]*)>")
    private val href = Regex("href\\s*=\\s*(\"([^\"]*)\"|'([^']*)'|([^\\s>]+))", RegexOption.IGNORE_CASE)

    fun sanitize(html: String): String {
        if (html.isBlank()) return ""
        val withoutBlocks = html.replace(droppedWithContent, "").replace(comments, "")
        return withoutBlocks.replace(tag) { match ->
            val closing = match.groupValues[1].isNotEmpty()
            val name = match.groupValues[2].lowercase()
            when {
                name !in allowedTags -> ""
                closing -> "</$name>"
                name == "a" -> anchorOpenTag(match.groupValues[3])
                name == "br" -> "<br>"
                else -> "<$name>"
            }
        }.trim()
    }

    private fun anchorOpenTag(attributes: String): String {
        val groups = href.find(attributes)?.groupValues ?: return "<a>"
        val url = groups.drop(2).firstOrNull { it.isNotEmpty() }?.trim().orEmpty()
        if (!url.isHttpUrl()) return "<a>"
        val escaped = url.replace("\"", "%22").replace("<", "%3C").replace(">", "%3E")
        return "<a href=\"$escaped\">"
    }
}
