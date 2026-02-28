#!/usr/bin/env tsx
/**
 * Quick test script to verify perimeter reprojection fix
 */

import { generatePerimeterForFile } from './src/infrastructure/firestarr/PerimeterGenerator.js';

const testFile = '/Users/franconogarin/localcode/project_nomad/temp_firestarr_data/sims/d8a32949-99d8-4e6a-9062-4b6a1d314473/probability_172_2023-06-21.tif';

console.log('Testing perimeter generation with reprojection fix...\n');

const result = await generatePerimeterForFile(testFile, {
  confidenceInterval: 1,
  smoothPerimeter: false,
});

if (result.success) {
  const perimeter = result.value;
  console.log('\nGenerated perimeter:');
  console.log(`Day: ${perimeter.day}`);
  console.log(`Date: ${perimeter.date}`);
  console.log(`Confidence Interval: ${perimeter.confidenceInterval}`);
  console.log(`Geometry Type: ${perimeter.geojson.geometry.type}`);

  // Check first coordinate to verify it's in WGS84
  const coords = perimeter.geojson.geometry.coordinates;
  let firstCoord: number[] | null = null;

  if (perimeter.geojson.geometry.type === 'Polygon') {
    firstCoord = coords[0][0];
  } else if (perimeter.geojson.geometry.type === 'MultiPolygon') {
    firstCoord = coords[0][0][0];
  }

  if (firstCoord) {
    const [lng, lat] = firstCoord;
    console.log(`\nFirst coordinate: [${lng}, ${lat}]`);

    // Validate WGS84 range
    const isValidLat = lat >= -90 && lat <= 90;
    const isValidLng = lng >= -180 && lng <= 180;
    const isValidWGS84 = isValidLat && isValidLng;

    console.log(`Valid latitude (-90 to 90): ${isValidLat} ${isValidLat ? '✓' : '✗'}`);
    console.log(`Valid longitude (-180 to 180): ${isValidLng} ${isValidLng ? '✓' : '✗'}`);
    console.log(`\n${isValidWGS84 ? '✓ SUCCESS: Coordinates are in WGS84!' : '✗ FAILED: Coordinates are NOT in WGS84!'}`);

    process.exit(isValidWGS84 ? 0 : 1);
  } else {
    console.error('Could not extract coordinates');
    process.exit(1);
  }
} else {
  console.error('\nFailed to generate perimeter:');
  console.error(result.error);
  process.exit(1);
}
