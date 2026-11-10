/**
 * Shared async task + notice handling for tool screens: one busy modal, one
 * friendly error strip, no raw native exceptions in the UI.
 */
import { useCallback, useState } from 'react';
import { Linking } from 'react-native';
import { isCancelled, ERROR_MESSAGES, toToolError } from '../lib/errors';

export type ToolNotice = {
  tone: 'info' | 'error' | 'success';
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function useToolTasks() {
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNoticeState] = useState<ToolNotice | null>(null);

  const setNotice = useCallback((next: ToolNotice | null) => {
    setNoticeState(next);
  }, []);

  const run = useCallback(
    async (busyMessage: string, task: () => Promise<void>): Promise<boolean> => {
      setBusy(busyMessage);
      setNoticeState(null);
      try {
        await task();
        return true;
      } catch (error) {
        if (!isCancelled(error)) {
          const toolError = toToolError(error);
          const message = ERROR_MESSAGES[toolError.kind] || ERROR_MESSAGES.unknown;
          if (toolError.kind === 'permission') {
            setNoticeState({
              tone: 'error',
              message,
              actionLabel: 'Open settings',
              onAction: () => {
                void Linking.openSettings();
              },
            });
          } else {
            setNoticeState({ tone: 'error', message });
          }
        }
        return false;
      } finally {
        setBusy(null);
      }
    },
    [],
  );

  return { busy, notice, setNotice, run };
}
