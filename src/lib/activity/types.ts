/**
 * Activity ledger types. Every feature (focus sessions, quizzes, formula
 * sheets, notes, toolbox) writes one ActivityEvent. Progress screens are
 * derived from these events, so no screen keeps its own copy of a number.
 */

export type ActivityKind = 'focus' | 'quiz' | 'flashcards' | 'formula' | 'note' | 'paper' | 'tool';

export type ActivityEvent = {
  id: string;
  /** ISO timestamp of the action. */
  at: string;
  kind: ActivityKind;
  /** Subject this belongs to. A subject is a "repo" in the progress view. */
  subjectId?: string;
  /** Commit-style summary shown in the feed, e.g. "Scored 85% on Biology quiz". */
  message: string;
  xp: number;
  /** Study minutes (focus sessions, papers). */
  minutes?: number;
  /** Focus outcome: a tree that grew, or one that withered. */
  status?: 'grown' | 'withered';
  /** 0-100 for quizzes and papers. */
  score?: number;
  /** At most one event per key per calendar day (e.g. opening a toolbox tool). */
  dedupeKey?: string;
  /** Extra numbers and labels, e.g. paper sections or the mission flag. */
  detail?: Record<string, string | number>;
  /** True for generated demo history, so it can be cleared. */
  demo?: boolean;
};

export const KIND_LABELS: Record<ActivityKind, string> = {
  focus: 'Focus',
  quiz: 'Quiz',
  flashcards: 'Flashcards',
  formula: 'Formula sheet',
  note: 'Notes',
  paper: 'Past paper',
  tool: 'Toolbox',
};
