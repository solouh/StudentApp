import { describe, expect, it } from 'vitest';
import {
  achievements,
  addDays,
  buildHeatmap,
  currentStreak,
  dailyXp,
  focusStats,
  focusTrees,
  focusXp,
  formatMinutes,
  heatLevel,
  isActivityEvent,
  levelFor,
  longestStreak,
  mergeEvents,
  shortHash,
  startOfDay,
  subjectBreakdown,
} from '../derive';
import { buildDemoEvents } from '../seed';
import type { ActivityEvent } from '../types';

// Tuesday 10 Nov 2026, local time.
const NOW = new Date(2026, 10, 10, 21, 46);

function at(daysAgo: number, hour = 12, minute = 0): string {
  const day = addDays(startOfDay(NOW), -daysAgo);
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, minute).toISOString();
}

function ev(id: string, daysAgo: number, overrides: Partial<ActivityEvent> = {}): ActivityEvent {
  return { id, at: at(daysAgo), kind: 'note', message: 'note', xp: 10, ...overrides };
}

describe('levels and XP', () => {
  it('levels up on the cumulative curve', () => {
    expect(levelFor(0).level).toBe(1);
    expect(levelFor(99).level).toBe(1);
    expect(levelFor(100).level).toBe(2);
    expect(levelFor(299).level).toBe(2);
    expect(levelFor(300).level).toBe(3);
  });

  it('reports progress through the current level', () => {
    const info = levelFor(200);
    expect(info.level).toBe(2);
    expect(info.progress).toBeCloseTo(0.5);
    expect(info.xpToNext).toBe(100);
  });

  it('gives 2 XP per focus minute plus a mission bonus', () => {
    expect(focusXp(25, false)).toBe(50);
    expect(focusXp(25, true)).toBe(60);
    expect(focusXp(-5, false)).toBe(0);
  });

  it('buckets daily XP into heatmap levels', () => {
    expect(heatLevel(0)).toBe(0);
    expect(heatLevel(10)).toBe(1);
    expect(heatLevel(40)).toBe(2);
    expect(heatLevel(80)).toBe(3);
    expect(heatLevel(140)).toBe(4);
  });
});

describe('streaks', () => {
  it('counts back from today', () => {
    const events = [ev('a', 0), ev('b', 1), ev('c', 2)];
    expect(currentStreak(events, NOW)).toBe(3);
  });

  it('keeps yesterday alive while today has no activity yet', () => {
    const events = [ev('a', 1), ev('b', 2)];
    expect(currentStreak(events, NOW)).toBe(2);
  });

  it('breaks on a gap and reports the longest run', () => {
    const events = [ev('a', 0), ev('b', 1), ev('c', 2), ev('d', 4), ev('e', 5), ev('f', 6), ev('g', 7)];
    expect(currentStreak(events, NOW)).toBe(3);
    expect(longestStreak(events)).toBe(4);
  });

  it('ignores withered focus sessions (no XP)', () => {
    const events = [ev('a', 0, { kind: 'focus', xp: 0, status: 'withered', minutes: 10 })];
    expect(currentStreak(events, NOW)).toBe(0);
  });
});

describe('heatmap', () => {
  it('builds 52 Monday-first weeks ending in the current week', () => {
    const events = [ev('a', 0), ev('b', 3, { xp: 90 })];
    const heat = buildHeatmap(events, NOW, 52);

    expect(heat.columns).toHaveLength(52);
    expect(heat.columns.every((column) => column.length === 7)).toBe(true);

    const last = heat.columns[51];
    // Tuesday is the second cell of a Monday-first week.
    expect(last[1].isToday).toBe(true);
    expect(last.filter((cell) => cell.future)).toHaveLength(5);
    expect(heat.contributions).toBe(2);
    expect(heat.activeDays).toBe(2);
  });

  it('places month labels on the column that holds the 1st', () => {
    const heat = buildHeatmap([], NOW, 52);
    expect(heat.months.map((month) => month.label)).toContain('Nov');
  });
});

