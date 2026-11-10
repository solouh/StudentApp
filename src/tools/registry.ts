/**
 * The toolbox catalog. Shipped tools have `phase: 1` and are pressable; every
 * other entry is a read-only roadmap item so students can see what is coming.
 */
import {
  BookIcon,
  CheckIcon,
  ClockIcon,
  DownloadIcon,
  GridIcon,
  InfoIcon,
  LayersIcon,
  PhotoIcon,
  ScissorsIcon,
  ShareIcon,
  SlidersIcon,
  SparkleIcon,
  StarIcon,
} from '../components/Icons';
import type {
  PlannedToolId,
  ReadyToolDefinition,
  ReadyToolId,
  ToolCategory,
  ToolDefinition,
  ToolId,
} from './types';

export const CATEGORIES: { id: 'all' | ToolCategory; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'create', label: 'Create & print' },
  { id: 'study', label: 'Study' },
  { id: 'organise', label: 'Organise' },
  { id: 'utility', label: 'Utilities' },
];

export const CATEGORY_LABELS: Record<ToolCategory, string> = {
  create: 'Create & print',
  study: 'Study',
  organise: 'Organise',
  utility: 'Utilities',
};

export const PHASE_LABELS: Record<2 | 3 | 4, string> = {
  2: 'Phase 2 · print pack',
  3: 'Phase 3 · study tools',
  4: 'Phase 4 · utilities',
};

export const READY_TOOLS: ReadyToolDefinition[] = [
  {
    id: 'design',
    name: 'Design Studio',
    blurb: 'Canva-style pages: text, photos, shapes and stickers you can print.',
    category: 'create',
    keywords: ['design', 'canva', 'poster', 'cover', 'template', 'layout', 'page', 'edit'],
    phase: 2,
    accent: 'mint',
    Icon: GridIcon,
    closed: true,
  },
  {
    id: 'collage',
    name: 'Collage',
    blurb: 'Combine 1–9 photos into a grid, then print or share.',
    category: 'create',
    keywords: ['photos', 'grid', 'print', 'share', 'combine', 'sheet'],
    phase: 1,
    accent: 'mint',
    Icon: LayersIcon,
  },
  {
    id: 'slice',
    name: 'Grid Cut & Poster',
    blurb: 'Slice one picture into A4 tiles for a poster or photo sheet.',
    category: 'create',
    keywords: ['cut', 'slice', 'poster', 'tiles', 'a4', 'print'],
    phase: 1,
    accent: 'lilac',
    Icon: ScissorsIcon,
  },
  {
    id: 'idphoto',
    name: 'ID Photo Sheet',
    blurb: 'Make a passport or IC photo sheet with cut lines.',
    category: 'create',
    keywords: ['passport', 'ic', 'photo', 'sheet', 'print', 'cut'],
    phase: 1,
    accent: 'sky',
    Icon: PhotoIcon,
  },
  {
    id: 'mcq',
    name: 'MCQ Practice',
    blurb: 'Offline questions with instant marking and a scored review.',
    category: 'study',
    keywords: ['mcq', 'quiz', 'practice', 'exam', 'questions', 'marks', 'score'],
    phase: 3,
    accent: 'sky',
    Icon: CheckIcon,
  },
  {
    id: 'formula',
    name: 'Formula Sheet',
    blurb: 'Search and pin formulas per subject — works offline.',
    category: 'study',
    keywords: ['formula', 'math', 'physics', 'chemistry', 'reference', 'pin'],
    phase: 3,
    accent: 'lilac',
    Icon: SparkleIcon,
  },
];

