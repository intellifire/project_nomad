import type { WeatherData } from '../types/index.js';

/**
 * Returns the preferred default start date (YYYY-MM-DD) for the Temporal step,
 * derived from the first datetime in the imported weather data. Returns
 * undefined when no parsed weather data is available — callers fall back to
 * their own default (typically today).
 */
export function computeDefaultStartDate(weather: WeatherData): string | undefined {
  return weather.firestarrCsvParsed?.dateRange?.minDate;
}
