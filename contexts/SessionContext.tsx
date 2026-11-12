import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { readBattery } from '@/lib/device-info';
import { withTimeout } from '@/lib/async';
import { useDevice } from './DeviceContext';
import { useSettings } from './SettingsContext';

export const SESSION_LIMIT = 900;
export interface SessionSample {
  timestamp: number;
  frameRate: number | null;
  frameIntervalMs: number;
  batteryLevel: number | null;
  batteryObservedAt: number | null;
  duringBenchmark: boolean;
}
interface SessionValue {
  history: SessionSample[];
  live: boolean;
  collecting: boolean;
  benchmarkRunning: boolean;
  clearSession: () => void;
}
interface SessionControls {
  live: boolean;
  setLive: (value: boolean) => void;
  clearSession: () => void;
  setBenchmarkRunning: (value: boolean) => void;
}
const SessionContext = createContext<SessionValue | null>(null);
const ControlsContext = createContext<SessionControls | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const { preferences } = useSettings();
  const { foreground } = useDevice();
  const [live, setLive] = useState(true);
  const [benchmarkRunning, setBenchmarkRunning] = useState(false);
  const [history, setHistory] = useState<SessionSample[]>([]);
  const benchmarkRef = useRef(false);
  benchmarkRef.current = benchmarkRunning;
  const clearSession = useCallback(() => setHistory([]), []);

  useEffect(() => {
    if (!live || !foreground) return;
    let raf = 0;
    let stopped = false;
    let frames = 0;
    let start = performance.now();
    let batteryPending = false;
    const sample = () => {
      const now = performance.now();
      const elapsed = now - start;
      const timestamp = Date.now();
      const frameRate = elapsed > 0 ? frames * 1000 / elapsed : null;
      const duringBenchmark = benchmarkRef.current;
      frames = 0; start = now;
      const append = (batteryLevel: number | null, batteryObservedAt: number | null) => {
        if (stopped) return;
        const next: SessionSample = { timestamp, frameRate, frameIntervalMs: elapsed, batteryLevel, batteryObservedAt, duringBenchmark };
        setHistory(previous => [...previous.slice(-(SESSION_LIMIT - 1)), next]);
      };
      if (batteryPending) { append(null, null); return; }
      batteryPending = true;
      void withTimeout(readBattery(), 4000).then(reading => {
        const level = reading.value?.level;
        append(level == null ? null : level * 100, level == null ? null : reading.observedAt ?? Date.now());
      }).catch(() => append(null, null)).finally(() => { batteryPending = false; });
    };
    const countFrame = () => { frames++; raf = requestAnimationFrame(countFrame); };
    raf = requestAnimationFrame(countFrame);
    const timer = setInterval(sample, preferences.sampleIntervalMs);
    return () => { stopped = true; clearInterval(timer); cancelAnimationFrame(raf); };
  }, [live, foreground, preferences.sampleIntervalMs]);

  const controls = useMemo(() => ({ live, setLive, clearSession, setBenchmarkRunning }), [live, clearSession]);
  const collecting = live && foreground;
  const value = useMemo(() => ({ history, live, collecting, benchmarkRunning, clearSession }), [history, live, collecting, benchmarkRunning, clearSession]);
  return <ControlsContext.Provider value={controls}><SessionContext.Provider value={value}>{children}</SessionContext.Provider></ControlsContext.Provider>;
}
export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error('SessionProvider is required.');
  return context;
}
export function useSessionControls() {
  const context = useContext(ControlsContext);
  if (!context) throw new Error('SessionProvider is required.');
  return context;
}
