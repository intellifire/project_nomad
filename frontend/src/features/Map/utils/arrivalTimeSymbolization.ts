/**
 * Pure symbolization utilities for FireSTARR arrival-time rasters.
 *
 * The arrival TIF stores Julian-day fractions and is served to the client
 * as an RGB-encoded PNG tile (see backend ArrivalTimeEncoder for encoding).
 * These helpers classify decoded values into timestep buckets, build the
 * dynamic legend, and produce the MapLibre `raster-color` paint expression.
 *
 * Issue #226.
 */

export type Timestep = 'hourly' | 'daily';

export interface ArrivalLegendEntry {
  bucket: number;
  label: string;
  color: string;
  minJulian: number;
  maxJulian: number;
}

export interface GenerateLegendOptions {
  startJulian: number;
  endJulian: number;
  timestep: Timestep;
  startDate: Date;
}

const MS_PER_DAY = 86_400_000;

export function bucketOf(
  julianDay: number,
  startJulian: number,
  timestep: Timestep,
): number {
  if (!Number.isFinite(julianDay) || julianDay === 0) return -1;
  if (julianDay < startJulian) return -1;
  const daysSince = julianDay - startJulian;
  const FP_EPSILON = 1e-9;
  return timestep === 'daily'
    ? Math.floor(daysSince + FP_EPSILON)
    : Math.floor(daysSince * 24 + FP_EPSILON);
}

export function generateArrivalLegend(
  opts: GenerateLegendOptions,
): ArrivalLegendEntry[] {
  const { startJulian, endJulian, timestep, startDate } = opts;
  const spanDays = Math.max(0, endJulian - startJulian);
  const bucketCount =
    timestep === 'daily'
      ? Math.max(1, Math.ceil(spanDays))
      : Math.max(1, Math.ceil(spanDays * 24));
  const step = timestep === 'daily' ? 1 : 1 / 24;

  const entries: ArrivalLegendEntry[] = [];
  for (let i = 0; i < bucketCount; i++) {
    const minJulian = startJulian + i * step;
    const maxJulian = startJulian + (i + 1) * step;
    const bucketDate = new Date(startDate.getTime() + i * step * MS_PER_DAY);
    const label =
      timestep === 'daily'
        ? formatDailyLabel(bucketDate)
        : formatHourlyLabel(bucketDate);
    entries.push({
      bucket: i,
      label,
      color: rampColor(i, bucketCount),
      minJulian,
      maxJulian,
    });
  }
  return entries;
}

function formatDailyLabel(date: Date): string {
  return date.toLocaleDateString('en-US', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
  });
}

function formatHourlyLabel(date: Date): string {
  const hh = String(date.getUTCHours()).padStart(2, '0');
  const mm = String(date.getUTCMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

/** Green → yellow → red ramp across `total` buckets. */
function rampColor(index: number, total: number): string {
  const t = total <= 1 ? 0 : index / (total - 1);
  const hue = 120 - t * 120;
  return hslToHex(hue, 90, 50);
}

function hslToHex(h: number, s: number, l: number): string {
  const sFrac = s / 100;
  const lFrac = l / 100;
  const c = (1 - Math.abs(2 * lFrac - 1)) * sFrac;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lFrac - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const toHex = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
