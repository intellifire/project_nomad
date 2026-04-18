/**
 * Tests for Temporal step default computation.
 *
 * In the weather-first wizard, the Temporal step defaults its start date to
 * the first datetime present in the parsed weather data rather than today
 * (refs #238).
 */

import { describe, it, expect } from 'vitest';
import { computeDefaultStartDate } from '../computeTemporalDefaults.js';
import type { WeatherData } from '../../types/index.js';

describe('computeDefaultStartDate', () => {
  it('returns the minDate from parsed weather data when available', () => {
    const weather: WeatherData = {
      source: 'firestarr_csv',
      firestarrCsvParsed: {
        headers: ['Date', 'Hour', 'FFMC', 'DMC', 'DC', 'ISI', 'BUI', 'FWI'],
        rowCount: 96,
        previewRows: [],
        hasScenarioColumn: false,
        hasFWIColumns: true,
        dateRange: { minDate: '2025-07-15', maxDate: '2025-07-18' },
      },
    };

    expect(computeDefaultStartDate(weather)).toBe('2025-07-15');
  });
});
