package com.smartflightcompanion.mobile.domain.model

import java.time.OffsetDateTime

enum class SeatClass { Economy, PremiumEconomy, Business, FirstClass }

data class BoardingPass(
    val id: String,
    val flightId: String?,
    val flightNumber: String,
    val airline: String,
    val fromLabel: String,
    val toLabel: String,
    val departureAt: OffsetDateTime?,
    val seat: SeatClass?,
    val price: Double?,
    val issuedAt: OffsetDateTime?,
    val isValid: Boolean
)
