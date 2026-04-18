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
});
