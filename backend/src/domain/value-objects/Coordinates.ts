/**
 * Immutable value object representing geographic coordinates.
 *
 * Uses WGS84 coordinate reference system (EPSG:4326).
 * Latitude/longitude order follows geographic convention (not GeoJSON).
 */
export class Coordinates {
  /** Latitude in degrees (-90 to 90) */
  readonly latitude: number;

  /** Longitude in degrees (-180 to 180) */
  readonly longitude: number;

  /** Elevation in meters above sea level (optional) */
  readonly elevation: number | null;

  constructor(latitude: number, longitude: number, elevation?: number) {
    this.validateLatitude(latitude);
    this.validateLongitude(longitude);

    this.latitude = latitude;
    this.longitude = longitude;
    this.elevation = elevation ?? null;
  }

  /**
   * Creates Coordinates from an object with lat/lon properties
   */
  static from(coords: { lat: number; lon: number; elevation?: number }): Coordinates {
    return new Coordinates(coords.lat, coords.lon, coords.elevation);
  }

  /**
   * Creates Coordinates from a GeoJSON position array [lon, lat] or [lon, lat, elevation]
   */
  static fromGeoJSON(position: [number, number] | [number, number, number]): Coordinates {
    return new Coordinates(position[1], position[0], position[2]);
  }

  /**
   * Converts to GeoJSON position array [lon, lat] or [lon, lat, elevation]
   */
  toGeoJSON(): [number, number] | [number, number, number] {
    if (this.elevation !== null) {
      return [this.longitude, this.latitude, this.elevation];
    }
    return [this.longitude, this.latitude];
  }

  /**
   * Converts to simple object with lat/lon properties
   */
  toObject(): { lat: number; lon: number; elevation?: number } {
    const obj: { lat: number; lon: number; elevation?: number } = {
      lat: this.latitude,
      lon: this.longitude,
    };
    if (this.elevation !== null) {
      obj.elevation = this.elevation;
    }
    return obj;
  }

  /**
   * Checks equality with another Coordinates object
   */
  equals(other: Coordinates): boolean {
    return (
      this.latitude === other.latitude &&
      this.longitude === other.longitude &&
      this.elevation === other.elevation
    );
  }

  /**
   * Checks approximate equality within a tolerance (in degrees)
   */
  approximatelyEquals(other: Coordinates, toleranceDegrees: number = 0.0001): boolean {
    const latDiff = Math.abs(this.latitude - other.latitude);
    const lonDiff = Math.abs(this.longitude - other.longitude);
    return latDiff <= toleranceDegrees && lonDiff <= toleranceDegrees;
  }

  /**
   * Calculates approximate distance to another coordinate in kilometers
   * Uses Haversine formula
   */
  distanceKm(other: Coordinates): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(other.latitude - this.latitude);
    const dLon = this.toRadians(other.longitude - this.longitude);
    const lat1 = this.toRadians(this.latitude);
    const lat2 = this.toRadians(other.latitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Creates a new Coordinates with updated elevation
   */
  withElevation(elevation: number): Coordinates {
    return new Coordinates(this.latitude, this.longitude, elevation);
  }

  /**
   * Returns a formatted string representation
   */
  toString(): string {
    const ns = this.latitude >= 0 ? 'N' : 'S';
    const ew = this.longitude >= 0 ? 'E' : 'W';
    let str = `${Math.abs(this.latitude).toFixed(6)}°${ns}, ${Math.abs(this.longitude).toFixed(6)}°${ew}`;
    if (this.elevation !== null) {
      str += ` (${this.elevation}m)`;
    }
    return str;
  }

  /**
   * Determines the UTM zone for this coordinate
   */
  getUTMZone(): number {
    return Math.floor((this.longitude + 180) / 6) + 1;
  }

  private validateLatitude(lat: number): void {
    if (lat < -90 || lat > 90) {
      throw new Error(`Latitude must be between -90 and 90, got ${lat}`);
    }
  }

  private validateLongitude(lon: number): void {
    if (lon < -180 || lon > 180) {
      throw new Error(`Longitude must be between -180 and 180, got ${lon}`);
    }
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}
