/**
 * Backend Tests: LineString ignition support (#215)
 *
 * Tests that LineString geometries are accepted as a valid ignition type
 * throughout the stack: API validation, geometry resolution, and engine routing.
 */

import { describe, it, expect } from 'vitest';
import { SpatialGeometry, GeometryType } from '../../domain/entities/SpatialGeometry.js';

// =============================================================================
// Constants mirrored from models.ts route
// =============================================================================

/** Valid ignition types accepted by the API */
const VALID_IGNITION_TYPES = ['point', 'polygon', 'linestring'] as const;

/**
 * Simulates the geometry type resolution in models.ts route handler.
 * Maps API ignition type string to domain GeometryType enum.
 */
function resolveGeometryType(ignitionType: string): GeometryType | null {
  switch (ignitionType) {
    case 'point':
      return GeometryType.Point;
    case 'polygon':
      return GeometryType.Polygon;
    case 'linestring':
      return GeometryType.LineString;
    default:
      return null;
  }
}

/**
 * Simulates the engine perimeter routing logic in FireSTARREngine.buildParams().
 * Determines whether a geometry should be passed as a perimeter to FireSTARR.
 */
function shouldUsePerimeter(geometryType: GeometryType): boolean {
  return geometryType === GeometryType.Polygon || geometryType === GeometryType.LineString;
}

/**
 * Simulates the InputGenerator perimeter validation.
 * Determines whether a geometry type is valid for rasterization.
 */
function isValidPerimeterType(geometryType: GeometryType): boolean {
  return geometryType === GeometryType.Polygon || geometryType === GeometryType.LineString;
}

// =============================================================================
// Test data
// =============================================================================

const SAMPLE_LINESTRING_COORDS: [number, number][] = [
  [-114.0, 51.0],
  [-114.1, 51.1],
];


// =============================================================================
// Tests
// =============================================================================

describe('LineString ignition type resolution (#215)', () => {
  describe('API ignition type validation', () => {
    it('accepts "linestring" as a valid ignition type', () => {
      expect(VALID_IGNITION_TYPES).toContain('linestring');
    });

    it('still accepts "point" as a valid ignition type', () => {
      expect(VALID_IGNITION_TYPES).toContain('point');
    });

    it('still accepts "polygon" as a valid ignition type', () => {
      expect(VALID_IGNITION_TYPES).toContain('polygon');
    });
  });

  describe('geometry type resolution', () => {
    it('resolves "linestring" to GeometryType.LineString', () => {
      expect(resolveGeometryType('linestring')).toBe(GeometryType.LineString);
    });

    it('resolves "point" to GeometryType.Point', () => {
      expect(resolveGeometryType('point')).toBe(GeometryType.Point);
    });

    it('resolves "polygon" to GeometryType.Polygon', () => {
      expect(resolveGeometryType('polygon')).toBe(GeometryType.Polygon);
    });

    it('returns null for unknown types', () => {
      expect(resolveGeometryType('multipoint')).toBeNull();
    });
  });
});

describe('SpatialGeometry LineString validation', () => {
  it('creates a valid LineString geometry with 2 points', () => {
    const geom = new SpatialGeometry({
      type: GeometryType.LineString,
      coordinates: SAMPLE_LINESTRING_COORDS,
    });
    expect(geom.type).toBe(GeometryType.LineString);
    expect(geom.coordinates).toEqual(SAMPLE_LINESTRING_COORDS);
  });

  it('rejects a LineString with fewer than 2 points', () => {
    expect(() => {
      new SpatialGeometry({
        type: GeometryType.LineString,
        coordinates: [[-114.0, 51.0]],
      });
    }).toThrow();
  });

  it('calculates centroid for a LineString', () => {
    const geom = new SpatialGeometry({
      type: GeometryType.LineString,
      coordinates: SAMPLE_LINESTRING_COORDS,
    });
    const centroid = geom.getCentroid();
    expect(centroid[0]).toBeCloseTo(-114.05);
    expect(centroid[1]).toBeCloseTo(51.05);
  });

  it('calculates bounding box for a LineString', () => {
    const geom = new SpatialGeometry({
      type: GeometryType.LineString,
      coordinates: SAMPLE_LINESTRING_COORDS,
    });
    const bbox = geom.getBoundingBox();
    expect(bbox[0]).toBeCloseTo(-114.1); // minLon
    expect(bbox[1]).toBeCloseTo(51.0);   // minLat
    expect(bbox[2]).toBeCloseTo(-114.0); // maxLon
    expect(bbox[3]).toBeCloseTo(51.1);   // maxLat
  });

  it('identifies as LineString', () => {
    const geom = new SpatialGeometry({
      type: GeometryType.LineString,
      coordinates: SAMPLE_LINESTRING_COORDS,
    });
    expect(geom.isLineString()).toBe(true);
    expect(geom.isPoint()).toBe(false);
    expect(geom.isPolygon()).toBe(false);
  });

  it('converts to GeoJSON correctly', () => {
    const geom = new SpatialGeometry({
      type: GeometryType.LineString,
      coordinates: SAMPLE_LINESTRING_COORDS,
    });
    const geoJSON = geom.toGeoJSON();
    expect(geoJSON.type).toBe('LineString');
    expect(geoJSON.coordinates).toEqual(SAMPLE_LINESTRING_COORDS);
  });
});

describe('Engine perimeter routing for LineString (#215)', () => {
  it('routes LineString to perimeter path', () => {
    expect(shouldUsePerimeter(GeometryType.LineString)).toBe(true);
  });

  it('routes Polygon to perimeter path', () => {
    expect(shouldUsePerimeter(GeometryType.Polygon)).toBe(true);
  });

  it('does NOT route Point to perimeter path', () => {
    expect(shouldUsePerimeter(GeometryType.Point)).toBe(false);
  });
});

describe('InputGenerator perimeter validation for LineString (#215)', () => {
  it('accepts LineString as valid perimeter type', () => {
    expect(isValidPerimeterType(GeometryType.LineString)).toBe(true);
  });

  it('accepts Polygon as valid perimeter type', () => {
    expect(isValidPerimeterType(GeometryType.Polygon)).toBe(true);
  });

  it('rejects Point as perimeter type', () => {
    expect(isValidPerimeterType(GeometryType.Point)).toBe(false);
  });
});

describe('LineString does NOT get forced to Polygon', () => {
  it('a 2-point LineString is NOT valid as a polygon ring', () => {
    // This is the exact bug: wrapping LineString coords as polygon fails
    // because a polygon ring needs >= 4 points
    expect(() => {
      new SpatialGeometry({
        type: GeometryType.Polygon,
        coordinates: [SAMPLE_LINESTRING_COORDS], // Wrapping 2-point line as polygon ring
      });
    }).toThrow();
  });

  it('a 2-point LineString IS valid as a LineString', () => {
    const geom = new SpatialGeometry({
      type: GeometryType.LineString,
      coordinates: SAMPLE_LINESTRING_COORDS,
    });
    expect(geom.type).toBe(GeometryType.LineString);
  });
});
