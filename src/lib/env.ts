/**
 * Runtime environment helpers.
 */

type ExpoGlobal = { expo?: { modules?: Record<string, unknown> } };

/** True when the JS is running inside the Expo Go client (not a dev build). */
export function isExpoGo(): boolean {
  const globalObject = globalThis as unknown as ExpoGlobal;
  return Boolean(globalObject.expo?.modules?.ExpoGo);
}
