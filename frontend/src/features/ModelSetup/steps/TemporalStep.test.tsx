/**
 * Tests for TemporalStep.
 *
 * Weather-first wizard: the start-date picker defaults to the first datetime
 * in the imported weather data, falling back to today when no weather is
 * available yet (refs #238).
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TemporalStep } from './TemporalStep.js';
import { WizardProvider } from '../../Wizard/index.js';
import type { WizardConfig } from '../../Wizard/index.js';
import type { ModelSetupData } from '../types/index.js';
import { DEFAULT_MODEL_SETUP_DATA, MODEL_SETUP_STEPS } from '../types/index.js';

function createWizardWrapper(initialData: ModelSetupData = DEFAULT_MODEL_SETUP_DATA) {
  const config: WizardConfig<ModelSetupData> = {
    steps: MODEL_SETUP_STEPS as unknown as WizardConfig<ModelSetupData>['steps'],
    initialData,
    storageKey: 'test-temporal-step',
    validators: {},
    onComplete: vi.fn(),
    onCancel: vi.fn(),
  };

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <WizardProvider config={config}>{children}</WizardProvider>;
  };
}

describe('TemporalStep default start date', () => {
  it('defaults to the minDate from parsed weather data when available', () => {
    const initialData: ModelSetupData = {
      ...DEFAULT_MODEL_SETUP_DATA,
      weather: {
        ...DEFAULT_MODEL_SETUP_DATA.weather,
        source: 'firestarr_csv',
        firestarrCsvParsed: {
          headers: ['Date', 'Hour', 'FFMC', 'DMC', 'DC', 'ISI', 'BUI', 'FWI'],
          rowCount: 2,
          previewRows: [],
          hasScenarioColumn: false,
          hasFWIColumns: true,
          dateRange: { minDate: '2025-07-15', maxDate: '2025-07-17' },
        },
      },
    };
    const Wrapper = createWizardWrapper(initialData);

    render(
      <Wrapper>
        <TemporalStep />
      </Wrapper>,
    );

    const dateInput = screen.getByLabelText('Start date') as HTMLInputElement;
    expect(dateInput.value).toBe('2025-07-15');
  });

  it('falls back to today when no parsed weather data is available', () => {
    const Wrapper = createWizardWrapper();

    render(
      <Wrapper>
        <TemporalStep />
      </Wrapper>,
    );

    const dateInput = screen.getByLabelText('Start date') as HTMLInputElement;
    const today = new Date().toISOString().slice(0, 10);
    expect(dateInput.value).toBe(today);
  });

  it('clamps an existing startDate into the new weather range when it falls outside', () => {
    const initialData: ModelSetupData = {
      ...DEFAULT_MODEL_SETUP_DATA,
      temporal: {
        startDate: '2026-05-30',
        startTime: '12:00',
        durationHours: 72,
        timezone: 'UTC',
        isForecast: false,
      },
      weather: {
        ...DEFAULT_MODEL_SETUP_DATA.weather,
        source: 'raw_weather',
        rawWeatherParsed: {
          headers: ['Date'],
          rowCount: 2,
          previewRows: [],
          hasScenarioColumn: false,
          hasFWIColumns: false,
          dateRange: { minDate: '2026-04-18', maxDate: '2026-04-22' },
        },
      },
    };
    const Wrapper = createWizardWrapper(initialData);

    render(
      <Wrapper>
        <TemporalStep />
      </Wrapper>,
    );

    const dateInput = screen.getByLabelText('Start date') as HTMLInputElement;
    expect(dateInput.value).toBe('2026-04-18');
  });

  it('bounds the start-date input to the weather dateRange (min/max)', () => {
    const initialData: ModelSetupData = {
      ...DEFAULT_MODEL_SETUP_DATA,
      weather: {
        ...DEFAULT_MODEL_SETUP_DATA.weather,
        source: 'raw_weather',
        rawWeatherParsed: {
          headers: ['Date'],
          rowCount: 2,
          previewRows: [],
          hasScenarioColumn: false,
          hasFWIColumns: false,
          dateRange: { minDate: '2026-04-18', maxDate: '2026-04-22' },
        },
      },
    };
    const Wrapper = createWizardWrapper(initialData);

    render(
      <Wrapper>
        <TemporalStep />
      </Wrapper>,
    );

    const dateInput = screen.getByLabelText('Start date') as HTMLInputElement;
    expect(dateInput.min).toBe('2026-04-18');
    expect(dateInput.max).toBe('2026-04-22');
  });
});
