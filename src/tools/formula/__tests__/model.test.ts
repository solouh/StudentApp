import { describe, expect, it } from 'vitest';
import { SUBJECTS } from '../../../lib/subjects';
import { STARTER_FORMULAS } from '../sheets';
import {
  ALL_SUBJECT_KEY,
  countBySubject,
  createFormula,
  emptyDraft,
  formulasFor,
  groupBySubject,
  isFormulaValid,
  mergeStarter,
  pinnedFormulas,
  removeFormula,
  searchFormulas,
  togglePin,
  toDraft,
  updateFormula,
  validateFormula,
  type MyFormula,
} from '../model';

const DRAFT = {
  subjectId: 'physics',
  name: 'Ohm’s law',
  expression: 'V = IR',
  note: 'Voltage equals current times resistance.',
};

function userFormula(id: string, subjectId = 'physics'): MyFormula {
  return { ...DRAFT, id, subjectId, createdAt: 1 };
}

describe('validation', () => {
  it('accepts a complete formula', () => {
    expect(isFormulaValid(DRAFT)).toBe(true);
  });

  it('needs a name and an expression', () => {
    const errors = validateFormula({ ...DRAFT, name: ' ', expression: '  ' });
    expect(errors.name).toBeDefined();
    expect(errors.expression).toBeDefined();
  });

  it('starts blank', () => {
    const draft = emptyDraft('biology');
    expect(draft.subjectId).toBe('biology');
    expect(isFormulaValid(draft)).toBe(false);
  });
});

describe('authoring', () => {
  it('creates a trimmed record', () => {
    const formula = createFormula({ ...DRAFT, name: '  Ohm’s law  ', expression: ' V = IR ' });
    expect(formula.name).toBe('Ohm’s law');
    expect(formula.expression).toBe('V = IR');
    expect(formula.id.length > 0).toBe(true);
  });

  it('drops an empty note instead of storing whitespace', () => {
    const formula = createFormula({ ...DRAFT, note: '   ' });
    expect(formula.note).toBeUndefined();
  });

  it('updates and removes', () => {
    const list = [userFormula('a'), userFormula('b')];
    const updated = updateFormula(list, 'b', { ...DRAFT, name: 'Power' });
    expect(updated[1].name).toBe('Power');
    expect(removeFormula(updated, 'a').map((formula) => formula.id)).toEqual(['b']);
  });

  it('round-trips through a draft', () => {
    const formula = createFormula(DRAFT);
    expect(toDraft(formula).expression).toBe('V = IR');
  });
});

describe('browsing', () => {
  const list = [
    userFormula('a', 'physics'),
    userFormula('b', 'physics'),
    {
      ...userFormula('c', 'biology'),
      name: 'Magnification',
      expression: 'image / actual',
      note: 'How much bigger the image is.',
    },
  ];

  it('filters by subject and counts', () => {
    expect(formulasFor(list, 'physics')).toHaveLength(2);
    expect(formulasFor(list, ALL_SUBJECT_KEY)).toHaveLength(3);
    expect(countBySubject(list)).toEqual({ physics: 2, biology: 1 });
  });

  it('groups by subject', () => {
    const groups = groupBySubject(list);
    expect(groups).toHaveLength(2);
    expect(groups.every((group) => group.items.length > 0)).toBe(true);
  });

  it('searches names, expressions and notes, case-insensitively', () => {
    expect(searchFormulas(list, 'OHM')).toHaveLength(2);
    expect(searchFormulas(list, 'resistance')).toHaveLength(2);
    expect(searchFormulas(list, 'magnification', 'biology')).toHaveLength(1);
  });
  it('requires every search word to match', () => {
    expect(searchFormulas(list, 'ohm resistance')).toHaveLength(2);
    expect(searchFormulas(list, 'ohm magnification')).toHaveLength(0);
  });
});

describe('pins', () => {
  it('adds newest first and toggles off', () => {
    const added = togglePin([], 'a');
    expect(added).toEqual(['a']);
    expect(togglePin(added, 'b')).toEqual(['b', 'a']);
    expect(togglePin(['b', 'a'], 'a')).toEqual(['b']);
  });

  it('resolves pins against the student records, dropping deleted ids', () => {
    const list = [userFormula('a'), userFormula('b')];
    expect(pinnedFormulas(list, ['b', 'gone', 'a']).map((formula) => formula.id)).toEqual(['b', 'a']);
  });
});

describe('starter import', () => {
  it('covers every subject and uses namespaced ids', () => {
    for (const subject of SUBJECTS) {
      expect(formulasFor(STARTER_FORMULAS, subject.id).length > 0).toBe(true);
    }
    expect(STARTER_FORMULAS.every((formula) => formula.id.startsWith('starter-'))).toBe(true);
  });

  it('imports once and is safe to tap twice', () => {
    const once = mergeStarter([], STARTER_FORMULAS);
    expect(mergeStarter(once, STARTER_FORMULAS)).toHaveLength(once.length);
  });

  it('keeps starter formulas searchable after import', () => {
    const mine = mergeStarter([], STARTER_FORMULAS);
    expect(searchFormulas(mine, 'energy').length > 0).toBe(true);
  });
});
