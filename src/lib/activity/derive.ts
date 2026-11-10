/**
 * Pure activity maths: dates, XP and levels, the heatmap grid, streaks, focus
 * stats, subject breakdown and achievements. Everything is derived from the
 * event ledger, so screens never store their own copy of these numbers.
 *
 * No React Native imports here, so the logic can be unit-tested in Node.
 */
import { pad2 } from '../format';
import { getSubject } from '../subjects';
import type { ActivityEvent, ActivityKind } from './types';

const DAY_MS = 86_400_000;
export const MAX_EVENTS = 5000;

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/* ------------------------------------------------------------------ */
/* Dates (local time, Monday-first weeks)                              */
/* ------------------------------------------------------------------ */

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/** Local calendar day as `YYYY-MM-DD`. */
export function dayKey(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** Whole days since the epoch for a `YYYY-MM-DD` key (timezone-free arithmetic). */
function dayNumber(key: string): number {
  const [year, month, day] = key.split('-').map(Number);
  return Math.round(Date.UTC(year, month - 1, day) / DAY_MS);
}

export function eventTime(event: ActivityEvent): number {
  return Date.parse(event.at);
}

export function formatDateHeading(date: Date): string {
  return `${WEEKDAYS[date.getDay()].toUpperCase()}, ${MONTHS[date.getMonth()].toUpperCase()} ${date.getDate()}`;
}

export function formatDayLabel(date: Date): string {
  return `${WEEKDAYS[date.getDay()].slice(0, 3)}, ${MONTHS[date.getMonth()]} ${date.getDate()}`;
}

export function formatClock(iso: string): string {
  const date = new Date(iso);
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

/** `1h 05m` or `45m`. */
export function formatMinutes(total: number): string {
  const minutes = Math.max(0, Math.round(total));
  const hours = Math.floor(minutes / 60);
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${pad2(minutes % 60)}m`;
}

/* ------------------------------------------------------------------ */
/* Ledger helpers                                                      */
/* ------------------------------------------------------------------ */

const KINDS: ActivityKind[] = ['focus', 'quiz', 'flashcards', 'formula', 'note', 'paper', 'tool'];

/** Guards persisted data: a corrupted entry is dropped instead of crashing. */
export function isActivityEvent(value: unknown): value is ActivityEvent {
  if (!value || typeof value !== 'object') return false;
  const event = value as Partial<ActivityEvent>;
  return (
    typeof event.id === 'string' &&
    typeof event.at === 'string' &&
    !Number.isNaN(Date.parse(event.at)) &&
    typeof event.message === 'string' &&
    typeof event.xp === 'number' &&
    KINDS.includes(event.kind as ActivityKind)
  );
}

/** Union by id, newest first, capped at MAX_EVENTS. */
export function mergeEvents(a: ActivityEvent[], b: ActivityEvent[]): ActivityEvent[] {
  const byId = new Map<string, ActivityEvent>();
  for (const event of [...a, ...b]) byId.set(event.id, event);
  return [...byId.values()]
    .sort((x, y) => eventTime(y) - eventTime(x))
    .slice(0, MAX_EVENTS);
}

/** Git-style short hash for the commit feed (FNV-1a, 7 hex chars). */
export function shortHash(id: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < id.length; index += 1) {
    hash ^= id.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0').slice(0, 7);
}

/** Events whose timestamp falls within the last `days` calendar days (today = 1). */
export function eventsInLastDays(events: ActivityEvent[], now: Date, days: number): ActivityEvent[] {
  const from = addDays(startOfDay(now), -(days - 1)).getTime();
  return events.filter((event) => eventTime(event) >= from);
}

/* ------------------------------------------------------------------ */
/* XP and levels                                                       */
/* ------------------------------------------------------------------ */

export const FOCUS_XP_PER_MINUTE = 2;
export const MISSION_BONUS_XP = 10;

export function focusXp(minutes: number, missionDone: boolean): number {
  return Math.max(0, Math.round(minutes)) * FOCUS_XP_PER_MINUTE + (missionDone ? MISSION_BONUS_XP : 0);
}

export const LEVEL_TITLES = [
  'Starter',
  'Freshman',
  'Scholar',
  'Lab Assistant',
  'Researcher',
  'Honours',
  "Dean's List",
  'Professor',
  'Legend',
];

export type LevelInfo = {
  level: number;
  title: string;
  /** Total XP earned. */
  total: number;
  /** XP at which the current level starts. */
  floor: number;
  /** XP at which the next level starts. */
  next: number;
  /** 0..1 progress through the current level. */
  progress: number;
  xpToNext: number;
};

/** Cumulative XP needed to reach `level`: 100 · (L-1)·L / 2 (0, 100, 300, 600, …). */
function xpForLevel(level: number): number {
  return (100 * (level - 1) * level) / 2;
}

export function levelFor(xp: number): LevelInfo {
  const total = Math.max(0, Math.floor(xp));
  let level = 1;
  while (xpForLevel(level + 1) <= total) level += 1;
  const floor = xpForLevel(level);
  const next = xpForLevel(level + 1);
  return {
    level,
    title: LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)],
    total,
    floor,
    next,
    progress: (total - floor) / (next - floor),
    xpToNext: next - total,
  };
}

export function totalXp(events: ActivityEvent[]): number {
  return events.reduce((sum, event) => sum + event.xp, 0);
}

/* ------------------------------------------------------------------ */
/* Day totals and streaks                                              */
/* ------------------------------------------------------------------ */

export type DayTotal = { xp: number; count: number; events: ActivityEvent[] };

export function dayTotals(events: ActivityEvent[]): Map<string, DayTotal> {
  const totals = new Map<string, DayTotal>();
  for (const event of events) {
    const key = dayKey(new Date(event.at));
    let total = totals.get(key);
    if (!total) {
      total = { xp: 0, count: 0, events: [] };
      totals.set(key, total);
    }
    total.xp += event.xp;
    total.count += 1;
    total.events.push(event);
  }
  return totals;
}

/** Days with at least one XP-earning event. Withered focus sessions earn no XP. */
export function activeDayKeys(events: ActivityEvent[]): Set<string> {
  const keys = new Set<string>();
  for (const event of events) {
    if (event.xp > 0) keys.add(dayKey(new Date(event.at)));
  }
  return keys;
}

/** Consecutive active days ending today. Yesterday still counts while today is young. */
export function currentStreak(events: ActivityEvent[], now: Date): number {
  const active = activeDayKeys(events);
  let cursor = startOfDay(now);
  if (!active.has(dayKey(cursor))) cursor = addDays(cursor, -1);
  let streak = 0;
  while (active.has(dayKey(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function longestStreak(events: ActivityEvent[]): number {
  const days = [...activeDayKeys(events)].map(dayNumber).sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  let previous: number | null = null;
  for (const day of days) {
    run = previous !== null && day === previous + 1 ? run + 1 : 1;
    best = Math.max(best, run);
    previous = day;
  }
  return best;
}

/** Daily XP for the last `days` days, oldest first. */
export function dailyXp(events: ActivityEvent[], now: Date, days: number): number[] {
  const totals = dayTotals(events);
  const today = startOfDay(now);
  const series: number[] = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    series.push(totals.get(dayKey(addDays(today, -offset)))?.xp ?? 0);
  }
  return series;
}

export function xpInLastDays(events: ActivityEvent[], now: Date, days: number): number {
  return totalXp(eventsInLastDays(events, now, days));
}

/* ------------------------------------------------------------------ */
/* Heatmap (GitHub-style contribution grid)                            */
/* ------------------------------------------------------------------ */

export type HeatLevel = 0 | 1 | 2 | 3 | 4;

export function heatLevel(xp: number): HeatLevel {
  if (xp <= 0) return 0;
  if (xp < 40) return 1;
  if (xp < 80) return 2;
  if (xp < 140) return 3;
  return 4;
}

export type HeatCell = {
  key: string;
  date: Date;
  xp: number;
  count: number;
  level: HeatLevel;
  future: boolean;
  isToday: boolean;
};

export type Heatmap = {
  /** `weeks` columns of 7 cells each, Monday first, oldest column first. */
  columns: HeatCell[][];
  /** Month label placed above the column that contains the 1st of that month. */
  months: { column: number; label: string }[];
  /** Events in the grid that are not in the future. */
  contributions: number;
  activeDays: number;
};

export function buildHeatmap(events: ActivityEvent[], now: Date, weeks = 52): Heatmap {
  const totals = dayTotals(events);
  const today = startOfDay(now);
  const todayKey = dayKey(today);
  const mondayOffset = (today.getDay() + 6) % 7;
  const thisMonday = addDays(today, -mondayOffset);
  const firstMonday = addDays(thisMonday, -(weeks - 1) * 7);

  const columns: HeatCell[][] = [];
  const months: { column: number; label: string }[] = [];
  let contributions = 0;
  let activeDays = 0;

  for (let week = 0; week < weeks; week += 1) {
    const column: HeatCell[] = [];
    for (let day = 0; day < 7; day += 1) {
      const date = addDays(firstMonday, week * 7 + day);
      const key = dayKey(date);
      const total = totals.get(key);
      const xp = total?.xp ?? 0;
      const future = date.getTime() > today.getTime();
      if (!future) {
        contributions += total?.count ?? 0;
        if (xp > 0) activeDays += 1;
      }
      column.push({
        key,
        date,
        xp,
        count: total?.count ?? 0,
        level: future ? 0 : heatLevel(xp),
        future,
        isToday: key === todayKey,
      });
    }
    columns.push(column);

    const firstOfMonth = column.find((cell) => cell.date.getDate() === 1);
    const anchor = firstOfMonth ?? (week === 0 ? column[0] : undefined);
    if (anchor) months.push({ column: week, label: MONTHS[anchor.date.getMonth()] });
  }

  return { columns, months, contributions, activeDays };
}

/* ------------------------------------------------------------------ */
/* Focus                                                               */
/* ------------------------------------------------------------------ */

export type FocusStats = {
  focusedMinutes: number;
  sessions: number;
  grown: number;
  withered: number;
  /** 0-100, or null when there were no sessions in the range. */
  completion: number | null;
};

export function focusEvents(events: ActivityEvent[]): ActivityEvent[] {
  return events.filter((event) => event.kind === 'focus');
}

export function focusStats(events: ActivityEvent[], now: Date, days: number): FocusStats {
  const sessions = focusEvents(eventsInLastDays(events, now, days));
  const grown = sessions.filter((event) => event.status !== 'withered');
  const focusedMinutes = grown.reduce((sum, event) => sum + (event.minutes ?? 0), 0);
  return {
    focusedMinutes,
    sessions: sessions.length,
    grown: grown.length,
    withered: sessions.length - grown.length,
    completion: sessions.length ? Math.round((grown.length / sessions.length) * 100) : null,
  };
}

/** The most recent focus sessions in the range, oldest first (forest order). */
export function focusTrees(events: ActivityEvent[], now: Date, days: number, limit: number): ActivityEvent[] {
  const trees = focusEvents(eventsInLastDays(events, now, days)).sort((a, b) => eventTime(a) - eventTime(b));
  return trees.slice(-limit);
}

/* ------------------------------------------------------------------ */
/* Subjects ("repos")                                                  */
/* ------------------------------------------------------------------ */

export type SubjectShare = {
  subjectId: string;
  name: string;
  emoji: string;
  color: string;
  xp: number;
  minutes: number;
  /** 0..1 share of all subject-tagged XP. */
  share: number;
};

/** Where the student's effort goes, all time, largest first. Untagged events are skipped. */
export function subjectBreakdown(events: ActivityEvent[]): SubjectShare[] {
  const bySubject = new Map<string, { xp: number; minutes: number }>();
  for (const event of events) {
    if (!event.subjectId) continue;
    const row = bySubject.get(event.subjectId) ?? { xp: 0, minutes: 0 };
    row.xp += event.xp;
    if (event.status !== 'withered') row.minutes += event.minutes ?? 0;
    bySubject.set(event.subjectId, row);
  }
  const totalSubjectXp = [...bySubject.values()].reduce((sum, row) => sum + row.xp, 0);
  return [...bySubject.entries()]
    .map(([subjectId, row]) => {
      const subject = getSubject(subjectId);
      return {
        subjectId,
        name: subject?.name ?? 'General',
        emoji: subject?.emoji ?? '📘',
        color: subject?.tint.fg ?? '#97A5A0',
        xp: row.xp,
        minutes: row.minutes,
        share: totalSubjectXp > 0 ? row.xp / totalSubjectXp : 0,
      };
    })
    .sort((a, b) => b.xp - a.xp);
}

/** Grown focus minutes per subject in the last `days` days. */
export function subjectFocusMinutes(events: ActivityEvent[], now: Date, days: number): Record<string, number> {
  const minutes: Record<string, number> = {};
  for (const event of focusEvents(eventsInLastDays(events, now, days))) {
    if (!event.subjectId || event.status === 'withered') continue;
    minutes[event.subjectId] = (minutes[event.subjectId] ?? 0) + (event.minutes ?? 0);
  }
  return minutes;
}

/* ------------------------------------------------------------------ */
/* Papers                                                              */
/* ------------------------------------------------------------------ */

export function isCompletedPaper(event: ActivityEvent): boolean {
  return event.kind === 'paper' && event.detail?.status !== 'In progress';
}

/** Latest past papers first. */
export function recentPapers(events: ActivityEvent[], limit: number): ActivityEvent[] {
  return events
    .filter((event) => event.kind === 'paper')
    .sort((a, b) => eventTime(b) - eventTime(a))
    .slice(0, limit);
}

export function paperSummary(events: ActivityEvent[], now: Date, days: number): { completed: number; average: number | null } {
  const completed = eventsInLastDays(events, now, days).filter(isCompletedPaper);
  const scores = completed.map((event) => event.score ?? 0);
  return {
    completed: completed.length,
    average: scores.length ? Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length) : null,
  };
}

/* ------------------------------------------------------------------ */
/* Achievements                                                        */
/* ------------------------------------------------------------------ */

export type Achievement = {
  id: string;
  emoji: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  unlocked: boolean;
};

export function achievements(events: ActivityEvent[]): Achievement[] {
  const grownFocus = events.filter((event) => event.kind === 'focus' && event.status !== 'withered');
  const hourOf = (event: ActivityEvent) => new Date(event.at).getHours();
  const countOf = (kind: ActivityKind) => events.filter((event) => event.kind === kind).length;
  const streak = longestStreak(events);

  const defs: { id: string; emoji: string; title: string; description: string; count: number; target: number }[] = [
    { id: 'first-commit', emoji: '🌱', title: 'First commit', description: 'Log your first activity.', count: events.length, target: 1 },
    { id: 'on-fire', emoji: '🔥', title: 'On fire', description: 'Keep a 7-day streak.', count: streak, target: 7 },
    { id: 'forest-keeper', emoji: '🌳', title: 'Forest keeper', description: 'Grow 10 focus trees.', count: grownFocus.length, target: 10 },
    { id: 'deep-worker', emoji: '🧠', title: 'Deep worker', description: 'Finish a 45-minute session.', count: grownFocus.filter((e) => (e.minutes ?? 0) >= 45).length, target: 1 },
    { id: 'night-owl', emoji: '🦉', title: 'Night owl', description: 'Finish a focus session after 10pm.', count: grownFocus.filter((e) => hourOf(e) >= 22).length, target: 1 },
    { id: 'early-bird', emoji: '🐤', title: 'Early bird', description: 'Finish a focus session before 8am.', count: grownFocus.filter((e) => hourOf(e) < 8).length, target: 1 },
    { id: 'mission', emoji: '🎯', title: 'Mission accomplished', description: 'Complete a focus session with a mission.', count: grownFocus.filter((e) => e.detail?.mission === 1).length, target: 1 },
    { id: 'perfect', emoji: '💯', title: 'Perfect score', description: 'Get 100% on a quiz or past paper.', count: events.filter((e) => e.score === 100).length, target: 1 },
    { id: 'paper-marathon', emoji: '🏁', title: 'Paper marathon', description: 'Finish 5 past papers.', count: events.filter(isCompletedPaper).length, target: 5 },
    { id: 'card-shark', emoji: '🃏', title: 'Card shark', description: 'Review flashcards 10 times.', count: countOf('flashcards'), target: 10 },
    { id: 'formula-collector', emoji: '🧮', title: 'Formula collector', description: 'Update formula sheets 10 times.', count: countOf('formula'), target: 10 },
    { id: 'note-taker', emoji: '📝', title: 'Note taker', description: 'Write 10 study notes.', count: countOf('note'), target: 10 },
    { id: 'toolsmith', emoji: '🛠️', title: 'Toolsmith', description: 'Use the Toolbox on 5 different days.', count: countOf('tool'), target: 5 },
  ];

  return defs.map(({ count, target, ...def }) => ({
    ...def,
    progress: Math.min(count, target),
    target,
    unlocked: count >= target,
  }));
}
