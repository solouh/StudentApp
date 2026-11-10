import { describe, expect, it } from 'vitest';
import {
  canAddShortcut,
  DEFAULT_SHORTCUT_IDS,
  MAX_HOME_SHORTCUTS,
  sanitizeShortcuts,
  shortcutSummary,
  toggleShortcut,
} from '../shortcuts';
import type { ReadyToolId } from '../types';

const ALLOWED: ReadyToolId[] = ['collage', 'slice', 'idphoto', 'mcq', 'formula'];

describe('sanitizeShortcuts', () => {
  it('keeps valid ids in order', () => {
    expect(sanitizeShortcuts(['mcq', 'formula'], ALLOWED)).toEqual(['mcq', 'formula']);
  });

  it('drops unknown and closed tools', () => {
    expect(sanitizeShortcuts(['mcq', 'design', 'nope', 'formula'], ALLOWED)).toEqual(['mcq', 'formula']);
  });

  it('removes duplicates', () => {
    expect(sanitizeShortcuts(['mcq', 'mcq', 'formula'], ALLOWED)).toEqual(['mcq', 'formula']);
  });

  it('caps the list at the maximum', () => {
    const many = ['mcq', 'formula', 'collage', 'slice', 'idphoto'] as ReadyToolId[];
    const capped = sanitizeShortcuts([...many, 'mcq'], ALLOWED);
    expect(capped).toHaveLength(MAX_HOME_SHORTCUTS);
  });

  it('falls back to an empty list for junk input', () => {
    expect(sanitizeShortcuts([], ALLOWED)).toEqual([]);
  });

  it('the default ids are all valid visible tools', () => {
    expect(sanitizeShortcuts(DEFAULT_SHORTCUT_IDS, ALLOWED)).toHaveLength(DEFAULT_SHORTCUT_IDS.length);
  });
});

describe('toggleShortcut', () => {
  it('appends when adding', () => {
    expect(toggleShortcut(['mcq'], 'formula')).toEqual(['mcq', 'formula']);
  });

  it('removes when already present', () => {
    expect(toggleShortcut(['mcq', 'formula'], 'mcq')).toEqual(['formula']);
  });

  it('refuses to grow past the maximum', () => {
    const full = ['mcq', 'formula', 'collage', 'slice', 'idphoto'] as ReadyToolId[];
    expect(full).toHaveLength(MAX_HOME_SHORTCUTS);
    expect(toggleShortcut(full, 'mcq')).toEqual(['formula', 'collage', 'slice', 'idphoto']);
    expect(toggleShortcut(full, 'formula')).toHaveLength(MAX_HOME_SHORTCUTS - 1);
  });

  it('still removes when the list is full', () => {
    const full = ['mcq', 'formula', 'collage', 'slice', 'idphoto'] as ReadyToolId[];
    const next = toggleShortcut(full, 'slice');
    expect(next).not.toContain('slice');
    expect(next).toHaveLength(MAX_HOME_SHORTCUTS - 1);
  });
});

describe('helpers', () => {
  it('reports whether another shortcut fits', () => {
    expect(canAddShortcut([])).toBe(true);
    expect(canAddShortcut(['mcq', 'formula'])).toBe(true);
    expect(canAddShortcut(['collage', 'slice', 'idphoto', 'mcq', 'formula'])).toBe(false);
  });

  it('summarises the selection', () => {
    expect(shortcutSummary([])).toBe('0 / 5');
    expect(shortcutSummary(['mcq', 'formula'])).toBe('2 / 5');
  });
});
