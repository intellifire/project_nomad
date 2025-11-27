import { DomainError } from './DomainError.js';

/**
 * Error for requested resources that don't exist.
 *
 * Used when:
 * - Entity lookup by ID fails
 * - Referenced resource doesn't exist
 * - Required data is missing from external source
 */
export class NotFoundError extends DomainError {
  readonly code = 'NOT_FOUND';
  readonly httpStatus = 404;

  /**
   * Type of resource that wasn't found
   */
  readonly resourceType: string;

  /**
   * Identifier used in the lookup
   */
  readonly resourceId: string;

  constructor(
    resourceType: string,
    resourceId: string,
    message?: string,
    context?: Record<string, unknown>
  ) {
    super(message ?? `${resourceType} not found: ${resourceId}`, context);
    this.resourceType = resourceType;
    this.resourceId = resourceId;
  }

  /**
   * Creates a NotFoundError for a FireModel
   */
  static fireModel(id: string): NotFoundError {
    return new NotFoundError('FireModel', id);
  }

  /**
   * Creates a NotFoundError for a ModelResult
   */
  static modelResult(id: string): NotFoundError {
    return new NotFoundError('ModelResult', id);
  }

  /**
   * Creates a NotFoundError for weather data
   */
  static weatherData(location: string, timeRange: string): NotFoundError {
    return new NotFoundError(
      'WeatherData',
      `${location}/${timeRange}`,
      `Weather data not available for location ${location} during ${timeRange}`
    );
  }

  /**
   * Creates a NotFoundError for fuel/DEM grids
   */
  static grids(utmZone: number): NotFoundError {
    return new NotFoundError(
      'Grids',
      `UTM${utmZone}`,
      `Fuel and DEM grids not available for UTM zone ${utmZone}`
    );
  }

  /**
   * Creates a NotFoundError for configuration
   */
  static configuration(key: string): NotFoundError {
    return new NotFoundError('Configuration', key, `Configuration not found: ${key}`);
  }

  override toJSON(): {
    name: string;
    code: string;
    message: string;
    resourceType: string;
    resourceId: string;
    context?: Record<string, unknown>;
  } {
    return {
      ...super.toJSON(),
      resourceType: this.resourceType,
      resourceId: this.resourceId,
    };
  }
}
