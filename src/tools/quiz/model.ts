/**
 * Student-authored MCQ questions.
 *
 * The old app shipped a fixed question bank. Now the student writes their own
 * questions (from their notes, past papers or class) and the same records drive
 * both the "manage questions" screen and practice mode.
 *
 * Pure module: no React Native imports, so it can be unit-tested in Node.
 */
import { createId } from '../../lib/id';

export type McqQuestion = {
  id: string;
  /** Real subject id from lib/subjects.ts. */
  subjectId: string;
  prompt: string;
  /** Exactly four options. */
  options: string[];
  /** Index into options (0-3). */
  answer: number;
  explain: string;
  createdAt?: number;
};

export type QuestionDraft = {
  subjectId: string;
  prompt: string;
  options: string[];
  answer: number;
  explain: string;
};

export type QuestionErrors = {
  prompt?: string;
  options?: string;
  answer?: string;
};

export const OPTION_COUNT = 4;
export const OPTION_LETTERS = ['A', 'B', 'C', 'D'] as const;
export const QUIZ_SIZES = [5, 10] as const;
export type QuizSize = (typeof QUIZ_SIZES)[number];

/** Minimum characters before a question is worth saving. */
const MIN_PROMPT = 4;

export function emptyDraft(subjectId: string): QuestionDraft {
  return {
    subjectId,
    prompt: '',
    options: ['', '', '', ''],
    answer: 0,
    explain: '',
  };
}

/** `{}` means valid. */
export function validateQuestion(draft: QuestionDraft): QuestionErrors {
  const errors: QuestionErrors = {};

  if (draft.prompt.trim().length < MIN_PROMPT) {
    errors.prompt = 'Write the question first.';
  }

  const filled = draft.options.filter((option) => option.trim().length > 0);
  if (filled.length < OPTION_COUNT) {
    errors.options = `Fill in all ${OPTION_COUNT} answers.`;
  }

  if (draft.answer < 0 || draft.answer >= OPTION_COUNT) {
    errors.answer = 'Pick which answer is correct.';
  } else if (!draft.options[draft.answer]?.trim()) {
    errors.answer = 'The correct answer cannot be empty.';
  }

  return errors;
}

export function isQuestionValid(draft: QuestionDraft): boolean {
  return Object.keys(validateQuestion(draft)).length === 0;
}

export function createQuestion(draft: QuestionDraft): McqQuestion {
  return {
    id: createId('q'),
    subjectId: draft.subjectId,
    prompt: draft.prompt.trim(),
    options: draft.options.map((option) => option.trim()),
    answer: draft.answer,
    explain: draft.explain.trim(),
    createdAt: Date.now(),
  };
}

export function updateQuestion(
  list: readonly McqQuestion[],
  id: string,
  draft: QuestionDraft,
): McqQuestion[] {
  return list.map((question) =>
    question.id === id
      ? {
          ...question,
          subjectId: draft.subjectId,
          prompt: draft.prompt.trim(),
          options: draft.options.map((option) => option.trim()),
          answer: draft.answer,
          explain: draft.explain.trim(),
        }
      : question,
  );
}

export function removeQuestion(list: readonly McqQuestion[], id: string): McqQuestion[] {
  return list.filter((question) => question.id !== id);
}

export function toDraft(question: McqQuestion): QuestionDraft {
  return {
    subjectId: question.subjectId,
    prompt: question.prompt,
    options: [...question.options],
    answer: question.answer,
    explain: question.explain,
  };
}

/* ------------------------------------------------------------------ */
/* Browsing                                                            */
/* ------------------------------------------------------------------ */

export function questionsFor(list: readonly McqQuestion[], subjectId: string): McqQuestion[] {
  return list.filter((question) => question.subjectId === subjectId);
}

/** Count per subject id, for the picker badges. */
export function countBySubject(list: readonly McqQuestion[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const question of list) {
    counts[question.subjectId] = (counts[question.subjectId] ?? 0) + 1;
  }
  return counts;
}

/** Subjects that still have no questions (used for the "add some" hint). */
export function emptySubjects(
  list: readonly McqQuestion[],
  subjectIds: readonly string[],
): string[] {
  return subjectIds.filter((id) => questionsFor(list, id).length === 0);
}

/**
 * Adds starter questions that are not already present (matched by id), so the
 * button is safe to press twice.
 */
export function mergeStarter(
  list: readonly McqQuestion[],
  starter: readonly McqQuestion[],
): McqQuestion[] {
  const existing = new Set(list.map((question) => question.id));
  const added = starter.filter((question) => !existing.has(question.id));
  return [...list, ...added];
}

/* ------------------------------------------------------------------ */
/* Practice attempts                                                   */
/* ------------------------------------------------------------------ */

export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    const current = copy[index];
    copy[index] = copy[swap];
    copy[swap] = current;
  }
  return copy;
}

/**
 * Shuffled questions for one attempt. If the student has fewer questions than
 * requested, every one of them is used instead of failing.
 */
export function buildAttempt(
  list: readonly McqQuestion[],
  subjectId: string,
  count: number,
  random: () => number = Math.random,
): McqQuestion[] {
  const pool = questionsFor(list, subjectId);
  if (count <= 0 || pool.length === 0) return [];
  if (count >= pool.length) return shuffle(pool, random);
  return shuffle(pool, random).slice(0, count);
}

/** Questions the student answered incorrectly or skipped. */
export function missedQuestions(
  answers: readonly (number | null)[],
  questions: readonly McqQuestion[],
): { question: McqQuestion; chosen: number | null }[] {
  const total = Math.min(answers.length, questions.length);
  const missed: { question: McqQuestion; chosen: number | null }[] = [];
  for (let index = 0; index < total; index += 1) {
    if (answers[index] !== questions[index].answer) {
      missed.push({ question: questions[index], chosen: answers[index] ?? null });
    }
  }
  return missed;
}

export function scoreAttempt(
  answers: readonly (number | null)[],
  questions: readonly McqQuestion[],
): number {
  const total = Math.min(answers.length, questions.length);
  let correct = 0;
  for (let index = 0; index < total; index += 1) {
    if (answers[index] === questions[index].answer) correct += 1;
  }
  return correct;
}

export function attemptPercent(correct: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((correct / total) * 100);
}

/** 2 XP per correct answer, plus a 10 XP bonus at 80% or better. */
export function quizXp(correct: number, total: number): number {
  const base = Math.max(0, correct) * 2;
  return attemptPercent(correct, total) >= 80 ? base + 10 : base;
}
