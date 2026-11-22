package com.smartflightcompanion.mobile

import android.content.Context
import android.graphics.Color
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.SideEffect
import com.smartflightcompanion.mobile.data.AppSettings
import com.smartflightcompanion.mobile.data.withAppLanguage
import com.smartflightcompanion.mobile.ui.AppRoot
import com.smartflightcompanion.mobile.ui.theme.SmartFlightCompanionTheme
import com.smartflightcompanion.mobile.ui.theme.isAppInDarkTheme

class MainActivity : ComponentActivity() {
    override fun attachBaseContext(newBase: Context) {
        AppSettings.init(newBase)
        super.attachBaseContext(newBase.withAppLanguage(AppSettings.language()))
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            val darkTheme = isAppInDarkTheme()
            SideEffect {
                val style = SystemBarStyle.auto(Color.TRANSPARENT, Color.TRANSPARENT) { darkTheme }
                enableEdgeToEdge(statusBarStyle = style, navigationBarStyle = style)
            }
            SmartFlightCompanionTheme(darkTheme = darkTheme) {
                AppRoot()
            }
        }
    }
}
