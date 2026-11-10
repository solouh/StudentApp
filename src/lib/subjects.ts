/**
 * The student's subjects. Shared by Subjects, Focus and the activity ledger
 * (a subject is a "repo" in the progress view).
 */
import { subjectTints } from '../theme';

export type Subject = {
  id: string;
  name: string;
  lessonCount: number;
  emoji: string;
  tint: { bg: string; fg: string };
  completed?: boolean;
};

export const SUBJECTS: Subject[] = [
  {
    id: 'biology',
    name: 'Biology',
    lessonCount: 25,
    emoji: '🧬',
    tint: subjectTints.bio,
    completed: true,
  },
  {
    id: 'chemistry',
    name: 'Chemistry',
    lessonCount: 18,
    emoji: '⚗️',
    tint: subjectTints.chem,
  },
  {
    id: 'physics',
    name: 'Physics',
    lessonCount: 20,
    emoji: '🪐',
    tint: subjectTints.phys,
  },
  {
    id: 'agriculture',
    name: 'Agriculture',
    lessonCount: 12,
    emoji: '🌾',
    tint: subjectTints.agri,
  },
  {
    id: 'writing',
    name: 'Paper Writing',
    lessonCount: 8,
    emoji: '✍️',
    tint: subjectTints.writing,
  },
];

export function getSubject(id?: string): Subject | undefined {
  return SUBJECTS.find((subject) => subject.id === id);
}
