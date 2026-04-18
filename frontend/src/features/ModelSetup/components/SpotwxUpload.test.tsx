/**
 * Tests for SpotwxUpload component.
 *
 * Validates the end-to-end file-handling path: user picks a SpotWX CSV, the
 * component parses + normalizes it and reports a ParsedWeatherCSV including
 * dateRange back to the parent via onUpload (refs #244).
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SpotwxUpload } from './SpotwxUpload.js';

const BASIC_CSV =
  'DATETIME,DATE,TIME,TMP,RH,WS,WD,WG,APCP\n' +
  '2026/04/18 23:00,2026/04/18,23:00,-17.5,93,12,074,18,0.0\n' +
  '2026/04/19 00:00,2026/04/19,00:00,-10.0,80,15,180,20,0.5\n';

describe('SpotwxUpload', () => {
  it('parses an uploaded SpotWX basic CSV and fires onUpload with dateRange', async () => {
    const onUpload = vi.fn();
    render(<SpotwxUpload onUpload={onUpload} />);

    const file = new File([BASIC_CSV], 'spotwx.csv', { type: 'text/csv' });
    const input = screen.getByLabelText(/upload spotwx csv/i) as HTMLInputElement;
    await userEvent.upload(input, file);

    await waitFor(() => expect(onUpload).toHaveBeenCalledTimes(1));

    const [calledFile, parsed] = onUpload.mock.calls[0];
    expect(calledFile).toBe(file);
    expect(parsed.headers).toEqual(['Date', 'PREC', 'TEMP', 'RH', 'WS', 'WD']);
    expect(parsed.rowCount).toBe(2);
    expect(parsed.dateRange).toEqual({ minDate: '2026-04-18', maxDate: '2026-04-19' });
  });

  it('shows a notice when hourly truncation occurred', async () => {
    const onUpload = vi.fn();
    const content =
      'DATETIME,DATE,TIME,TMP,RH,WS,WD,WG,APCP\n' +
      '2026/04/18 00:00,2026/04/18,00:00,10,80,5,180,0,0\n' +
      '2026/04/18 01:00,2026/04/18,01:00,11,80,5,180,0,0\n' +
      '2026/04/18 02:00,2026/04/18,02:00,12,80,5,180,0,0\n' +
      '2026/04/18 05:00,2026/04/18,05:00,14,80,5,180,0,0\n' +
      '2026/04/18 08:00,2026/04/18,08:00,16,80,5,180,0,0\n';
    const file = new File([content], 'spotwx.csv', { type: 'text/csv' });
    render(<SpotwxUpload onUpload={onUpload} />);

    const input = screen.getByLabelText(/upload spotwx csv/i) as HTMLInputElement;
    await userEvent.upload(input, file);
    await waitFor(() => expect(onUpload).toHaveBeenCalled());

    expect(screen.getByText(/dropped 2 rows/i)).toBeDefined();
  });

  it('surfaces an error when the CSV format is not recognized', async () => {
    const onUpload = vi.fn();
    render(<SpotwxUpload onUpload={onUpload} />);

    const file = new File(['foo,bar\n1,2\n'], 'bad.csv', { type: 'text/csv' });
    const input = screen.getByLabelText(/upload spotwx csv/i) as HTMLInputElement;
    await userEvent.upload(input, file);

    await waitFor(() => {
      expect(screen.getByText(/unrecognized spotwx/i)).toBeDefined();
    });
    expect(onUpload).not.toHaveBeenCalled();
  });
});
