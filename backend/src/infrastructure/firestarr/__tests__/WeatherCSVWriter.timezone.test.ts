/**
 * WeatherCSVWriter — IANA timezone in CSV timestamps
 *
 * FireSTARR matches weather rows by string equality on the local-clock
 * timestamp. The CSV must therefore agree with the engine's `--tz` and the
 * caller's IANA zone, not the server's runtime zone.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { mkdtemp, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { writeWeatherCSV } from '../WeatherCSVWriter.js';
import type { WeatherHourlyData } from '../types.js';

describe('writeWeatherCSV — IANA timezone formatting', () => {
  let tempDir: string;
  let csvPath: string;

  const sampleHour: WeatherHourlyData = {
    date: new Date('2023-06-19T19:00:00Z'), // 13:00 MDT, 04:00 next-day Tokyo
    temp: 22,
    rh: 35,
    ws: 12,
    wd: 230,
    precip: 0,
    ffmc: 88,
    dmc: 35,
    dc: 280,
    isi: 4,
    bui: 50,
    fwi: 12,
  };

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'wxcsv-tz-'));
    csvPath = join(tempDir, 'weather.csv');
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('formats CSV Date column in caller-supplied IANA timezone (Asia/Tokyo)', async () => {
    await writeWeatherCSV(csvPath, [sampleHour], { timezone: 'Asia/Tokyo' });
    const content = await readFile(csvPath, 'utf-8');
    const dataRow = content.split('\n')[1];
    // 2023-06-19 19:00 UTC == 2023-06-20 04:00 Tokyo
    expect(dataRow.split(',')[1]).toBe('2023-06-20 04:00:00');
  });

  it('formats CSV Date column in America/Edmonton (DST → -6)', async () => {
    await writeWeatherCSV(csvPath, [sampleHour], { timezone: 'America/Edmonton' });
    const content = await readFile(csvPath, 'utf-8');
    const dataRow = content.split('\n')[1];
    expect(dataRow.split(',')[1]).toBe('2023-06-19 13:00:00');
  });

  it('throws when timezone is not supplied (fail-fast, no runtime fallback)', async () => {
    await expect(
      // @ts-expect-error — we want to prove the runtime guard, even with type bypass
      writeWeatherCSV(csvPath, [sampleHour], {}),
    ).rejects.toThrow(/timezone is required/i);
  });
});
