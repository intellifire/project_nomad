/**
 * Tests for SpotWX CSV → raw weather normalization (refs #244).
 *
 * Two supported SpotWX export formats are normalized into the same shape the
 * existing raw weather pipeline already accepts: columns
 *   Date, PREC, TEMP, RH, WS, WD
 * with Date as a combined "YYYY-MM-DD HH:MM:SS" timestamp.
 */

import { describe, it, expect } from 'vitest';
import { parseSpotwxCsv } from '../spotwxParser.js';

describe('parseSpotwxCsv', () => {
  it('parses SpotWX basic format (DATETIME,DATE,TIME,TMP,RH,WS,WD,...) into raw weather shape', () => {
    const content =
      'DATETIME,DATE,TIME,TMP,RH,WS,WD,WG,APCP,CLOUD\n' +
      '2026/04/18 00:00,2026/04/18,00:00,-17.5,93,12,074,18,0.0,5\n' +
      '2026/04/18 01:00,2026/04/18,01:00,-18.5,98,11,088,12,0.3,6\n';

    const result = parseSpotwxCsv(content);

    expect(result.headers).toEqual(['Date', 'PREC', 'TEMP', 'RH', 'WS', 'WD']);
    expect(result.rows).toEqual([
      ['2026-04-18 00:00:00', '0.0', '-17.5', '93', '12', '074'],
      ['2026-04-18 01:00:00', '0.3', '-18.5', '98', '11', '088'],
    ]);
  });

  it('parses SpotWX prometheus format (HOURLY,HOUR,TEMP,RH,WD,WS,PRECIP) into raw weather shape', () => {
    const content =
      'HOURLY,HOUR,TEMP,RH,WD,WS,PRECIP\n' +
      '18/04/2026,0,-17.5,93,074,12,0.00\n' +
      '18/04/2026,13,-10.0,50,200,15,0.25\n';

    const result = parseSpotwxCsv(content);

    expect(result.headers).toEqual(['Date', 'PREC', 'TEMP', 'RH', 'WS', 'WD']);
    expect(result.rows).toEqual([
      ['2026-04-18 00:00:00', '0.00', '-17.5', '93', '12', '074'],
      ['2026-04-18 13:00:00', '0.25', '-10.0', '50', '15', '200'],
    ]);
  });

  it('throws on unrecognized SpotWX format', () => {
    const content = 'foo,bar,baz\n1,2,3\n';
    expect(() => parseSpotwxCsv(content)).toThrow(/Unrecognized SpotWX/i);
  });
});

describe('normalizeSpotwxToRawWeather', () => {
  it('emits a raw-weather CSV text that the backend raw_weather path accepts', async () => {
    const { normalizeSpotwxToRawWeather } = await import('../spotwxParser.js');
    const content =
      'DATETIME,DATE,TIME,TMP,RH,WS,WD,WG,APCP\n' +
      '2026/04/18 00:00,2026/04/18,00:00,-17.5,93,12,074,18,0.0\n' +
      '2026/04/18 01:00,2026/04/18,01:00,-18.5,98,11,088,12,0.3\n';

    const out = normalizeSpotwxToRawWeather(content);

    expect(out).toBe(
      'Date,PREC,TEMP,RH,WS,WD\n' +
        '2026-04-18 00:00:00,0.0,-17.5,93,12,074\n' +
        '2026-04-18 01:00:00,0.3,-18.5,98,11,088',
    );
  });
});