export const PLANNED_TOOLS: ToolDefinition[] = [
  {
    id: 'scan',
    name: 'Scan to PDF',
    blurb: 'Turn several homework photos into one clean PDF to send.',
    category: 'create',
    keywords: ['scan', 'pdf', 'homework', 'submit', 'photos'],
    phase: 2,
    accent: 'peach',
    Icon: DownloadIcon,
  },
  {
    id: 'paper',
    name: 'Printable Paper',
    blurb: 'Lined, graph, dot, Cornell and music paper sheets.',
    category: 'create',
    keywords: ['lined', 'graph', 'cornell', 'paper', 'print', 'notes'],
    phase: 2,
    accent: 'warm',
    Icon: BookIcon,
  },
  {
    id: 'flashcard-sheets',
    name: 'Flashcard Sheets',
    blurb: 'Print 8 cards per A4 with fold and cut lines.',
    category: 'create',
    keywords: ['flashcards', 'cards', 'print', 'cut', 'revise'],
    phase: 2,
    accent: 'lilac',
    Icon: LayersIcon,
  },
  {
    id: 'timetable',
    name: 'Timetable Poster',
    blurb: 'Printable timetable plus a phone wallpaper export.',
    category: 'create',
    keywords: ['timetable', 'schedule', 'wallpaper', 'print'],
    phase: 2,
    accent: 'sky',
    Icon: ClockIcon,
  },
  {
    id: 'flashcards',
    name: 'Flashcards',
    blurb: 'Revise with decks that repeat what you keep forgetting.',
    category: 'study',
    keywords: ['flashcards', 'revise', 'spaced', 'deck', 'memory'],
    phase: 3,
    accent: 'mint',
    Icon: LayersIcon,
  },
  {
    id: 'grades',
    name: 'Grades & Target',
    blurb: 'See the marks you still need on the next paper.',
    category: 'study',
    keywords: ['grades', 'marks', 'target', 'cgpa', 'score'],
    phase: 3,
    accent: 'warm',
    Icon: StarIcon,
  },
  {
    id: 'deadlines',
    name: 'Deadlines',
    blurb: 'Track homework and exam dates with reminders.',
    category: 'study',
    keywords: ['deadline', 'homework', 'reminder', 'exam', 'due'],
    phase: 3,
    accent: 'peach',
    Icon: ClockIcon,
  },
  {
    id: 'notes',
    name: 'Notes',
    blurb: 'Subject-tagged notes that export to PDF.',
    category: 'study',
    keywords: ['notes', 'summary', 'pdf', 'export', 'subject'],
    phase: 3,
    accent: 'rose',
    Icon: BookIcon,
  },
  {
    id: 'papers',
    name: 'Past Papers',
    blurb: 'Keep track of the papers you have completed.',
    category: 'study',
    keywords: ['past', 'papers', 'exam', 'tracker'],
    phase: 3,
    accent: 'sky',
    Icon: BookIcon,
  },
  {
    id: 'syllabus',
    name: 'Syllabus Checklist',
    blurb: 'Tick off topics and watch coverage grow.',
    category: 'study',
    keywords: ['syllabus', 'topics', 'checklist', 'progress'],
    phase: 3,
    accent: 'mint',
    Icon: GridIcon,
  },
  {
    id: 'recap',
    name: 'Study Recap',
    blurb: 'A shareable summary card of your focus sessions.',
    category: 'study',
    keywords: ['recap', 'streak', 'share', 'focus', 'card'],
    phase: 4,
    accent: 'peach',
    Icon: SparkleIcon,
  },
  {
    id: 'attendance',
    name: 'Attendance',
    blurb: 'Attendance percentage and how many skips are safe.',
    category: 'organise',
    keywords: ['attendance', 'class', 'percentage', 'skips'],
    phase: 4,
    accent: 'mint',
    Icon: CheckIcon,
  },
  {
    id: 'budget',
    name: 'Allowance Tracker',
    blurb: 'Track pocket money and daily spending.',
    category: 'organise',
    keywords: ['budget', 'money', 'allowance', 'spending'],
    phase: 4,
    accent: 'warm',
    Icon: SlidersIcon,
  },
  {
    id: 'group',
    name: 'Group Project Board',
    blurb: 'Split group tasks and share the plan as text.',
    category: 'organise',
    keywords: ['group', 'project', 'tasks', 'share'],
    phase: 4,
    accent: 'sky',
    Icon: ShareIcon,
  },
  {
    id: 'calculator',
    name: 'Scientific Calculator',
    blurb: 'Calculator with a function graph and history.',
    category: 'utility',
    keywords: ['calculator', 'graph', 'math', 'scientific'],
    phase: 4,
    accent: 'lilac',
    Icon: SlidersIcon,
  },
  {
    id: 'converter',
    name: 'Unit Converter',
    blurb: 'Convert units for physics and chemistry problems.',
    category: 'utility',
    keywords: ['convert', 'units', 'physics', 'chemistry', 'measurement'],
    phase: 4,
    accent: 'mint',
    Icon: SlidersIcon,
  },
  {
    id: 'periodic',
    name: 'Periodic Table',
    blurb: 'Searchable periodic table with element details.',
    category: 'utility',
    keywords: ['periodic', 'elements', 'chemistry', 'table'],
    phase: 4,
    accent: 'sky',
    Icon: GridIcon,
  },
  {
    id: 'citation',
    name: 'Citation Builder',
    blurb: 'Format APA, MLA or IEEE references to copy.',
    category: 'utility',
    keywords: ['citation', 'apa', 'mla', 'reference', 'bibliography'],
    phase: 4,
    accent: 'rose',
    Icon: BookIcon,
  },
  {
    id: 'qr',
    name: 'QR Codes',
    blurb: 'Generate or scan QR codes for class links.',
    category: 'utility',
    keywords: ['qr', 'scan', 'link', 'share', 'class'],
    phase: 4,
    accent: 'lilac',
    Icon: GridIcon,
  },
  {
    id: 'pdf-tools',
    name: 'PDF Toolkit',
    blurb: 'Merge, split or rotate PDF files on the phone.',
    category: 'utility',
    keywords: ['pdf', 'merge', 'split', 'rotate', 'files'],
    phase: 4,
    accent: 'peach',
    Icon: LayersIcon,
  },
  {
    id: 'counter',
    name: 'Word Counter',
    blurb: 'Word count and reading time for your essays.',
    category: 'utility',
    keywords: ['word', 'counter', 'essay', 'reading', 'time'],
    phase: 4,
    accent: 'warm',
    Icon: InfoIcon,
  },
];

