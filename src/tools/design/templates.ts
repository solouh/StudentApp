/**
 * Starter templates for the Design Studio. Each one builds a fresh, fully
 * editable document — nothing here is a fixed image, so a student can open a
 * template and change every word, colour and position.
 */
import {
  createDesign,
  createEmojiLayer,
  createShapeLayer,
  createTextLayer,
  getPage,
  type Design,
  type PageKind,
} from './model';

export type Template = {
  id: string;
  name: string;
  subtitle: string;
  build: () => Design;
};

const INK = '#0E1A15';
const BODY = '#5F6F69';
const MUTED = '#97A5A0';
const MINT = '#6ED9B4';
const MINT_DEEP = '#2FBF92';
const MINT_DARK = '#1E9C75';
const MINT_SOFT = '#E6F8F1';
const MINT_MIST = '#F2FCF8';
const LINE = '#EDF2EF';

function titled(page: PageKind, title: string, background: string, layers: Design['layers']): Design {
  const design = createDesign(page, title);
  return { ...design, background, layers };
}

function blankA4(): Design {
  return titled('A4', 'Blank A4', '#FFFFFF', []);
}

function blankSquare(): Design {
  return titled('square', 'Blank square', '#FFFFFF', []);
}

/** Assignment cover: mint header band with the title, then ruled lines. */
function assignmentCover(): Design {
  return titled('A4', 'Assignment cover', '#FFFFFF', [
    createShapeLayer('rect', 0, 0, 210, 74, MINT),
    createTextLayer('BIOLOGY · UNIT 3', 18, 24, 150),
    { ...createTextLayer('Cell Biology\nAssignment', 18, 34, 174), fontSize: 11, weight: 800 },
    createShapeLayer('rect', 18, 112, 174, 0.5, LINE),
    createShapeLayer('rect', 18, 132, 174, 0.5, LINE),
    createShapeLayer('rect', 18, 152, 174, 0.5, LINE),
    { ...createTextLayer('Name', 18, 104, 60), fontSize: 4.5, color: MUTED, weight: 400 },
    { ...createTextLayer('Class', 18, 124, 60), fontSize: 4.5, color: MUTED, weight: 400 },
    { ...createTextLayer('Due date', 18, 144, 60), fontSize: 4.5, color: MUTED, weight: 400 },
  ]);
}

/** Weekly plan: five tinted rows with day labels. */
function weeklyPlan(): Design {
  const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
  const layers: Design['layers'] = [
    { ...createTextLayer('WEEKLY STUDY PLAN', 16, 14, 178), fontSize: 9, weight: 800 },
  ];

  days.forEach((day, index) => {
    const y = 36 + index * 28;
    layers.push(createShapeLayer('rect', 16, y, 178, 24, index % 2 === 0 ? MINT_MIST : MINT_SOFT));
    layers.push({
      ...createTextLayer(day, 21, y + 3, 90),
      fontSize: 4.2,
      color: MINT_DARK,
      weight: 600,
    });
    layers.push({
      ...createTextLayer('—', 21, y + 10, 160),
      fontSize: 6,
      color: BODY,
      weight: 400,
    });
  });

  return titled('A4', 'Weekly plan', '#FFFFFF', layers);
}

/** Revision card: 3 × 5 card with a question and answer. */
function revisionCard(): Design {
  return titled('card', 'Revision card', MINT_MIST, [
    { ...createTextLayer('QUESTION', 8, 8, 60), fontSize: 3.6, color: MINT_DARK, weight: 600 },
    { ...createTextLayer('What is the SI unit of force?', 8, 16, 60), fontSize: 6.5, weight: 600 },
    createShapeLayer('rect', 8, 50, 60, 0.4, MINT),
    { ...createTextLayer('ANSWER', 8, 58, 60), fontSize: 3.6, color: MINT_DARK, weight: 600 },
    { ...createTextLayer('The newton (N)', 8, 66, 60), fontSize: 7, weight: 800 },
    { ...createTextLayer('Tap to flip →', 8, 112, 60), fontSize: 3.4, color: MUTED, weight: 400 },
  ]);
}

/** Phone wallpaper: a dark focus reminder. */
function phoneWallpaper(): Design {
  return titled('phone', 'Focus wallpaper', INK, [
    createShapeLayer('ellipse', 34, 34, 40, 40, '#16241E'),
    createEmojiLayer('🌱', 44, 44, 20),
    {
      ...createTextLayer('One session\nat a time.', 10, 84, 88),
      fontSize: 9,
      color: '#FFFFFF',
      weight: 800,
      align: 'center',
    },
    {
      ...createTextLayer('STAY FOCUSED', 10, 116, 88),
      fontSize: 3.6,
      color: MINT,
      weight: 600,
      align: 'center',
    },
  ]);
}

/** Square poster: a big number for a daily target. */
function targetPoster(): Design {
  return titled('square', 'Daily target', MINT_MIST, [
    createShapeLayer('ellipse', 30, 8, 60, 60, MINT_SOFT),
    createEmojiLayer('🎯', 48, 24, 24),
    {
      ...createTextLayer('TODAY', 10, 74, 100),
      fontSize: 4.2,
      color: BODY,
      weight: 600,
      align: 'center',
    },
    {
      ...createTextLayer('10 MCQs', 10, 82, 100),
      fontSize: 12,
      weight: 800,
      align: 'center',
    },
    {
      ...createTextLayer(`aim high · ${getPage('square').wMm} mm`, 10, 104, 100),
      fontSize: 3.2,
      color: MUTED,
      weight: 400,
      align: 'center',
    },
  ]);
}

export const TEMPLATES: Template[] = [
  {
    id: 'blank-a4',
    name: 'Blank A4',
    subtitle: 'Start from an empty page',
    build: blankA4,
  },
  {
    id: 'blank-square',
    name: 'Blank square',
    subtitle: 'Social post or recap card',
    build: blankSquare,
  },
  {
    id: 'assignment-cover',
    name: 'Assignment cover',
    subtitle: 'Title band, name and due date',
    build: assignmentCover,
  },
  {
    id: 'weekly-plan',
    name: 'Weekly plan',
    subtitle: 'Five day rows to fill in',
    build: weeklyPlan,
  },
  {
    id: 'revision-card',
    name: 'Revision card',
    subtitle: 'Question and answer card',
    build: revisionCard,
  },
  {
    id: 'phone-wallpaper',
    name: 'Focus wallpaper',
    subtitle: 'Phone-sized reminder',
    build: phoneWallpaper,
  },
  {
    id: 'target-poster',
    name: 'Daily target',
    subtitle: 'Big number poster',
    build: targetPoster,
  },
];

export function getTemplate(id: string): Template | undefined {
  return TEMPLATES.find((template) => template.id === id);
}

/** Tries the template list, then falls back to a blank A4. */
export function buildTemplate(id: string): Design {
  return getTemplate(id)?.build() ?? blankA4();
}

/** `#0E1A15` -> `#0E1A15` (validated), otherwise the fallback. */
export function safeColor(value: unknown, fallback = INK): string {
  return typeof value === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(value) ? value : fallback;
}

export const TEMPLATE_ACCENTS = MINT_DEEP;
