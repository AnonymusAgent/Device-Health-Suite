import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_PREFERENCES, parsePreferences, preferencesSchema, type Preferences } from '@/lib/preferences';
import { SETTINGS_KEY } from '@/lib/reports';
import { darkColors, lightColors, type ThemeColors } from '@/constants/colors';

interface SettingsValue {
  preferences: Preferences;
  updatePreferences: (patch: Partial<Preferences>) => Promise<void>;
  colors: ThemeColors;
  isDark: boolean;
  storageError: string | null;
  ready: boolean;
}
const SettingsContext = createContext<SettingsValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const current = useRef<Preferences>(DEFAULT_PREFERENCES);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    // Updates queue behind hydration: an early tap cannot overwrite the saved collection.
    queue.current = queue.current.then(async () => {
      try {
        const saved = parsePreferences(await AsyncStorage.getItem(SETTINGS_KEY));
        current.current = saved;
        if (mounted.current) setPreferences(saved);
      } catch {
        if (mounted.current) setStorageError('Saved preferences could not be read. Existing data is unchanged; changes apply for this session until saving succeeds.');
      } finally {
        if (mounted.current) setReady(true);
      }
    });
    return () => { mounted.current = false; };
  }, []);

  const updatePreferences = useCallback((patch: Partial<Preferences>) => {
    const task = queue.current.catch(() => undefined).then(async () => {
      const next = preferencesSchema.parse({ ...current.current, ...patch });
      current.current = next;
      if (mounted.current) setPreferences(next);
      try {
        await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
        if (mounted.current) setStorageError(null);
      } catch {
        if (mounted.current) setStorageError('Your change is active but could not be saved. Device storage may be full or restricted.');
      }
    });
    queue.current = task;
    return task;
  }, []);
  const isDark = preferences.theme === 'dark' || (preferences.theme === 'system' && system === 'dark');
  const value = useMemo(() => ({ preferences, updatePreferences, colors: isDark ? darkColors : lightColors, isDark, storageError, ready }), [preferences, updatePreferences, isDark, storageError, ready]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}
export function useSettings() {
  const value = useContext(SettingsContext);
  if (!value) throw new Error('SettingsProvider is required.');
  return value;
}
export const useColors = () => useSettings().colors;
