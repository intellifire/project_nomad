/**
 * Tests for IANA timezone helpers used when handing data to FireSTARR
 * (refs #236 follow-up, Apr 2026).
 *
 * FireSTARR is fed `--tz <hours>` along with wall-clock time strings and a
 * weather CSV whose rows carry local timestamps. All three must agree on
 * the same real-world local zone. Solar-longitude approximations and
 * UTC-everywhere both fail in practice, so the user's IANA zone
 * (e.g. `America/Edmonton`) is the single source of truth.
 */

import { describe, it, expect } from 'vitest';
import {
  computeUtcOffsetHours,
  formatLocalDate,
  formatLocalTime,
  formatLocalDateTime,
} from '../timezoneUtils.js';

describe('computeUtcOffsetHours', () => {
  it('returns -6 for America/Edmonton in summer (MDT)', () => {
    const summer = new Date('2023-06-19T19:00:00Z');
    expect(computeUtcOffsetHours(summer, 'America/Edmonton')).toBe(-6);
  });

  it('returns -7 for America/Edmonton in winter (MST)', () => {
    const winter = new Date('2023-01-15T12:00:00Z');
    expect(computeUtcOffsetHours(winter, 'America/Edmonton')).toBe(-7);
  });

  it('returns 0 for UTC', () => {
    expect(computeUtcOffsetHours(new Date('2023-06-19T19:00:00Z'), 'UTC')).toBe(0);
  });

  it('throws on an unrecognised timezone rather than silently defaulting', () => {
    expect(() =>
      computeUtcOffsetHours(new Date('2023-06-19T19:00:00Z'), 'Not/A_Zone'),
    ).toThrow(/timezone/i);
  });
});

describe('formatLocalDate', () => {
  it('renders the calendar date in the given zone', () => {
    // 2023-06-19T19:00Z is 2023-06-19 13:00 in America/Edmonton.
    expect(formatLocalDate(new Date('2023-06-19T19:00:00Z'), 'America/Edmonton')).toBe(
      '2023-06-19',
    );
  });

  it('handles day rollovers near midnight correctly', () => {
    // 2023-06-20T05:00Z is 2023-06-19 23:00 MDT (Edmonton is UTC-6).
    expect(formatLocalDate(new Date('2023-06-20T05:00:00Z'), 'America/Edmonton')).toBe(
      '2023-06-19',
    );
  });
});

describe('formatLocalTime', () => {
  it('renders HH:MM in the given zone with 24-hour clock', () => {
    expect(formatLocalTime(new Date('2023-06-19T19:00:00Z'), 'America/Edmonton')).toBe(
      '13:00',
    );
  });

  it('pads single-digit hours', () => {
    expect(formatLocalTime(new Date('2023-06-19T14:05:00Z'), 'America/Edmonton')).toBe(
      '08:05',
    );
  });
});

describe('formatLocalDateTime', () => {
  it('renders YYYY-MM-DD HH:MM:SS in the given zone', () => {
    expect(
      formatLocalDateTime(new Date('2023-06-19T19:00:00Z'), 'America/Edmonton'),
    ).toBe('2023-06-19 13:00:00');
  });
});
