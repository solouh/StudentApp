/**
 * Tiny AsyncStorage wrapper plus a debounced persistence hook.
 *
 * Keys are namespaced with a schema version so future data migrations are
 * explicit instead of guessing.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';

export const STORAGE_PREFIX = 'studentapp.v1.';

export async function loadJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function saveJSON<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage is best-effort: settings must never break a print flow.
  }
}

export async function removeJSON(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export type PersistentState<T> = {
  value: T;
  setValue: Dispatch<SetStateAction<T>>;
  hydrated: boolean;
};

/**
 * State that hydrates from AsyncStorage once and saves (debounced) on change.
 */
export function usePersistentState<T>(key: string, initialValue: T): PersistentState<T> {
  const initialRef = useRef(initialValue);
  const [value, setValue] = useState<T>(initialValue);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let mounted = true;
    loadJSON<T>(key, initialRef.current)
      .then((stored) => {
        if (mounted) setValue(stored);
      })
      .finally(() => {
        if (mounted) setHydrated(true);
      });
    return () => {
      mounted = false;
    };
  }, [key]);

  useEffect(() => {
    if (!hydrated) return;
    const timer = setTimeout(() => {
      void saveJSON(key, value);
    }, 350);
    return () => clearTimeout(timer);
  }, [key, value, hydrated]);

  const update = useCallback<Dispatch<SetStateAction<T>>>((next) => setValue(next), []);

  return { value, setValue: update, hydrated };
}
