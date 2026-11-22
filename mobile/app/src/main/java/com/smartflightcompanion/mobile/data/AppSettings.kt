package com.smartflightcompanion.mobile.data

import android.content.Context
import android.content.SharedPreferences
import android.content.res.Configuration
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.util.Locale

private const val PREFS_NAME = "app_settings"
private const val KEY_LANGUAGE = "language"
private const val KEY_DARK_THEME = "dark_theme"

enum class AppLanguage(val code: String) {
    English("en"),
    Serbian("sr");

    companion object {
        fun fromCode(code: String?): AppLanguage? = entries.firstOrNull { it.code == code }
    }
}

object AppSettings {
    private lateinit var prefs: SharedPreferences
    private val _darkTheme = MutableStateFlow<Boolean?>(null)

    val darkTheme: StateFlow<Boolean?> = _darkTheme.asStateFlow()

    fun init(context: Context) {
        if (::prefs.isInitialized) return
        prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        _darkTheme.value = if (prefs.contains(KEY_DARK_THEME)) prefs.getBoolean(KEY_DARK_THEME, false) else null
    }

    fun language(): AppLanguage =
        AppLanguage.fromCode(prefs.getString(KEY_LANGUAGE, null))
            ?: AppLanguage.fromCode(Locale.getDefault().language)
            ?: AppLanguage.English

    fun setLanguage(language: AppLanguage) {
        prefs.edit().putString(KEY_LANGUAGE, language.code).apply()
    }

    fun setDarkTheme(enabled: Boolean) {
        prefs.edit().putBoolean(KEY_DARK_THEME, enabled).apply()
        _darkTheme.value = enabled
    }
}

fun Context.withAppLanguage(language: AppLanguage): Context {
    val locale = Locale(language.code)
    Locale.setDefault(locale)
    val configuration = Configuration(resources.configuration).apply { setLocale(locale) }
    return createConfigurationContext(configuration)
}