export const ALL_TOOLS: ToolDefinition[] = [...READY_TOOLS, ...PLANNED_TOOLS];

/** Tools the student can actually open right now (excludes parked ones). */
export const VISIBLE_READY_TOOLS: ReadyToolDefinition[] = READY_TOOLS.filter(
  (tool) => !tool.closed,
);

export const VISIBLE_READY_TOOL_IDS: ReadyToolId[] = VISIBLE_READY_TOOLS.map((tool) => tool.id);

/** Shipped but parked for rework; shown as such on the roadmap. */
export const CLOSED_TOOLS: ReadyToolDefinition[] = READY_TOOLS.filter((tool) => tool.closed);

export function isReadyTool(id: ToolId): id is ReadyToolDefinition['id'] {
  return VISIBLE_READY_TOOLS.some((tool) => tool.id === id);
}

export function getTool(id: ToolId): ToolDefinition | undefined {
  return ALL_TOOLS.find((tool) => tool.id === id);
}

function matchesQuery(tool: ToolDefinition, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const haystack = [tool.name, tool.blurb, CATEGORY_LABELS[tool.category], ...tool.keywords]
    .join(' ')
    .toLowerCase();
  return needle.split(/\s+/).every((word) => haystack.includes(word));
}

/** Shipped tools filtered by the hub's search + category chips. */
export function filterReadyTools(query: string, category: 'all' | ToolCategory): ReadyToolDefinition[] {
  return VISIBLE_READY_TOOLS.filter(
    (tool) => (category === 'all' || tool.category === category) && matchesQuery(tool, query),
  );
}

/** Planned tools for a phase, optionally filtered by search (roadmap screen). */
export function plannedToolsForPhase(
  phase: 2 | 3 | 4,
  query = '',
): ToolDefinition[] {
  return PLANNED_TOOLS.filter(
    (tool) => tool.phase === phase && matchesQuery(tool, query),
  );
}

export function plannedTools(): ToolDefinition[] {
  return PLANNED_TOOLS;
}

export function plannedToolCount(): number {
  return PLANNED_TOOLS.length;
}

export type { PlannedToolId };
