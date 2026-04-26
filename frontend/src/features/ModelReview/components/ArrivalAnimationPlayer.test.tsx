/**
 * Tests for the ArrivalAnimationPlayer component (refs #236).
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ArrivalAnimationPlayer } from './ArrivalAnimationPlayer.js';
import type { ArrivalPerimeterFeatureCollection } from '../utils/arrivalAnimation.js';

function buildFC(offsets: number[], startIso = '2026-06-19T20:00:00.000Z'): ArrivalPerimeterFeatureCollection {
  const startMs = new Date(startIso).getTime();
  return {
    type: 'FeatureCollection',
    features: offsets.map((h) => ({
      type: 'Feature',
      properties: {
        offsetHours: h,
        isoTime: new Date(startMs + h * 3_600_000).toISOString(),
      },
      geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] },
    })),
  };
}

describe('ArrivalAnimationPlayer', () => {
  it('renders a slider spanning the min–max offsetHours of the data', () => {
    const data = buildFC([2, 3, 5, 7, 10]);
    render(<ArrivalAnimationPlayer data={data} onFrameChange={() => {}} />);

    const slider = screen.getByRole('slider', { name: /animation frame/i }) as HTMLInputElement;
    expect(slider.min).toBe('2');
    expect(slider.max).toBe('10');
  });

  it('calls onFrameChange when the slider is moved', () => {
    const data = buildFC([1, 2, 3, 4, 5]);
    const onFrameChange = vi.fn();
    render(<ArrivalAnimationPlayer data={data} onFrameChange={onFrameChange} />);

    const slider = screen.getByRole('slider', { name: /animation frame/i }) as HTMLInputElement;
    fireEvent.change(slider, { target: { value: '3' } });

    expect(onFrameChange).toHaveBeenLastCalledWith(3);
  });

  it('toggles the play button label between Play and Pause', async () => {
    const data = buildFC([1, 2, 3]);
    render(<ArrivalAnimationPlayer data={data} onFrameChange={() => {}} />);

    const button = screen.getByRole('button', { name: /play/i });
    expect(button.textContent).toMatch(/play/i);

    await userEvent.click(button);
    expect(screen.getByRole('button', { name: /pause/i }).textContent).toMatch(/pause/i);
  });

  it('shows "Replay" once the animation is at the last frame', () => {
    const data = buildFC([1, 2, 3]);
    render(<ArrivalAnimationPlayer data={data} onFrameChange={() => {}} />);

    const slider = screen.getByRole('slider', { name: /animation frame/i }) as HTMLInputElement;
    fireEvent.change(slider, { target: { value: '3' } });

    expect(screen.getByRole('button', { name: /replay/i })).toBeDefined();
    expect(screen.queryByRole('button', { name: /^play animation$/i })).toBeNull();
  });

  it('rewinds to the first frame and starts playing when Replay is clicked', async () => {
    const data = buildFC([1, 2, 3]);
    const onFrameChange = vi.fn();
    render(<ArrivalAnimationPlayer data={data} onFrameChange={onFrameChange} />);

    const slider = screen.getByRole('slider', { name: /animation frame/i }) as HTMLInputElement;
    fireEvent.change(slider, { target: { value: '3' } });
    onFrameChange.mockClear();

    await userEvent.click(screen.getByRole('button', { name: /replay/i }));

    expect(onFrameChange).toHaveBeenCalledWith(1);
    // Once rewound, button should be Pause (we started playing).
    expect(screen.getByRole('button', { name: /pause/i })).toBeDefined();
  });

  it('renders the current frame time in local form (no trailing Z / UTC)', () => {
    const data = buildFC([1, 2, 3]);
    render(
      <ArrivalAnimationPlayer
        data={data}
        onFrameChange={() => {}}
        timezone="America/Edmonton"
      />,
    );

    // 2026-06-19T21:00Z in MDT = 15:00 local.
    expect(screen.getByText(/Hour 1 \/ 3 —.*15:00.*MDT/)).toBeDefined();
    expect(screen.queryByText(/2026-06-19T21:00.*Z/)).toBeNull();
  });
});
