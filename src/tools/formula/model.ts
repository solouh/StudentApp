/**
 * Student-authored formulas.
 *
 * Formulas are typed in by the student (name + expression + optional note) and
 * grouped per subject. Nothing is pre-filled: the bundled sheet is only offered
 * as an optional starter set that lands in the student's own list.
 *
 * Pure module: no React Native imports, so it can be unit-tested in Node.
 */
import { createId } from '../../lib/id';

export type MyFormula = {
  id: string;
  /** Real subject id from lib/subjects.ts. */
  subjectId: string;
  name: string;
  expression: string;
  note?: string;
  /** Optional search aids; user-added formulas usually have none. */
  tags?: string[];
  createdAt?: number;
};

export type FormulaDraft = {
  subjectId: string;
  name: string;
  expression: string;
  note: string;
};

export type FormulaErrors = {
  name?: string;
  expression?: string;
};

export const ALL_SUBJECT_KEY = 'all';

const MIN_NAME = 2;

export function emptyDraft(subjectId: string): FormulaDraft {
  return { subjectId, name: '', expression: '', note: '' };
}

/** `{}` means valid. */
export function validateFormula(draft: FormulaDraft): FormulaErrors {
  const errors: FormulaErrors = {};
  if (draft.name.trim().length < MIN_NAME) {
    errors.name = 'Give the formula a name, e.g. “Ohm’s law”.';
  }
  if (draft.expression.trim().length === 0) {
    errors.expression = 'Type the formula itself.';
  }
  return errors;
}

export function isFormulaValid(draft: FormulaDraft): boolean {
  return Object.keys(validateFormula(draft)).length === 0;
}

export function createFormula(draft: FormulaDraft): MyFormula {
  const note = draft.note.trim();
  return {
    id: createId('f'),
    subjectId: draft.subjectId,
    name: draft.name.trim(),
    expression: draft.expression.trim(),
    ...(note ? { note } : {}),
    createdAt: Date.now(),
  };
}

export function updateFormula(
  list: readonly MyFormula[],
  id: string,
  draft: FormulaDraft,
): MyFormula[] {
  const note = draft.note.trim();
  return list.map((formula) =>
    formula.id === id
      ? {
          ...formula,
          subjectId: draft.subjectId,
          name: draft.name.trim(),
          expression: draft.expression.trim(),
          note: note || undefined,
        }
      : formula,
  );
}

export function removeFormula(list: readonly MyFormula[], id: string): MyFormula[] {
  return list.filter((formula) => formula.id !== id);
}

export function toDraft(formula: MyFormula): FormulaDraft {
  return {
    subjectId: formula.subjectId,
    name: formula.name,
    expression: formula.expression,
    note: formula.note ?? '',
  };
}

/* ------------------------------------------------------------------ */
/* Browsing                                                            */
/* ------------------------------------------------------------------ */

export function formulasFor(
  list: readonly MyFormula[],
  subjectId: string = ALL_SUBJECT_KEY,
): MyFormula[] {
  if (subjectId === ALL_SUBJECT_KEY) return [...list];
  return list.filter((formula) => formula.subjectId === subjectId);
}

/** Every word must match the name, expression, note or a tag. */
export function searchFormulas(
  list: readonly MyFormula[],
  query: string,
  subjectId: string = ALL_SUBJECT_KEY,
): MyFormula[] {
  const pool = formulasFor(list, subjectId);
  const needle = query.trim().toLowerCase();
  if (!needle) return pool;

  const words = needle.split(/\s+/);
  return pool.filter((formula) => {
    const haystack = [
      formula.name,
      formula.expression,
      formula.note ?? '',
      ...(formula.tags ?? []),
    ]
      .join(' ')
      .toLowerCase();
    return words.every((word) => haystack.includes(word));
  });
}

export function countBySubject(list: readonly MyFormula[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const formula of list) {
    counts[formula.subjectId] = (counts[formula.subjectId] ?? 0) + 1;
  }
  return counts;
}

export function groupBySubject(list: readonly MyFormula[]): { subjectId: string; items: MyFormula[] }[] {
  const groups = new Map<string, MyFormula[]>();
  for (const formula of list) {
    const bucket = groups.get(formula.subjectId) ?? [];
    bucket.push(formula);
    groups.set(formula.subjectId, bucket);
  }
  return [...groups.entries()].map(([subjectId, items]) => ({ subjectId, items }));
}

/* ------------------------------------------------------------------ */
/* Pins                                                                */
/* ------------------------------------------------------------------ */

/** Adds or removes an id, newest pin first. */
export function togglePin(pinned: readonly string[], id: string): string[] {
  if (pinned.includes(id)) return pinned.filter((entry) => entry !== id);
  return [id, ...pinned];
}

/** Pins in pin order, dropping ids whose formula was deleted. */
export function pinnedFormulas(list: readonly MyFormula[], pinned: readonly string[]): MyFormula[] {
  const byId = new Map(list.map((formula) => [formula.id, formula]));
  return pinned
    .map((id) => byId.get(id))
    .filter((formula): formula is MyFormula => formula !== undefined);
}

/* ------------------------------------------------------------------ */
/* Starter set                                                         */
/* ------------------------------------------------------------------ */

/** Adds starter formulas that are not already present (matched by id). */
export function mergeStarter(
  list: readonly MyFormula[],
  starter: readonly MyFormula[],
): MyFormula[] {
  const existing = new Set(list.map((formula) => formula.id));
  const added = starter.filter((formula) => !existing.has(formula.id));
  return [...list, ...added];
}
