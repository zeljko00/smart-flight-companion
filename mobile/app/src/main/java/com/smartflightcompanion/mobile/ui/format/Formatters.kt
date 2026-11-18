package com.smartflightcompanion.mobile.ui.format

import androidx.compose.runtime.Composable
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.ui.platform.LocalConfiguration
import androidx.core.os.ConfigurationCompat
import java.text.NumberFormat
import java.time.LocalDate
import java.time.OffsetDateTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.format.FormatStyle
import java.util.Currency
import java.util.Locale

private const val PRICE_CURRENCY = "EUR"
private const val MAX_PRICE_FRACTION_DIGITS = 2

@Composable
@ReadOnlyComposable
fun currentLocale(): Locale =
    ConfigurationCompat.getLocales(LocalConfiguration.current)[0] ?: Locale.getDefault()

/** Date and time in the device time zone, like `Intl.DateTimeFormat` on the web. */
fun OffsetDateTime.formatDateTime(locale: Locale, dateStyle: FormatStyle = FormatStyle.MEDIUM): String =
    DateTimeFormatter.ofLocalizedDateTime(dateStyle, FormatStyle.SHORT)
        .withLocale(locale)
        .format(atZoneSameInstant(ZoneId.systemDefault()))

fun LocalDate.formatDate(locale: Locale): String =
    DateTimeFormatter.ofLocalizedDate(FormatStyle.MEDIUM).withLocale(locale).format(this)

fun Double.formatEuro(locale: Locale): String =
    NumberFormat.getCurrencyInstance(locale).apply {
        currency = Currency.getInstance(PRICE_CURRENCY)
        maximumFractionDigits = MAX_PRICE_FRACTION_DIGITS
    }.format(this)
