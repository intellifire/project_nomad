import type { WeatherData } from '../types/index.js';

/**
 * Returns the date range of the imported weather data, regardless of source
 * (FireSTARR CSV, raw weather, or SpotWX). Returns undefined when no parsed
 * weather is available.
 */
export function computeWeatherDateRange(
  weather: WeatherData,
): { minDate: string; maxDate: string } | undefined {
  return (
    weather.firestarrCsvParsed?.dateRange ??
    weather.rawWeatherParsed?.dateRange ??
    weather.spotwxParsed?.dateRange
  );
}

/**
 * Returns the preferred default start date (YYYY-MM-DD) for the Temporal step,
 * derived from the first datetime in the imported weather data. Returns
 * undefined when no parsed weather data is available — callers fall back to
 * their own default (typically today).
 */
export function computeDefaultStartDate(weather: WeatherData): string | undefined {
  return computeWeatherDateRange(weather)?.minDate;
}
