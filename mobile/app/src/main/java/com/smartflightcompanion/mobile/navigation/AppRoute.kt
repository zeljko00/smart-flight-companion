package com.smartflightcompanion.mobile.navigation

import android.net.Uri

sealed class AppRoute(val path: String) {
    data object Welcome : AppRoute("welcome")
    data object Register : AppRoute("register")
    data object Home : AppRoute("home")
    data object FlightDetails : AppRoute("flights/{flightId}") {
        const val ARG_FLIGHT_ID = "flightId"
        fun create(flightId: String): String = "flights/${Uri.encode(flightId)}"
    }
}
