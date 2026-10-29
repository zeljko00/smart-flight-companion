import { apiRequest } from './apiClient'

export type WeatherForecastDay = {
  date: string
  minTemperatureCelsius: number
  maxTemperatureCelsius: number
  weatherCode: number
}

export type CityWeatherForecast = {
  city: string
  country: string
  countryCode: string
  forecast: WeatherForecastDay[]
}

export async function fetchDestinationWeatherForecast(
  lat: number,
  lng: number,
): Promise<CityWeatherForecast[]> {
  const queryParams = new URLSearchParams({
    lat: lat.toString(),
    lng: lng.toString(),
  })

  return await apiRequest<CityWeatherForecast[]>(`/weather/destination?${queryParams.toString()}`)
}
