package com.smartflightcompanion.mobile.ui.screens.flight

import android.annotation.SuppressLint
import android.content.Context
import android.view.MotionEvent
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import org.osmdroid.config.Configuration
import org.osmdroid.tileprovider.tilesource.TileSourceFactory
import org.osmdroid.util.BoundingBox
import org.osmdroid.views.MapView
import org.osmdroid.views.overlay.Marker
import org.osmdroid.views.overlay.Polyline
import java.io.File
import org.osmdroid.util.GeoPoint as OsmPoint

private val MAP_HEIGHT = 260.dp
private const val ROUTE_WIDTH = 6f
private const val BOUNDS_PADDING_PX = 80

@SuppressLint("ClickableViewAccessibility")
@Composable
fun RouteMap(
    departure: GeoPoint,
    arrival: GeoPoint,
    departureTitle: String,
    arrivalTitle: String,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val lifecycle = LocalLifecycleOwner.current.lifecycle
    val routeColor = MaterialTheme.colorScheme.primary.toArgb()
    val mapView = remember { createMapView(context) }

    DisposableEffect(lifecycle, mapView) {
        val observer = LifecycleEventObserver { _, event ->
            when (event) {
                Lifecycle.Event.ON_RESUME -> mapView.onResume()
                Lifecycle.Event.ON_PAUSE -> mapView.onPause()
                else -> Unit
            }
        }
        lifecycle.addObserver(observer)
        if (lifecycle.currentState.isAtLeast(Lifecycle.State.RESUMED)) mapView.onResume()
        onDispose {
            lifecycle.removeObserver(observer)
            mapView.onDetach()
        }
    }

    AndroidView(
        modifier = modifier
            .fillMaxWidth()
            .height(MAP_HEIGHT)
            .clip(RoundedCornerShape(12.dp)),
        factory = { mapView },
        update = { view ->
            val arc = buildRouteArc(departure, arrival)
            view.overlays.clear()
            view.overlays.add(
                Polyline(view).apply {
                    setPoints(arc.map { OsmPoint(it.latitude, it.longitude) })
                    outlinePaint.color = routeColor
                    outlinePaint.strokeWidth = ROUTE_WIDTH
                }
            )
            listOf(departure to departureTitle, arrival to arrivalTitle).forEach { (point, title) ->
                view.overlays.add(
                    Marker(view).apply {
                        position = OsmPoint(point.latitude, point.longitude)
                        this.title = title
                        setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_BOTTOM)
                    }
                )
            }
            val (southWest, northEast) = arc.bounds()
            val box = BoundingBox(northEast.latitude, northEast.longitude, southWest.latitude, southWest.longitude)
            view.post { view.zoomToBoundingBox(box, false, BOUNDS_PADDING_PX) }
            view.invalidate()
        }
    )
}

@SuppressLint("ClickableViewAccessibility")
private fun createMapView(context: Context): MapView {
    Configuration.getInstance().apply {
        userAgentValue = context.packageName
        osmdroidBasePath = File(context.cacheDir, "osmdroid")
        osmdroidTileCache = File(osmdroidBasePath, "tiles")
    }
    return MapView(context).apply {
        setTileSource(TileSourceFactory.MAPNIK)
        setMultiTouchControls(true)
        setOnTouchListener { view, event ->
            if (event.actionMasked == MotionEvent.ACTION_DOWN) view.parent.requestDisallowInterceptTouchEvent(true)
            false
        }
    }
}
