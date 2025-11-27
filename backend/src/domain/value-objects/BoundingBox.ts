import { Coordinates } from './Coordinates.js';

/**
 * Immutable value object representing a geographic bounding box.
 *
 * Defined by minimum and maximum coordinates (southwest and northeast corners).
 * Uses WGS84 coordinate reference system (EPSG:4326).
 */
export class BoundingBox {
  /** Minimum longitude (western edge) */
  readonly minLon: number;

  /** Minimum latitude (southern edge) */
  readonly minLat: number;

  /** Maximum longitude (eastern edge) */
  readonly maxLon: number;

  /** Maximum latitude (northern edge) */
  readonly maxLat: number;

  constructor(minLon: number, minLat: number, maxLon: number, maxLat: number) {
    this.validateBounds(minLon, minLat, maxLon, maxLat);

    this.minLon = minLon;
    this.minLat = minLat;
    this.maxLon = maxLon;
    this.maxLat = maxLat;
  }

  /**
   * Creates a BoundingBox from southwest and northeast corners
   */
  static fromCorners(southwest: Coordinates, northeast: Coordinates): BoundingBox {
    return new BoundingBox(
      southwest.longitude,
      southwest.latitude,
      northeast.longitude,
      northeast.latitude
    );
  }

  /**
   * Creates a BoundingBox from a center point and radius in kilometers
   */
  static fromCenterAndRadius(center: Coordinates, radiusKm: number): BoundingBox {
    // Approximate degrees per km at this latitude
    const latDegPerKm = 1 / 111.32;
    const lonDegPerKm = 1 / (111.32 * Math.cos(center.latitude * (Math.PI / 180)));

    const latOffset = radiusKm * latDegPerKm;
    const lonOffset = radiusKm * lonDegPerKm;

    return new BoundingBox(
      center.longitude - lonOffset,
      center.latitude - latOffset,
      center.longitude + lonOffset,
      center.latitude + latOffset
    );
  }

  /**
   * Creates a BoundingBox from a GeoJSON bbox array [minLon, minLat, maxLon, maxLat]
   */
  static fromGeoJSON(bbox: [number, number, number, number]): BoundingBox {
    return new BoundingBox(bbox[0], bbox[1], bbox[2], bbox[3]);
  }

  /**
   * Creates a BoundingBox that encompasses all given coordinates
   */
  static fromCoordinates(coordinates: Coordinates[]): BoundingBox {
    if (coordinates.length === 0) {
      throw new Error('Cannot create bounding box from empty coordinates array');
    }

    let minLon = Infinity;
    let minLat = Infinity;
    let maxLon = -Infinity;
    let maxLat = -Infinity;

    for (const coord of coordinates) {
      minLon = Math.min(minLon, coord.longitude);
      minLat = Math.min(minLat, coord.latitude);
      maxLon = Math.max(maxLon, coord.longitude);
      maxLat = Math.max(maxLat, coord.latitude);
    }

    return new BoundingBox(minLon, minLat, maxLon, maxLat);
  }

  /**
   * Gets the southwest corner
   */
  getSouthwest(): Coordinates {
    return new Coordinates(this.minLat, this.minLon);
  }

  /**
   * Gets the northeast corner
   */
  getNortheast(): Coordinates {
    return new Coordinates(this.maxLat, this.maxLon);
  }

  /**
   * Gets the center point
   */
  getCenter(): Coordinates {
    return new Coordinates(
      (this.minLat + this.maxLat) / 2,
      (this.minLon + this.maxLon) / 2
    );
  }

  /**
   * Gets the width in degrees
   */
  getWidthDegrees(): number {
    return this.maxLon - this.minLon;
  }

  /**
   * Gets the height in degrees
   */
  getHeightDegrees(): number {
    return this.maxLat - this.minLat;
  }

  /**
   * Gets approximate width in kilometers
   */
  getWidthKm(): number {
    const centerLat = (this.minLat + this.maxLat) / 2;
    const kmPerDegLon = 111.32 * Math.cos(centerLat * (Math.PI / 180));
    return this.getWidthDegrees() * kmPerDegLon;
  }

