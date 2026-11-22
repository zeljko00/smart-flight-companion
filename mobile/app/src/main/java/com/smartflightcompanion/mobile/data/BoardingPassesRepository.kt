package com.smartflightcompanion.mobile.data

import com.smartflightcompanion.mobile.data.api.ApiClient
import com.smartflightcompanion.mobile.data.api.UserApi
import com.smartflightcompanion.mobile.data.api.apiCall
import com.smartflightcompanion.mobile.domain.model.BoardingPass
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File

class BoardingPassesRepository(private val api: UserApi = ApiClient.userApi) {

    suspend fun getMine(): List<BoardingPass> =
        apiCall { api.boardingPasses() }
            .mapNotNull { it.toDomain() }
            .sortedByDescending { it.issuedAt?.toInstant() }

    suspend fun downloadPdf(id: String, directory: File): File {
        val body = apiCall { api.boardingPassPdf(id) }
        return withContext(Dispatchers.IO) {
            directory.mkdirs()
            val target = File(directory, "boarding-pass-${id.filter { it.isLetterOrDigit() || it == '-' }}.pdf")
            body.use { responseBody ->
                target.outputStream().use { output -> responseBody.byteStream().copyTo(output) }
            }
            target
        }
    }
}
