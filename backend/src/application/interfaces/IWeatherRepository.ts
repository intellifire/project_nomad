import { WeatherData } from '../../domain/entities/index.js';
import { Coordinates, TimeRange, FWIIndices } from '../../domain/value-objects/index.js';

/**
 * Weather data source types
 */
export type WeatherSourceType = 'forecast' | 'historical' | 'station';

/**
 * Information about a weather data source
 */
export interface WeatherSource {
  /** Source identifier */
  readonly id: string;
  /** Human-readable name */
  readonly name: string;
  /** Type of data source */
  readonly type: WeatherSourceType;
  /** Provider/agency name */
  readonly provider: string;
  /** Maximum forecast hours (for forecast sources) */
  readonly maxForecastHours?: number;
  /** Historical data availability start date */
  readonly historicalStartDate?: Date;
}

/**
 * Options for fetching weather data
 */
export interface WeatherFetchOptions {
  /** Preferred data source (optional, system will choose if not specified) */
  readonly sourceId?: string;
  /** Whether to include FWI calculations */
  readonly includeFWI?: boolean;
  /** Previous day's FWI indices for calculation continuity */
  readonly previousDayFWI?: FWIIndices;
  /** Hourly interval (default 1) */
  readonly intervalHours?: number;
}

/**
 * Result of a weather data fetch operation
 */
export interface WeatherFetchResult {
  /** Weather observations/forecasts */
  readonly data: WeatherData[];
  /** Source that provided the data */
  readonly source: WeatherSource;
  /** Whether data includes FWI calculations */
  readonly hasFWI: boolean;
  /** Gaps in coverage (if any) */
  readonly gaps?: TimeRange[];
  /** Warnings about data quality */
  readonly warnings?: string[];
}

/**
 * Interface for weather data repositories.
 *
 * Implementations handle fetching weather data from various sources:
 * - SpotWX API for forecasts
 * - ECCC historical archives
 * - Agency weather stations
 * - CWFIS for FWI initialization values
 */
export interface IWeatherRepository {
  /**
   * Gets available weather sources for a location.
   *
   * @param location - Coordinates to check
   * @returns Available weather sources
   */
  getAvailableSources(location: Coordinates): Promise<WeatherSource[]>;

  /**
   * Fetches weather data for a location and time range.
   *
   * @param location - Geographic coordinates
   * @param timeRange - Time period to fetch
   * @param options - Fetch options
   * @returns Weather data with metadata
   */
  fetchWeather(
    location: Coordinates,
    timeRange: TimeRange,
    options?: WeatherFetchOptions
  ): Promise<WeatherFetchResult>;

  /**
   * Fetches FWI initialization values from CWFIS or defaults.
   *
   * @param location - Geographic coordinates
   * @param date - Date for FWI values
   * @returns FWI indices for the specified date
   */
  fetchFWIInitialization(location: Coordinates, date: Date): Promise<FWIIndices>;

  /**
   * Checks if weather data is available for a location and time range.
   *
   * @param location - Geographic coordinates
   * @param timeRange - Time period to check
   * @returns Availability status
   */
  checkAvailability(
    location: Coordinates,
    timeRange: TimeRange
  ): Promise<{
    available: boolean;
    sources: WeatherSource[];
    coverage: number; // 0-1, percentage of time range covered
  }>;

  /**
   * Calculates FWI indices for raw weather data.
   *
   * @param weatherData - Weather observations without FWI
   * @param initialFWI - Starting FWI values
   * @returns Weather data with calculated FWI
   */
  calculateFWI(weatherData: WeatherData[], initialFWI: FWIIndices): Promise<WeatherData[]>;
}
