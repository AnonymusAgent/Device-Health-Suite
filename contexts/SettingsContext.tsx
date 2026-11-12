import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_PREFERENCES, parsePreferences, type Preferences } from '@/lib/preferences';
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
  const current = useRef(preferences);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(SETTINGS_KEY).then(raw => {
      if (!mounted) return;
      const saved = parsePreferences(raw); current.current = saved; setPreferences(saved);
    }).catch(() => { if (mounted) setStorageError('Preferences could not be loaded. Changes apply for this session until storage is available.'); })
      .finally(() => { if (mounted) setReady(true); });
    return () => { mounted = false; };
  }, []);
  const updatePreferences = useCallback((patch: Partial<Preferences>) => {
    const next = { ...current.current, ...patch };
    current.current = next; setPreferences(next);
    const task = queue.current.catch(() => undefined).then(() => AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next)));
    queue.current = task;
    return task.then(() => setStorageError(null)).catch(() => {
      setStorageError('Your change is active but could not be saved. Device storage may be full or restricted.');
    });
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
