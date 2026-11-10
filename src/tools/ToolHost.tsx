import { useEffect } from 'react';
import { useActivity } from '../lib/activity/ActivityContext';
import CollageScreen from './collage/CollageScreen';
import IdPhotoScreen from './collage/IdPhotoScreen';
import SliceScreen from './collage/SliceScreen';
import DesignScreen from './design/DesignScreen';
import FormulaScreen from './formula/FormulaScreen';
import McqScreen from './quiz/McqScreen';
import { getTool } from './registry';
import type { ReadyToolId } from './types';

type Props = {
  toolId: ReadyToolId;
  onClose: () => void;
};

/** Toolbox XP for opening a tool. Counted once per tool per day. */
const TOOL_OPEN_XP = 5;

/** Maps a ready tool id to its full-screen screen. */
export function ToolHost({ toolId, onClose }: Props) {
  const { record } = useActivity();

  useEffect(() => {
    const name = getTool(toolId)?.name ?? 'a tool';
    record({
      kind: 'tool',
      message: `Opened ${name} in Toolbox`,
      xp: TOOL_OPEN_XP,
      dedupeKey: `tool:${toolId}`,
    });
  }, [toolId, record]);

  switch (toolId) {
    case 'design':
      return <DesignScreen onClose={onClose} />;
    case 'collage':
      return <CollageScreen onClose={onClose} />;
    case 'slice':
      return <SliceScreen onClose={onClose} />;
    case 'idphoto':
      return <IdPhotoScreen onClose={onClose} />;
    case 'mcq':
      return <McqScreen onClose={onClose} />;
    case 'formula':
      return <FormulaScreen onClose={onClose} />;
    default:
      return null;
  }
}

export default ToolHost;
