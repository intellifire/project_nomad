import { SpatialGeometry, FuelType } from '../../domain/entities/index.js';
import { Coordinates, BoundingBox } from '../../domain/value-objects/index.js';

/**
 * Elevation data for a location
 */
export interface ElevationData {
  /** Elevation in meters */
  readonly elevation: number;
  /** Slope in degrees */
  readonly slope: number;
  /** Aspect in degrees (0-360, 0=North) */
  readonly aspect: number;
  /** Data source/resolution info */
  readonly source: string;
}

/**
 * Fuel type data for a location
 */
export interface FuelTypeData {
  /** Primary fuel type at location */
  readonly fuelType: FuelType;
  /** Confidence/reliability score (0-1) */
  readonly confidence: number;
  /** Data source info */
  readonly source: string;
  /** Date of fuel classification */
  readonly classificationDate?: Date;
}

/**
 * Result of a spatial query
 */
export interface SpatialQueryResult<T> {
  /** Query results */
  readonly items: T[];
  /** Total count (may be more than returned items) */
  readonly totalCount: number;
  /** Bounding box of results */
  readonly bounds: BoundingBox;
}

/**
 * Options for spatial queries
 */
export interface SpatialQueryOptions {
  /** Maximum results to return */
  readonly limit?: number;
  /** Offset for pagination */
  readonly offset?: number;
  /** Buffer distance in meters */
  readonly bufferMeters?: number;
}

/**
 * Interface for spatial data repositories.
 *
 * Handles access to:
 * - Digital Elevation Model (DEM) data
 * - Fuel type grids
 * - Fire perimeters and boundaries
 * - Fire management zones
 * - Spatial queries
 */
export interface ISpatialRepository {
  /**
   * Gets elevation data for a location.
   *
   * @param location - Geographic coordinates
   * @returns Elevation, slope, and aspect data
   */
  getElevation(location: Coordinates): Promise<ElevationData>;

  /**
   * Gets fuel type at a location.
   *
   * @param location - Geographic coordinates
   * @returns Fuel type data
   */
  getFuelType(location: Coordinates): Promise<FuelTypeData>;

  /**
   * Checks if a location is burnable (has valid fuel type).
   *
   * @param location - Geographic coordinates
   * @returns Whether the location has burnable fuel
   */
  isBurnable(location: Coordinates): Promise<boolean>;

  /**
   * Gets the UTM zone for a location.
   *
   * @param location - Geographic coordinates
   * @returns UTM zone number
   */
  getUTMZone(location: Coordinates): number;

  /**
   * Checks if DEM/fuel grids exist for a UTM zone.
   *
   * @param utmZone - UTM zone number
   * @returns Whether grids are available
   */
  hasGridsForZone(utmZone: number): Promise<boolean>;

  /**
   * Transforms geometry between coordinate systems.
   *
   * @param geometry - Input geometry
   * @param fromCRS - Source CRS (e.g., 'EPSG:4326')
   * @param toCRS - Target CRS (e.g., 'EPSG:32610')
   * @returns Transformed geometry
   */
  transformGeometry(
    geometry: SpatialGeometry,
    fromCRS: string,
    toCRS: string
  ): Promise<SpatialGeometry>;

  /**
   * Finds geometries within a distance of a point.
   *
   * @param location - Center point
   * @param radiusMeters - Search radius in meters
   * @param geometryType - Type of geometry to find
   * @param options - Query options
   * @returns Matching geometries
   */
  findWithinDistance(
    location: Coordinates,
    radiusMeters: number,
    geometryType: string,
    options?: SpatialQueryOptions
  ): Promise<SpatialQueryResult<SpatialGeometry>>;

  /**
   * Finds geometries intersecting a bounding box.
   *
   * @param bounds - Bounding box to search
   * @param geometryType - Type of geometry to find
   * @param options - Query options
   * @returns Matching geometries
   */
  findIntersecting(
    bounds: BoundingBox,
    geometryType: string,
    options?: SpatialQueryOptions
  ): Promise<SpatialQueryResult<SpatialGeometry>>;

  /**
   * Calculates the area of a geometry in hectares.
   *
   * @param geometry - Geometry to measure
   * @returns Area in hectares
   */
  calculateAreaHectares(geometry: SpatialGeometry): Promise<number>;

  /**
   * Calculates the perimeter/length of a geometry in meters.
   *
   * @param geometry - Geometry to measure
   * @returns Length/perimeter in meters
   */
  calculateLengthMeters(geometry: SpatialGeometry): Promise<number>;

  /**
   * Generates a buffer around a geometry.
   *
   * @param geometry - Input geometry
   * @param bufferMeters - Buffer distance in meters
   * @returns Buffered geometry
   */
  buffer(geometry: SpatialGeometry, bufferMeters: number): Promise<SpatialGeometry>;

  /**
   * Simplifies a geometry while preserving topology.
   *
   * @param geometry - Input geometry
   * @param toleranceMeters - Simplification tolerance
   * @returns Simplified geometry
   */
  simplify(geometry: SpatialGeometry, toleranceMeters: number): Promise<SpatialGeometry>;
}
