package com.smartflightcompanion.mobile.domain.model

import java.time.LocalDate

enum class WeatherCondition { ClearSky, MainlyClear, PartlyCloudy, Overcast, Fog, Drizzle, Rain, Snow, Thunderstorm, Unknown;

    companion object {
        fun fromCode(code: Int): WeatherCondition = when (code) {
            0 -> ClearSky
            1 -> MainlyClear
            2 -> PartlyCloudy
            3 -> Overcast
            45, 48 -> Fog
            51, 53, 55, 56, 57 -> Drizzle
            61, 63, 65, 66, 67, 80, 81, 82 -> Rain
            71, 73, 75, 77, 85, 86 -> Snow
            95, 96, 99 -> Thunderstorm
            else -> Unknown
        }
    }
}

data class WeatherDay(
    val date: LocalDate?,
    val dateText: String,
    val minCelsius: Double,
    val maxCelsius: Double,
    val condition: WeatherCondition
)

data class CityWeather(
    val city: String,
    val country: String,
    val days: List<WeatherDay>
)