  /**
   * Gets approximate height in kilometers
   */
  getHeightKm(): number {
    return this.getHeightDegrees() * 111.32;
  }

  /**
   * Gets approximate area in square kilometers
   */
  getAreaKm2(): number {
    return this.getWidthKm() * this.getHeightKm();
  }

  /**
   * Checks if a coordinate is within this bounding box
   */
  contains(coord: Coordinates): boolean {
    return (
      coord.longitude >= this.minLon &&
      coord.longitude <= this.maxLon &&
      coord.latitude >= this.minLat &&
      coord.latitude <= this.maxLat
    );
  }

  /**
   * Checks if this bounding box intersects with another
   */
  intersects(other: BoundingBox): boolean {
    return !(
      other.minLon > this.maxLon ||
      other.maxLon < this.minLon ||
      other.minLat > this.maxLat ||
      other.maxLat < this.minLat
    );
  }

  /**
   * Creates a new bounding box that encompasses both this and another
   */
  union(other: BoundingBox): BoundingBox {
    return new BoundingBox(
      Math.min(this.minLon, other.minLon),
      Math.min(this.minLat, other.minLat),
      Math.max(this.maxLon, other.maxLon),
      Math.max(this.maxLat, other.maxLat)
    );
  }

  /**
   * Creates a new bounding box expanded by a buffer in kilometers
   */
  buffer(bufferKm: number): BoundingBox {
    const centerLat = (this.minLat + this.maxLat) / 2;
    const latDegPerKm = 1 / 111.32;
    const lonDegPerKm = 1 / (111.32 * Math.cos(centerLat * (Math.PI / 180)));

    const latBuffer = bufferKm * latDegPerKm;
    const lonBuffer = bufferKm * lonDegPerKm;

    return new BoundingBox(
      this.minLon - lonBuffer,
      this.minLat - latBuffer,
      this.maxLon + lonBuffer,
      this.maxLat + latBuffer
    );
  }

  /**
   * Checks equality with another BoundingBox
   */
  equals(other: BoundingBox): boolean {
    return (
      this.minLon === other.minLon &&
      this.minLat === other.minLat &&
      this.maxLon === other.maxLon &&
      this.maxLat === other.maxLat
    );
  }

  /**
   * Converts to GeoJSON bbox array [minLon, minLat, maxLon, maxLat]
   */
  toGeoJSON(): [number, number, number, number] {
    return [this.minLon, this.minLat, this.maxLon, this.maxLat];
  }

  /**
   * Converts to GeoJSON Polygon geometry
   */
  toGeoJSONPolygon(): {
    type: 'Polygon';
    coordinates: [[[number, number], [number, number], [number, number], [number, number], [number, number]]];
  } {
    return {
      type: 'Polygon',
      coordinates: [[
        [this.minLon, this.minLat],
        [this.maxLon, this.minLat],
        [this.maxLon, this.maxLat],
        [this.minLon, this.maxLat],
        [this.minLon, this.minLat],
      ]],
    };
  }

  /**
   * Returns a formatted string representation
   */
  toString(): string {
    return `[${this.minLon.toFixed(4)}, ${this.minLat.toFixed(4)}, ${this.maxLon.toFixed(4)}, ${this.maxLat.toFixed(4)}]`;
  }

  private validateBounds(minLon: number, minLat: number, maxLon: number, maxLat: number): void {
    if (minLon < -180 || minLon > 180) {
      throw new Error(`Min longitude must be between -180 and 180, got ${minLon}`);
    }
    if (maxLon < -180 || maxLon > 180) {
      throw new Error(`Max longitude must be between -180 and 180, got ${maxLon}`);
    }
    if (minLat < -90 || minLat > 90) {
      throw new Error(`Min latitude must be between -90 and 90, got ${minLat}`);
    }
    if (maxLat < -90 || maxLat > 90) {
      throw new Error(`Max latitude must be between -90 and 90, got ${maxLat}`);
    }
    if (minLon > maxLon) {
      throw new Error(`Min longitude (${minLon}) cannot be greater than max longitude (${maxLon})`);
    }
    if (minLat > maxLat) {
      throw new Error(`Min latitude (${minLat}) cannot be greater than max latitude (${maxLat})`);
    }
  }
}
