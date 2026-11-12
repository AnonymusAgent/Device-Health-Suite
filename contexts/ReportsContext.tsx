import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createReportStore, type DiagnosticReport } from '@/lib/reports';

const store = createReportStore(AsyncStorage);
interface ReportsValue {
  reports: DiagnosticReport[];
  ready: boolean;
  error: string | null;
  saveReport: (report: DiagnosticReport) => Promise<boolean>;
  deleteReport: (id: string) => Promise<boolean>;
  clearReports: () => Promise<boolean>;
  retry: () => Promise<void>;
}
const ReportsContext = createContext<ReportsValue | null>(null);
export function ReportsProvider({ children }: { children: React.ReactNode }) {
  const [reports, setReports] = useState<DiagnosticReport[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const retry = useCallback(async () => {
    try { const saved = await store.load(); setReports(saved); setError(null); setReady(true); }
    catch { setError('Saved reports could not be read. Existing data has not been overwritten. Retry, or clear reports in Settings to start fresh.'); setReady(false); }
  }, []);
  useEffect(() => { void retry(); }, [retry]);
  const saveReport = useCallback(async (report: DiagnosticReport) => {
    try { const next = await store.save(report); setReports(next); setError(null); return true; }
    catch { setError('The report could not be saved. Your existing reports are safe. Check available storage and try again.'); return false; }
  }, []);
  const deleteReport = useCallback(async (id: string) => {
    try { const next = await store.remove(id); setReports(next); return true; }
    catch { setError('The report could not be deleted. Please try again.'); return false; }
  }, []);
  const clearReports = useCallback(async () => {
    try { await store.clear(); setReports([]); setError(null); setReady(true); return true; }
    catch { setError('Reports could not be cleared. Please try again.'); return false; }
  }, []);
  const value = useMemo(() => ({ reports, ready, error, saveReport, deleteReport, clearReports, retry }), [reports, ready, error, saveReport, deleteReport, clearReports, retry]);
  return <ReportsContext.Provider value={value}>{children}</ReportsContext.Provider>;
}
export function useReports() {
  const context = useContext(ReportsContext);
  if (!context) throw new Error('ReportsProvider is required.');
  return context;
}
