package com.smartflightcompanion.mobile.ui.screens.flight

import kotlin.math.cos
import kotlin.math.hypot
import kotlin.math.max

data class GeoPoint(val latitude: Double, val longitude: Double)

private const val ARC_STEPS = 46
private const val MIN_COS_LAT = 0.2
private const val MIN_DISTANCE = 0.00001
private const val BEND_FACTOR = 0.22
private const val MIN_BEND = 0.8
private const val MAX_BEND = 6.0

fun buildRouteArc(start: GeoPoint, end: GeoPoint): List<GeoPoint> {
    val avgLatRad = Math.toRadians((start.latitude + end.latitude) / 2)
    val cosLat = max(cos(avgLatRad), MIN_COS_LAT)
    val dx = (end.longitude - start.longitude) * cosLat
    val dy = end.latitude - start.latitude
    val distance = hypot(dx, dy)
    if (distance < MIN_DISTANCE) return listOf(start, end)

    val bend = (distance * BEND_FACTOR).coerceIn(MIN_BEND, MAX_BEND)
    val controlLat = (start.latitude + end.latitude) / 2 + (dx / distance) * bend
    val controlLng = (start.longitude + end.longitude) / 2 + (-dy / distance) * bend / cosLat

    return (0..ARC_STEPS).map { i ->
        val t = i.toDouble() / ARC_STEPS
        val u = 1 - t
        GeoPoint(
            latitude = u * u * start.latitude + 2 * u * t * controlLat + t * t * end.latitude,
            longitude = u * u * start.longitude + 2 * u * t * controlLng + t * t * end.longitude
        )
    }
}

fun List<GeoPoint>.bounds(): Pair<GeoPoint, GeoPoint> = Pair(
    GeoPoint(minOf { it.latitude }, minOf { it.longitude }),
    GeoPoint(maxOf { it.latitude }, maxOf { it.longitude })
)
