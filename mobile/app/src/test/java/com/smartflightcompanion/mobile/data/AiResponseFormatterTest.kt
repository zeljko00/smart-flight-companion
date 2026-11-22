package com.smartflightcompanion.mobile.data

import org.junit.Assert.assertEquals
import org.junit.Test

class AiResponseFormatterTest {

    @Test
    fun `plain text is returned trimmed`() {
        assertEquals("Boarding starts at 10:15.", formatAiResponse("  Boarding starts at 10:15.\n"))
    }

    @Test
    fun `fenced json is flattened into labelled lines without excluded or empty fields`() {
        val raw = """
            ```json
            {"flight_number":"JU500","delay_risk":"low","tips":["Arrive early","Check gate"],"notes":""}
            ```
        """.trimIndent()

        assertEquals(
            "Delay Risk: low\nTips / 1: Arrive early\nTips / 2: Check gate",
            formatAiResponse(raw)
        )
    }

    @Test
    fun `invalid json inside a fence is returned as unwrapped text`() {
        assertEquals("{not json", formatAiResponse("```\n{not json\n```"))
    }
}
