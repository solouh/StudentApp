import { useEffect } from 'react';
import { BackHandler } from 'react-native';

/**
 * Android hardware back support for full-screen tools (the app has no router).
 * The handler returns `true` when it consumed the press.
 */
export function useBackHandler(handler: () => boolean) {
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', handler);
    return () => subscription.remove();
  }, [handler]);
}
