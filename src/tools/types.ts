import type { ComponentType } from 'react';
import type { IconProps } from '../components/Icons';
import type { ToolAccent } from '../theme';

export type ToolCategory = 'create' | 'study' | 'organise' | 'utility';

/** Tools that ship today and can be opened from the Toolbox. */
export const READY_TOOL_IDS = ['design', 'collage', 'slice', 'idphoto', 'mcq', 'formula'] as const;
export type ReadyToolId = (typeof READY_TOOL_IDS)[number];

/** Catalogued tools for later phases (shown in the roadmap). */
export type PlannedToolId =
  | 'scan'
  | 'paper'
  | 'flashcard-sheets'
  | 'timetable'
  | 'flashcards'
  | 'grades'
  | 'deadlines'
  | 'notes'
  | 'papers'
  | 'syllabus'
  | 'recap'
  | 'attendance'
  | 'budget'
  | 'group'
  | 'calculator'
  | 'converter'
  | 'periodic'
  | 'citation'
  | 'qr'
  | 'pdf-tools'
  | 'counter';

export type ToolId = ReadyToolId | PlannedToolId;

export type ToolDefinition = {
  id: ToolId;
  name: string;
  blurb: string;
  category: ToolCategory;
  keywords: string[];
  phase: 1 | 2 | 3 | 4;
  accent: ToolAccent;
  Icon: ComponentType<IconProps>;
  /**
   * Shipped but hidden from the toolbox (e.g. parked for rework). The screen
   * stays wired in ToolHost, so reopening is a one-line change here.
   */
  closed?: boolean;
};

/** A shipped tool. `phase` records when it was planned; it is no longer 1-only. */
export type ReadyToolDefinition = ToolDefinition & { id: ReadyToolId };
