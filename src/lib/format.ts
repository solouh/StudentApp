/**
 * Pure formatting helpers. No React Native or Expo imports so these can be
 * unit-tested in Node.
 */

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes < 1024) return `${Math.max(1, Math.round(bytes))} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`;
  const mb = kb / 1024;
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
}

export function pad2(value: number): string {
  return String(Math.max(0, Math.trunc(value))).padStart(2, '0');
}

/** `2026-11-10` style short date used in print footers. */
export function shortDate(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** `R2C3` label for poster tiles (1-based, row-major). */
export function rowColumnLabel(row: number, col: number): string {
  return `R${row + 1}C${col + 1}`;
}

/** Rounds to a sensible number of decimals without keeping float noise. */
export function roundTo(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/** Percentage of a whole, clamped to 0..100. */
export function percent(part: number, whole: number): number {
  if (!whole) return 0;
  return Math.min(100, Math.max(0, Math.round((part / whole) * 100)));
}
