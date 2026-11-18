package com.smartflightcompanion.mobile.data

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.smartflightcompanion.mobile.MainActivity
import com.smartflightcompanion.mobile.R

private const val CHANNEL_ID = "flight_notifications"

/** Shows backend notifications as Android system notifications. */
class SystemNotifier(context: Context) {
    private val appContext = context.applicationContext

    init {
        val channel = NotificationChannel(
            CHANNEL_ID,
            appContext.getString(R.string.notifications_channel_name),
            NotificationManager.IMPORTANCE_HIGH
        )
        appContext.getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
    }

    fun show(title: String, message: String) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(appContext, Manifest.permission.POST_NOTIFICATIONS) !=
            PackageManager.PERMISSION_GRANTED
        ) return

        val openApp = PendingIntent.getActivity(
            appContext,
            0,
            Intent(appContext, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
        val notification = NotificationCompat.Builder(appContext, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title)
            .setContentText(message)
            .setStyle(NotificationCompat.BigTextStyle().bigText(message))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(openApp)
            .build()
        NotificationManagerCompat.from(appContext).notify(System.nanoTime().toInt(), notification)
    }
}
