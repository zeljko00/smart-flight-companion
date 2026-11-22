package com.smartflightcompanion.mobile.data

import android.content.ContentValues
import android.content.Context
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File

private const val PDF_MIME_TYPE = "application/pdf"

object DownloadsSaver {
    suspend fun savePdf(context: Context, file: File) = withContext(Dispatchers.IO) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) saveWithMediaStore(context, file) else saveLegacy(context, file)
    }

    private fun saveWithMediaStore(context: Context, file: File) {
        val resolver = context.contentResolver
        val values = ContentValues().apply {
            put(MediaStore.Downloads.DISPLAY_NAME, file.name)
            put(MediaStore.Downloads.MIME_TYPE, PDF_MIME_TYPE)
            put(MediaStore.Downloads.IS_PENDING, 1)
        }
        val uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values)
            ?: error("Unable to create Downloads entry")
        try {
            resolver.openOutputStream(uri)?.use { output -> file.inputStream().use { it.copyTo(output) } }
                ?: error("Unable to open Downloads entry")
            resolver.update(uri, ContentValues().apply { put(MediaStore.Downloads.IS_PENDING, 0) }, null, null)
        } catch (e: Exception) {
            resolver.delete(uri, null, null)
            throw e
        }
    }

    private fun saveLegacy(context: Context, file: File) {
        val directory = context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS) ?: error("No storage available")
        file.copyTo(File(directory, file.name), overwrite = true)
    }
}
