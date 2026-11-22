package com.smartflightcompanion.mobile.data

import com.google.gson.JsonElement
import com.google.gson.JsonParser
import com.google.gson.JsonSyntaxException

private const val CODE_FENCE = "```"
private const val ROOT_KEY = "Response"
private const val PATH_SEPARATOR = " / "

private val EXCLUDED_FIELDS = setOf(
    "flight_id",
    "airline",
    "flight_number",
    "route",
    "terminal_gate",
    "scheduled_departure",
    "status"
)

internal fun formatAiResponse(raw: String): String {
    val normalized = unwrapCodeFence(raw)
    if (normalized.isEmpty()) return ""

    val parsed = try {
        JsonParser.parseString(normalized)
    } catch (_: JsonSyntaxException) {
        return normalized
    }
    if (!parsed.isJsonObject && !parsed.isJsonArray) return normalized

    return flatten(parsed, emptyList()).joinToString("\n") { (key, value) -> "$key: $value" }
}

private fun unwrapCodeFence(value: String): String {
    val trimmed = value.trim()
    if (!trimmed.startsWith(CODE_FENCE) || !trimmed.endsWith(CODE_FENCE)) return trimmed

    val firstNewLine = trimmed.indexOf('\n')
    if (firstNewLine < 0) return trimmed

    val withoutHeader = trimmed.substring(firstNewLine + 1)
    val fenceIndex = withoutHeader.lastIndexOf(CODE_FENCE)
    if (fenceIndex < 0) return trimmed

    return withoutHeader.substring(0, fenceIndex).trim()
}

private fun flatten(element: JsonElement, path: List<String>): List<Pair<String, String>> = when {
    element.isJsonNull -> emptyList()
    element.isJsonPrimitive -> {
        val rendered = element.asString.trim()
        if (rendered.isEmpty()) {
            emptyList()
        } else {
            listOf((path.takeIf { it.isNotEmpty() }?.joinToString(PATH_SEPARATOR) ?: ROOT_KEY) to rendered)
        }
    }
    element.isJsonArray -> element.asJsonArray.flatMapIndexed { index, item -> flatten(item, path + "${index + 1}") }
    else -> element.asJsonObject.entrySet()
        .filter { (key, value) -> key.lowercase() !in EXCLUDED_FIELDS && !value.isEmptyValue() }
        .flatMap { (key, value) -> flatten(value, path + key.toDisplayLabel()) }
}

private fun JsonElement.isEmptyValue(): Boolean = when {
    isJsonNull -> true
    isJsonPrimitive -> asJsonPrimitive.isString && asString.isBlank()
    isJsonArray -> asJsonArray.isEmpty
    else -> asJsonObject.size() == 0
}

private fun String.toDisplayLabel(): String =
    replace('_', ' ').replace(Regex("\\b\\w")) { it.value.uppercase() }
