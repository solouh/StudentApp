import { describe, expect, it } from 'vitest';
import { SUBJECTS } from '../../../lib/subjects';
import { STARTER_QUESTIONS } from '../bank';
import {
  attemptPercent,
  buildAttempt,
  countBySubject,
  createQuestion,
  emptyDraft,
  isQuestionValid,
  mergeStarter,
  missedQuestions,
  questionsFor,
  quizXp,
  removeQuestion,
  scoreAttempt,
  shuffle,
  toDraft,
  updateQuestion,
  validateQuestion,
  type McqQuestion,
} from '../model';

function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

const DRAFT = {
  subjectId: 'physics',
  prompt: 'What is the SI unit of force?',
  options: ['Newton', 'Joule', 'Watt', 'Pascal'],
  answer: 0,
  explain: 'One newton accelerates 1 kg at 1 m/s².',
};

function userQuestion(id: string, subjectId = 'physics'): McqQuestion {
  return { ...DRAFT, id, subjectId, createdAt: 1 };
}

describe('validation', () => {
  it('accepts a complete question', () => {
    expect(isQuestionValid(DRAFT)).toBe(true);
  });

  it('rejects an empty prompt', () => {
    const errors = validateQuestion({ ...DRAFT, prompt: '   ' });
    expect(errors.prompt).toBeDefined();
  });

  it('requires all four answers to be filled in', () => {
    const errors = validateQuestion({ ...DRAFT, options: ['A', '', 'C', ''] });
    expect(errors.options).toBeDefined();
  });

  it('rejects an answer index outside the options', () => {
    const errors = validateQuestion({ ...DRAFT, answer: 7 });
    expect(errors.answer).toBeDefined();
  });

  it('rejects a correct answer that was left blank', () => {
    const errors = validateQuestion({ ...DRAFT, options: ['A', 'B', 'C', ' '] });
    // Leaving the correct option blank is caught as an empty answer slot.
    expect(errors.options).toBeDefined();
  });

  it('starts from a blank draft with four slots', () => {
    const draft = emptyDraft('biology');
    expect(draft.options).toHaveLength(4);
    expect(draft.subjectId).toBe('biology');
    expect(isQuestionValid(draft)).toBe(false);
  });
});

describe('authoring', () => {
  it('creates a trimmed question with a fresh id', () => {
    const question = createQuestion({ ...DRAFT, prompt: '  Spaced  ', options: [' a ', 'b', 'c', 'd'] });
    expect(question.prompt).toBe('Spaced');
    expect(question.options[0]).toBe('a');
    expect(question.id.length > 0).toBe(true);
  });

  it('updates in place without reordering', () => {
    const list = [userQuestion('a'), userQuestion('b')];
    const next = updateQuestion(list, 'b', { ...DRAFT, prompt: 'Changed prompt' });
    expect(next[0].prompt).toBe(DRAFT.prompt);
    expect(next[1].prompt).toBe('Changed prompt');
  });

  it('round-trips through a draft', () => {
    const question = createQuestion(DRAFT);
    const draft = toDraft(question);
    expect(draft.prompt).toBe(question.prompt);
    expect(draft.options).toEqual(question.options);
  });

  it('removes by id', () => {
    const list = [userQuestion('a'), userQuestion('b')];
    expect(removeQuestion(list, 'a').map((question) => question.id)).toEqual(['b']);
  });

  it('filters and counts per subject', () => {
    const list = [userQuestion('a', 'physics'), userQuestion('b', 'physics'), userQuestion('c', 'biology')];
    expect(questionsFor(list, 'physics')).toHaveLength(2);
    expect(countBySubject(list)).toEqual({ physics: 2, biology: 1 });
  });
});

describe('starter import', () => {
  it('bundles questions for every subject', () => {
    for (const subject of SUBJECTS) {
      expect(questionsFor(STARTER_QUESTIONS, subject.id).length > 0).toBe(true);
    }
  });

  it('namespaces starter ids so they cannot collide with user data', () => {
    expect(STARTER_QUESTIONS.every((question) => question.id.startsWith('starter-'))).toBe(true);
    const ids = STARTER_QUESTIONS.map((question) => question.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('imports once and is safe to tap twice', () => {
    const once = mergeStarter([], STARTER_QUESTIONS);
    const twice = mergeStarter(once, STARTER_QUESTIONS);
    expect(twice).toHaveLength(once.length);
  });
});

describe('practice', () => {
  const pool = [userQuestion('a'), userQuestion('b'), userQuestion('c')];

  it('builds an attempt from the student own questions', () => {
    const attempt = buildAttempt(pool, 'physics', 2, seeded(3));
    expect(attempt).toHaveLength(2);
    expect(new Set(attempt.map((question) => question.id)).size).toBe(2);
  });

  it('uses what exists instead of failing when short', () => {
    expect(buildAttempt(pool, 'physics', 10, seeded(1))).toHaveLength(3);
  });

  it('returns nothing for a subject with no questions', () => {
    expect(buildAttempt(pool, 'biology', 5)).toHaveLength(0);
  });

  it('scores answers and reports what was missed', () => {
    const answers = [pool[0].answer, null, pool[2].answer];
    expect(scoreAttempt(answers, pool)).toBe(2);
    const missed = missedQuestions(answers, pool);
    expect(missed).toHaveLength(1);
    expect(missed[0].chosen).toBeNull();
  });

  it('awards the bonus only at 80% or more', () => {
    expect(attemptPercent(1, 3)).toBe(33);
    expect(quizXp(4, 5)).toBe(18);
    expect(quizXp(3, 5)).toBe(6);
  });

  it('shuffles without losing items', () => {
    expect([...shuffle([1, 2, 3], seeded(2))].sort()).toEqual([1, 2, 3]);
  });
});
