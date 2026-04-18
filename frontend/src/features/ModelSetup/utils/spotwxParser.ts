/**
 * Parses SpotWX CSV exports and normalizes them into the Nomad raw weather
 * shape (Date, PREC, TEMP, RH, WS, WD) so the existing raw-weather pipeline
 * handles everything downstream (refs #244).
 *
 * Supported formats:
 *  - Basic export       — wide format with DATETIME (YYYY/MM/DD HH:MM)
 *  - Prometheus export  — narrow format with HOURLY (DD/MM/YYYY) + HOUR
 */

import { parseCSV } from './weatherValidation.js';

export interface NormalizedWeather {
  headers: string[];
  rows: string[][];
  /** Number of rows dropped because they fell past the hourly prefix. */
  truncatedRowCount?: number;
}

const OUTPUT_HEADERS = ['Date', 'PREC', 'TEMP', 'RH', 'WS', 'WD'];

function normalizeDatetimeBasic(value: string): string {
  // "2026/04/18 00:00" -> "2026-04-18 00:00:00"
  const [datePart, timePart = '00:00'] = value.trim().split(/\s+/);
  const isoDate = datePart.replace(/\//g, '-');
  const time = /^\d{2}:\d{2}:\d{2}$/.test(timePart) ? timePart : `${timePart}:00`;
  return `${isoDate} ${time}`;
}

/**
 * Walks normalized rows keeping only the prefix whose consecutive timestamps
 * are spaced exactly one hour apart. SpotWX basic exports switch from hourly
 * to 3-hourly past day 5, and FireSTARR refuses non-hourly input (refs #244).
 */
function truncateAtFirstNonHourlyGap(rows: string[][]): {
  rows: string[][];
  truncatedRowCount?: number;
} {
  const toMillis = (value: string) => new Date(value.replace(' ', 'T') + 'Z').getTime();
  for (let i = 1; i < rows.length; i++) {
    const gapHours = (toMillis(rows[i][0]) - toMillis(rows[i - 1][0])) / 3_600_000;
    if (gapHours !== 1) {
      return { rows: rows.slice(0, i), truncatedRowCount: rows.length - i };
    }
  }
  return { rows };
}

function normalizeDatetimePrometheus(dateStr: string, hour: string): string {
  // "18/04/2026" (DD/MM/YYYY) + "0" -> "2026-04-18 00:00:00"
  const [dd, mm, yyyy] = dateStr.trim().split('/');
  const hh = hour.trim().padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:00:00`;
}

export function parseSpotwxCsv(content: string): NormalizedWeather {
  const { headers, rows } = parseCSV(content);
  const upper = headers.map((h) => h.trim().toUpperCase());
  const idx = (name: string) => upper.indexOf(name);

  if (idx('DATETIME') !== -1) {
    const iDatetime = idx('DATETIME');
    const iTmp = idx('TMP');
    const iRh = idx('RH');
    const iWs = idx('WS');
    const iWd = idx('WD');
    const iApcp = idx('APCP');

    const normalized = rows.map((row) => [
      normalizeDatetimeBasic(row[iDatetime] ?? ''),
      row[iApcp] ?? '',
      row[iTmp] ?? '',
      row[iRh] ?? '',
      row[iWs] ?? '',
      row[iWd] ?? '',
    ]);

    const { rows: kept, truncatedRowCount } = truncateAtFirstNonHourlyGap(normalized);
    return {
      headers: [...OUTPUT_HEADERS],
      rows: kept,
      ...(truncatedRowCount ? { truncatedRowCount } : {}),
    };
  }

  if (idx('HOURLY') !== -1 && idx('HOUR') !== -1) {
    const iHourly = idx('HOURLY');
    const iHour = idx('HOUR');
    const iTemp = idx('TEMP');
    const iRh = idx('RH');
    const iWs = idx('WS');
    const iWd = idx('WD');
    const iPrecip = idx('PRECIP');

    const normalized = rows.map((row) => [
      normalizeDatetimePrometheus(row[iHourly] ?? '', row[iHour] ?? '0'),
      row[iPrecip] ?? '',
      row[iTemp] ?? '',
      row[iRh] ?? '',
      row[iWs] ?? '',
      row[iWd] ?? '',
    ]);

    const { rows: kept, truncatedRowCount } = truncateAtFirstNonHourlyGap(normalized);
    return {
      headers: [...OUTPUT_HEADERS],
      rows: kept,
      ...(truncatedRowCount ? { truncatedRowCount } : {}),
    };
  }

  throw new Error('Unrecognized SpotWX CSV format');
}

/**
 * Parses a SpotWX CSV and serializes it back out as a raw-weather CSV text
 * (Date, PREC, TEMP, RH, WS, WD) for submission to the backend's raw_weather
 * pipeline — the frontend handles all SpotWX-specific translation so the
 * backend stays unaware of SpotWX file uploads.
 */
export function normalizeSpotwxToRawWeather(content: string): string {
  const { headers, rows } = parseSpotwxCsv(content);
  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
}
