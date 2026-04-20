/**
 * Arrival-perimeter animation helpers (refs #236).
 *
 * Builds the list of hourly frames the animation will render. One frame per
 * simulation hour starting at offset 1 (offset 0 is pre-ignition and has no
 * perimeter). Capped at 168 frames (7 days) so long sims stay bounded.
 */

export interface AnimationFrame {
  /** Hours elapsed from simulation start. */
  offsetHours: number;
  /** Wall-clock time of this frame in ISO 8601 (UTC). */
  isoTime: string;
}

export const DEFAULT_FRAME_CAP = 168;

export function computeAnimationFrames(
  simStart: Date,
  durationHours: number,
  capHours: number = DEFAULT_FRAME_CAP,
): AnimationFrame[] {
  const count = Math.max(0, Math.min(Math.floor(durationHours), capHours));
  const startMs = simStart.getTime();
  const frames: AnimationFrame[] = [];
  for (let offset = 1; offset <= count; offset++) {
    frames.push({
      offsetHours: offset,
      isoTime: new Date(startMs + offset * 3_600_000).toISOString(),
    });
  }
  return frames;
}
