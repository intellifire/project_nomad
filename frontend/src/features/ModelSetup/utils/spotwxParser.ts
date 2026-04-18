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
}

const OUTPUT_HEADERS = ['Date', 'PREC', 'TEMP', 'RH', 'WS', 'WD'];

function normalizeDatetimeBasic(value: string): string {
  // "2026/04/18 00:00" -> "2026-04-18 00:00:00"
  const [datePart, timePart = '00:00'] = value.trim().split(/\s+/);
  const isoDate = datePart.replace(/\//g, '-');
  const time = /^\d{2}:\d{2}:\d{2}$/.test(timePart) ? timePart : `${timePart}:00`;
  return `${isoDate} ${time}`;
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

    return { headers: [...OUTPUT_HEADERS], rows: normalized };
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

    return { headers: [...OUTPUT_HEADERS], rows: normalized };
  }

  throw new Error('Unrecognized SpotWX CSV format');
}
