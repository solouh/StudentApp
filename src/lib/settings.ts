/**
 * Defaults remembered between tool sessions.
 */
import type { PaperId } from './print/a4';
import { STORAGE_PREFIX, usePersistentState } from './storage';

export type ToolSettings = {
  paper: PaperId;
  marginMm: number;
  gutterMm: number;
  background: string;
  showRuler: boolean;
  showCutMarks: boolean;
  showLabels: boolean;
};

export const DEFAULT_TOOL_SETTINGS: ToolSettings = {
  paper: 'A4',
  marginMm: 10,
  gutterMm: 4,
  background: '#FFFFFF',
  showRuler: true,
  showCutMarks: true,
  showLabels: true,
};

export const SETTINGS_KEY = `${STORAGE_PREFIX}settings`;

export function useToolSettings() {
  return usePersistentState<ToolSettings>(SETTINGS_KEY, DEFAULT_TOOL_SETTINGS);
}
