import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { getDeviceInfo } from '@/lib/device-info';
import { withTimeout } from '@/lib/async';
import type { DeviceSnapshot } from '@/lib/diagnostics';

interface DeviceValue {
  snapshot: DeviceSnapshot | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<boolean>;
  lastUpdated: number | null;
  foreground: boolean;
}
const DeviceContext = createContext<DeviceValue | null>(null);

export function DeviceProvider({ children }: { children: React.ReactNode }) {
  const [snapshot, setSnapshot] = useState<DeviceSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [foreground, setForeground] = useState(AppState.currentState === null || AppState.currentState === 'active');
  const mounted = useRef(true);
  const busy = useRef(false);
  const version = useRef(0);
  const foregroundRef = useRef(foreground);
  foregroundRef.current = foreground;

  const refresh = useCallback(async () => {
    if (busy.current || !mounted.current) return false;
    busy.current = true;
    const request = ++version.current;
    setRefreshing(true);
    try {
      const next = await withTimeout(getDeviceInfo(), 10000);
      if (!mounted.current || request !== version.current) return false;
      setSnapshot(next); setLastUpdated(Date.now()); setError(null);
      return true;
    } catch (cause) {
      if (mounted.current && request === version.current) setError(cause instanceof Error ? `${cause.message} Your previous snapshot is unchanged.` : 'Device readings could not be refreshed. Your previous snapshot is unchanged.');
      return false;
    } finally {
      if (request === version.current) {
        busy.current = false;
        if (mounted.current) { setRefreshing(false); setLoading(false); }
      }
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    const requests = version;
    void refresh();
    const appListener = AppState.addEventListener('change', state => {
      const active = state === 'active';
      setForeground(active);
      if (active) void refresh();
    });
    const visible = () => { setForeground(document.visibilityState === 'visible'); if (document.visibilityState === 'visible') void refresh(); };
    const connected = () => { void refresh(); };
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', visible);
      window.addEventListener('online', connected);
      window.addEventListener('offline', connected);
      if (typeof document.visibilityState === 'string') setForeground(document.visibilityState === 'visible');
    }
    // Snapshot freshness is independent of whether activity collection is paused.
    const timer = setInterval(() => { if (mounted.current && foregroundRef.current) void refresh(); }, 30000);
    return () => {
      mounted.current = false; requests.current++;
      clearInterval(timer); appListener.remove();
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', visible);
        window.removeEventListener('online', connected);
        window.removeEventListener('offline', connected);
      }
    };
  }, [refresh]);

  const value = useMemo(() => ({ snapshot, loading, refreshing, error, refresh, lastUpdated, foreground }), [snapshot, loading, refreshing, error, refresh, lastUpdated, foreground]);
  return <DeviceContext.Provider value={value}>{children}</DeviceContext.Provider>;
}
export function useDevice() {
  const value = useContext(DeviceContext);
  if (!value) throw new Error('DeviceProvider is required.');
  return value;
}
