/**
 * Home screen quick-tool shortcuts.
 *
 * The student picks up to five tools to keep on Home. Kept pure and free of UI
 * imports so the rules are easy to test: no duplicates, nothing that is not a
 * visible tool, never more than the cap.
 */
import type { ReadyToolId } from './types';

export const MAX_HOME_SHORTCUTS = 5;

/**
 * First-run selection, in display order. Closed tools are filtered out by
 * `sanitizeShortcuts` before anything renders.
 */
export const DEFAULT_SHORTCUT_IDS: string[] = ['mcq', 'formula', 'collage', 'slice', 'idphoto'];

function isReadyToolId(value: string, allowed: readonly string[]): value is ReadyToolId {
  return allowed.includes(value);
}

/**
 * Drops unknown or closed tools, removes duplicates and caps the list. Saved
 * preferences can go stale (a tool may be closed later), so this runs on load.
 */
export function sanitizeShortcuts(
  ids: readonly string[],
  allowed: readonly string[],
  max: number = MAX_HOME_SHORTCUTS,
): ReadyToolId[] {
  const result: ReadyToolId[] = [];
  for (const id of ids) {
    if (result.length >= max) break;
    if (!isReadyToolId(id, allowed)) continue;
    if (result.includes(id)) continue;
    result.push(id);
  }
  return result;
}

/** Adds at the end, or removes. Refuses to grow past `max`. */
export function toggleShortcut(
  ids: readonly ReadyToolId[],
  id: ReadyToolId,
  max: number = MAX_HOME_SHORTCUTS,
): ReadyToolId[] {
  if (ids.includes(id)) return ids.filter((entry) => entry !== id);
  if (ids.length >= max) return [...ids];
  return [...ids, id];
}

export function canAddShortcut(
  ids: readonly ReadyToolId[],
  max: number = MAX_HOME_SHORTCUTS,
): boolean {
  return ids.length < max;
}

/** "3 / 5 shortcuts" for the picker header. */
export function shortcutSummary(ids: readonly ReadyToolId[], max: number = MAX_HOME_SHORTCUTS): string {
  return `${ids.length} / ${max}`;
}
