/**
 * IANA timezone helpers for handing consistent local-time data to FireSTARR
 * (refs #236 Apr 2026 follow-up).
 *
 * FireSTARR expects its command-line time, `--tz <hours>` value, and weather
 * CSV timestamps to all agree on a single local zone. Solar-longitude
 * approximations are wrong near real timezone boundaries (Hay River is MDT
 * despite sitting at ~115°W ≈ solar UTC-8), and UTC-everywhere causes the
 * binary to mis-handle DST regions. The only correct anchor is the user's
 * IANA zone (from `data.temporal.timezone`).
 */

const NUMERIC_PARTS = {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
} as const;

function partsIn(date: Date, timezone: string): Record<string, string> {
  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      ...NUMERIC_PARTS,
    });
  } catch (err) {
    throw new Error(`Invalid IANA timezone "${timezone}": ${(err as Error).message}`);
  }
  const parts = formatter.formatToParts(date);
  const map: Record<string, string> = {};
  for (const p of parts) {
    if (p.type !== 'literal') map[p.type] = p.value;
  }
  // Intl may emit "24" for midnight in some runtimes; normalise to "00".
  if (map.hour === '24') map.hour = '00';
  return map;
}

/**
 * Returns the UTC offset in hours for `date` in the given IANA timezone,
 * accounting for DST (e.g. America/Edmonton returns -6 in summer, -7 in
 * winter). Throws when the timezone name is not recognised so callers never
 * silently fall back to UTC.
 */
export function computeUtcOffsetHours(date: Date, timezone: string): number {
  const parts = partsIn(date, timezone);
  const localAsUtcMs = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return (localAsUtcMs - date.getTime()) / 3_600_000;
}

/**
 * Returns the calendar date (`YYYY-MM-DD`) that `date` falls on in the given
 * IANA timezone.
 */
export function formatLocalDate(date: Date, timezone: string): string {
  const parts = partsIn(date, timezone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/**
 * Returns the wall-clock time (`HH:MM`) that `date` falls on in the given
 * IANA timezone. 24-hour clock, zero-padded.
 */
export function formatLocalTime(date: Date, timezone: string): string {
  const parts = partsIn(date, timezone);
  return `${parts.hour}:${parts.minute}`;
}

/**
 * Returns the wall-clock datetime (`YYYY-MM-DD HH:MM:SS`) that `date` falls on
 * in the given IANA timezone. Used when writing weather CSV rows.
 */
export function formatLocalDateTime(date: Date, timezone: string): string {
  const parts = partsIn(date, timezone);
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
}
