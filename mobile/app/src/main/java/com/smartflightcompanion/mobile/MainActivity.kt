package com.smartflightcompanion.mobile

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.smartflightcompanion.mobile.ui.AppRoot
import com.smartflightcompanion.mobile.ui.theme.SmartFlightCompanionTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            SmartFlightCompanionTheme {
                AppRoot()
            }
        }
    }
}
