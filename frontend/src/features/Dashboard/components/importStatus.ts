/**
 * Classifies an import-status message as in-progress or terminal.
 *
 * ModelList sets a trailing "..." on messages that mark ongoing async work
 * (importing, fetching config, starting a re-run). Terminal messages —
 * success or failure — do not. The spinner next to the status text is
 * rendered only while work is in progress (refs #239).
 */
export function isProgressStatus(status: string | null | undefined): boolean {
  return !!status && status.endsWith('...');
}