describe('focus stats and forest', () => {
  const events: ActivityEvent[] = [
    ev('today', 0, { kind: 'focus', xp: 50, minutes: 25, status: 'grown' }),
    ev('yesterday', 1, { kind: 'focus', xp: 0, minutes: 10, status: 'withered' }),
    ev('old', 10, { kind: 'focus', xp: 90, minutes: 45, status: 'grown' }),
  ];

  it('counts grown minutes and completion within the period', () => {
    const week = focusStats(events, NOW, 7);
    expect(week.focusedMinutes).toBe(25);
    expect(week.sessions).toBe(2);
    expect(week.grown).toBe(1);
    expect(week.withered).toBe(1);
    expect(week.completion).toBe(50);
  });

  it('widens the window for longer periods', () => {
    const month = focusStats(events, NOW, 30);
    expect(month.focusedMinutes).toBe(70);
    expect(month.sessions).toBe(3);
  });

  it('reports no completion when there were no sessions', () => {
    expect(focusStats([], NOW, 7).completion).toBeNull();
  });

  it('lists forest trees oldest first, capped to the limit', () => {
    const many = Array.from({ length: 25 }, (_, index) =>
      ev(`f${index}`, index % 6, { kind: 'focus', xp: 10, minutes: 5, status: 'grown' }),
    );
    const trees = focusTrees(many, NOW, 7, 21);
    expect(trees).toHaveLength(21);
    const times = trees.map((tree) => Date.parse(tree.at));
    expect([...times].sort((a, b) => a - b)).toEqual(times);
  });
});

describe('subjects, papers and achievements', () => {
  it('shares effort across subjects and skips untagged events', () => {
    const events = [
      ev('a', 0, { subjectId: 'biology', xp: 60 }),
      ev('b', 1, { subjectId: 'chemistry', xp: 40 }),
      ev('c', 1, { xp: 500 }),
    ];
    const breakdown = subjectBreakdown(events);
    expect(breakdown.map((row) => row.name)).toEqual(['Biology', 'Chemistry']);
    expect(breakdown[0].share).toBeCloseTo(0.6);
    expect(breakdown.reduce((sum, row) => sum + row.share, 0)).toBeCloseTo(1);
  });

  it('unlocks the first commit with one event', () => {
    const list = achievements([ev('a', 0)]);
    expect(list.find((item) => item.id === 'first-commit')?.unlocked).toBe(true);
    expect(list.find((item) => item.id === 'toolsmith')?.unlocked).toBe(false);
  });

  it('gives a 7-bar daily XP series, oldest first', () => {
    const series = dailyXp([ev('a', 0, { xp: 10 }), ev('b', 2, { xp: 5 })], NOW, 7);
    expect(series).toHaveLength(7);
    expect(series[6]).toBe(10);
    expect(series[4]).toBe(5);
  });
});

describe('ledger helpers', () => {
  it('merges by id, newest first', () => {
    const a = [ev('x', 1)];
    const b = [ev('x', 1), ev('y', 0)];
    const merged = mergeEvents(a, b);
    expect(merged.map((event) => event.id)).toEqual(['y', 'x']);
  });

  it('rejects malformed persisted entries', () => {
    expect(isActivityEvent({})).toBe(false);
    expect(isActivityEvent(null)).toBe(false);
    expect(isActivityEvent(ev('ok', 0))).toBe(true);
    expect(isActivityEvent({ ...ev('bad', 0), kind: 'bogus' })).toBe(false);
  });

  it('produces stable 7-character commit hashes', () => {
    expect(shortHash('abc')).toBe(shortHash('abc'));
    expect(shortHash('abc')).toHaveLength(7);
    expect(shortHash('abc')).not.toBe(shortHash('abd'));
  });

  it('formats minutes compactly', () => {
    expect(formatMinutes(0)).toBe('0m');
    expect(formatMinutes(45)).toBe('45m');
    expect(formatMinutes(65)).toBe('1h 05m');
  });
});

describe('demo history', () => {
  it('is deterministic, never in the future, and keeps a live streak', () => {
    const first = buildDemoEvents(NOW);
    const second = buildDemoEvents(NOW);
    expect(first).toEqual(second);
    expect(first.every((event) => Date.parse(event.at) <= NOW.getTime())).toBe(true);
    expect(first.every((event) => event.demo === true)).toBe(true);
    expect(first.filter((event) => event.kind === 'paper')).toHaveLength(3);
    expect(currentStreak(first, NOW)).toBeGreaterThanOrEqual(10);
  });
});
