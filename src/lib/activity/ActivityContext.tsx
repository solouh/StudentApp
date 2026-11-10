/**
 * The activity ledger, shared by every screen through context.
 *
 * - Loads from AsyncStorage once. On first launch it seeds demo history.
 * - `record` appends an event. Events that carry a `dedupeKey` are skipped when
 *   one with the same key already exists for that calendar day.
 * - Saves are debounced, like usePersistentState in lib/storage.ts.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { saveJSON, STORAGE_PREFIX } from '../storage';
import { dayKey, isActivityEvent, MAX_EVENTS, mergeEvents } from './derive';
import { buildDemoEvents } from './seed';
import type { ActivityEvent } from './types';

export const ACTIVITY_KEY = `${STORAGE_PREFIX}activity`;

export type NewActivity = Omit<ActivityEvent, 'id' | 'at'> & { at?: string };

export type ActivityValue = {
  /** Newest first. */
  events: ActivityEvent[];
  hydrated: boolean;
  /** Returns the stored event, or null when a dedupeKey already counted today. */
  record: (input: NewActivity) => ActivityEvent | null;
  /** Removes every event, including demo history. */
  clearAll: () => void;
};

const ActivityContext = createContext<ActivityValue | null>(null);

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function ActivityProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [hydrated, setHydrated] = useState(false);
  // Mirrors the state synchronously so back-to-back records and dedupe checks
  // never read a stale list.
  const eventsRef = useRef<ActivityEvent[]>([]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      let stored: ActivityEvent[] | null = null;
      try {
        const raw = await AsyncStorage.getItem(ACTIVITY_KEY);
        if (raw !== null) {
          const parsed: unknown = JSON.parse(raw);
          stored = Array.isArray(parsed) ? parsed.filter(isActivityEvent) : [];
        }
      } catch {
        stored = [];
      }
      if (cancelled) return;

      // First launch: no ledger yet, so start with demo history.
      const base = stored ?? buildDemoEvents(new Date());
      // Anything recorded before loading finished is kept, not overwritten.
      const merged = mergeEvents(base, eventsRef.current);
      eventsRef.current = merged;
      setEvents(merged);
      setHydrated(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return undefined;
    const timer = setTimeout(() => {
      void saveJSON(ACTIVITY_KEY, events);
    }, 300);
    return () => clearTimeout(timer);
  }, [events, hydrated]);

  const record = useCallback((input: NewActivity): ActivityEvent | null => {
    const at = input.at ?? new Date().toISOString();

    if (input.dedupeKey) {
      const today = dayKey(new Date(at));
      const alreadyCounted = eventsRef.current.some(
        (event) =>
          event.dedupeKey === input.dedupeKey && dayKey(new Date(event.at)) === today,
      );
      if (alreadyCounted) return null;
    }

    const event: ActivityEvent = { ...input, id: newId(), at };
    const next = [event, ...eventsRef.current].slice(0, MAX_EVENTS);
    eventsRef.current = next;
    setEvents(next);
    return event;
  }, []);

  const clearAll = useCallback(() => {
    eventsRef.current = [];
    setEvents([]);
  }, []);

  const value = useMemo<ActivityValue>(
    () => ({ events, hydrated, record, clearAll }),
    [events, hydrated, record, clearAll],
  );

  return <ActivityContext.Provider value={value}>{children}</ActivityContext.Provider>;
}

export function useActivity(): ActivityValue {
  const value = useContext(ActivityContext);
  if (!value) {
    throw new Error('useActivity must be used inside <ActivityProvider>.');
  }
  return value;
}
