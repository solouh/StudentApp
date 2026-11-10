/**
 * Demo history for first launch. The rest of the app still shows sample data
 * (login, papers, tools), so the progress views are seeded with a believable
 * ~3 months of study. The events are flagged `demo` and can be cleared from
 * the Activity screen.
 *
 * The generator is deterministic (fixed seed) so the demo looks the same on
 * every reset, relative to "today".
 */
import { SUBJECTS } from '../subjects';
import { addDays, focusXp, startOfDay } from './derive';
import type { ActivityEvent } from './types';

type Draft = Omit<ActivityEvent, 'id' | 'at' | 'demo'>;

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MISSIONS = ['Finish 10 MCQs', 'Read chapter 4', 'Redo the formula sheet', 'Outline the essay'];
const TOPICS = ['cell division', 'organic reactions', "Newton's laws", 'crop rotation', 'essay structure'];
const TOOLS = ['Collage', 'Grid Cut & Poster', 'ID Photo Sheet'];

export function buildDemoEvents(now: Date): ActivityEvent[] {
  const rand = mulberry32(20261110);
  const pick = <T,>(items: readonly T[]): T => items[Math.floor(rand() * items.length)];
  const events: ActivityEvent[] = [];
  const today = startOfDay(now);

  const add = (day: Date, hour: number, minute: number, draft: Draft) => {
    const at = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, minute);
    // Never seed events in the future (today's later hours).
    if (at.getTime() > now.getTime()) return;
    events.push({
      ...draft,
      id: `demo-${events.length.toString(36)}-${at.getTime().toString(36)}`,
      at: at.toISOString(),
      demo: true,
    });
  };

  for (let back = 90; back >= 0; back -= 1) {
    const day = addDays(today, -back);
    const weekend = day.getDay() === 0 || day.getDay() === 6;
    // Keep the last ten days unbroken so the streak reads as alive.
    const active = back <= 9 || rand() < (weekend ? 0.45 : 0.8);
    if (!active) continue;

    const focusCount = 1 + Math.floor(rand() * 2);
    for (let index = 0; index < focusCount; index += 1) {
      const subject = pick(SUBJECTS);
      const hour = 9 + Math.floor(rand() * 12);
      const minute = Math.floor(rand() * 60);
      // The first session of a day always grows, so an active day always has XP.
      if (index > 0 && rand() < 0.08) {
        add(day, hour, minute, {
          kind: 'focus',
          subjectId: subject.id,
          message: `Tree withered at 12 min · ${subject.name}`,
          xp: 0,
          minutes: 12,
          status: 'withered',
          detail: { escapes: 2, mission: 0 },
        });
        continue;
      }
      const minutes = pick([25, 25, 45, 50, 15]);
      const mission = rand() < 0.25;
      const missionText = mission ? pick(MISSIONS) : '';
      add(day, hour, minute, {
        kind: 'focus',
        subjectId: subject.id,
        message: `Focused ${minutes} min · ${subject.name}${missionText ? ` — ${missionText}` : ''}`,
        xp: focusXp(minutes, mission),
        minutes,
        status: 'grown',
        detail: { escapes: Math.floor(rand() * 2), mission: mission ? 1 : 0 },
      });
    }

    if (rand() < 0.35) {
      const subject = pick(SUBJECTS);
      const score = 55 + Math.floor(rand() * 46);
      add(day, 18, Math.floor(rand() * 60), {
        kind: 'quiz',
        subjectId: subject.id,
        message: `Scored ${score}% on ${subject.name} quiz`,
        xp: 15 + Math.round(score / 10),
        score,
      });
    }
    if (rand() < 0.3) {
      const subject = pick(SUBJECTS);
      add(day, 20, Math.floor(rand() * 60), {
        kind: 'flashcards',
        subjectId: subject.id,
        message: `Reviewed 20 ${subject.name} flashcards`,
        xp: 12,
        detail: { cards: 20 },
      });
    }
    if (rand() < 0.15) {
      const subject = pick(SUBJECTS);
      add(day, 21, Math.floor(rand() * 60), {
        kind: 'formula',
        subjectId: subject.id,
        message: `Updated ${subject.name} formula sheet`,
        xp: 8,
      });
    }
    if (rand() < 0.2) {
      const subject = pick(SUBJECTS);
      add(day, 16, Math.floor(rand() * 60), {
        kind: 'note',
        subjectId: subject.id,
        message: `Wrote notes: ${pick(TOPICS)}`,
        xp: 10,
      });
    }
    if (rand() < 0.1) {
      const tool = pick(TOOLS);
      add(day, 11, Math.floor(rand() * 60), {
        kind: 'tool',
        message: `Opened ${tool} in Toolbox`,
        xp: 5,
        dedupeKey: `tool:${tool}`,
      });
    }
  }

  // The three papers shown on Home, so the sample cards and the ledger agree.
  const biology = SUBJECTS[0].id;
  add(addDays(today, -5), 16, 10, {
    kind: 'paper',
    subjectId: biology,
    message: 'Scored 85% on Biology past paper 01',
    xp: 60,
    minutes: 45,
    score: 85,
    detail: { status: 'Completed', mcq: '20:00', structured: '1H', essay: '1H' },
  });
  add(addDays(today, -2), 17, 5, {
    kind: 'paper',
    subjectId: biology,
    message: 'Scored 95% on Biology past paper 02',
    xp: 70,
    minutes: 30,
    score: 95,
    detail: { status: 'Completed', mcq: '45:00', structured: '1H', essay: '1H' },
  });
  add(addDays(today, -1), 8, 40, {
    kind: 'paper',
    subjectId: biology,
    message: 'Started Biology past paper 03',
    xp: 0,
    minutes: 60,
    score: 89,
    detail: { status: 'In progress', mcq: '15:00', structured: '45M', essay: '1H' },
  });

  return events.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}
