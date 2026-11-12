import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { getDeviceInfo, readBattery } from '@/lib/device-info';
import type { DeviceSnapshot } from '@/lib/diagnostics';
import { useSettings } from './SettingsContext';

export interface SessionSample { timestamp: number; frameRate: number | null; batteryLevel: number | null }
interface SessionValue {
  snapshot: DeviceSnapshot | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<boolean>;
  live: boolean;
  setLive: (value: boolean) => void;
  history: SessionSample[];
  clearSession: () => void;
  lastUpdated: number | null;
}
const SessionContext = createContext<SessionValue | null>(null);
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const { preferences } = useSettings();
  const [snapshot, setSnapshot] = useState<DeviceSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(true);
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  const [history, setHistory] = useState<SessionSample[]>([]);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const mounted = useRef(true);
  const refreshingRef = useRef(false);
  const requestVersion = useRef(0);
  useEffect(() => { mounted.current = true; const versions = requestVersion; return () => { mounted.current = false; versions.current++; }; }, []);
  const refresh = useCallback(async () => {
    if (refreshingRef.current) return false;
    refreshingRef.current = true;
    const version = ++requestVersion.current;
    setRefreshing(true);
    try {
      const next = await getDeviceInfo();
      if (!mounted.current || version !== requestVersion.current) return false;
      setSnapshot(next); setError(null); setLastUpdated(Date.now());
      return true;
    } catch {
      if (mounted.current) setError('We couldn’t refresh this device. Your last reading is still shown. Please try again.');
      return false;
    } finally {
      refreshingRef.current = false;
      if (mounted.current) { setRefreshing(false); setLoading(false); }
    }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => setForeground(state === 'active'));
    const onVisibility = () => setForeground(document.visibilityState === 'visible');
    if (Platform.OS === 'web' && typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisibility);
    return () => { subscription.remove(); if (Platform.OS === 'web' && typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisibility); };
  }, []);
  useEffect(() => {
    if (!live || !foreground) return;
    let raf = 0;
    let frames = 0;
    let start = performance.now();
    let batteryPending = false;
    let stopped = false;
    const countFrame = () => { frames++; raf = requestAnimationFrame(countFrame); };
    raf = requestAnimationFrame(countFrame);
    const timer = setInterval(() => {
      const now = performance.now();
      const elapsed = now - start;
      const frameRate = elapsed > 0 ? frames * 1000 / elapsed : 0;
      frames = 0; start = now;
      const timestamp = Date.now();
      setHistory(previous => [...previous.slice(-899), { timestamp, frameRate, batteryLevel: null }]);
      if (!batteryPending) {
        batteryPending = true;
        void readBattery().then(reading => {
          if (stopped) return;
          const level = reading.value?.level;
          if (level === undefined || level === null) return;
          setHistory(previous => previous.map(sample => sample.timestamp === timestamp ? { ...sample, batteryLevel: level * 100 } : sample));
        }).catch(() => undefined).finally(() => { batteryPending = false; });
      }
    }, preferences.sampleIntervalMs);
    const refreshTimer = setInterval(() => { void refresh(); }, 30000);
    return () => { stopped = true; clearInterval(timer); clearInterval(refreshTimer); cancelAnimationFrame(raf); };
  }, [live, foreground, preferences.sampleIntervalMs, refresh]);
  const clearSession = useCallback(() => setHistory([]), []);
  const value = useMemo(() => ({ snapshot, loading, refreshing, error, refresh, live, setLive, history, clearSession, lastUpdated }), [snapshot, loading, refreshing, error, refresh, live, history, clearSession, lastUpdated]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error('SessionProvider is required.');
  return context;
}
