import { z } from 'zod';
import { benchmarkMetrics, type BenchmarkResult } from './benchmarks';
import { deriveChecks, snapshotRows, type DeviceSnapshot } from './diagnostics';

const metricSchema = z.object({ label: z.string().max(120), value: z.string().max(1000) });
const readingSchema = <T extends z.ZodTypeAny>(value: T) => z.object({ value: value.nullable(), status: z.enum(['measured', 'estimated', 'unavailable']), source: z.string(), note: z.string().optional() });
const snapshotSchema = z.object({
  capturedAt: z.number(), platform: z.enum(['web', 'ios', 'android', 'other']),
  device: z.object({ name: z.string(), brand: z.string().nullable(), manufacturer: z.string().nullable(), model: z.string().nullable(), os: z.string(), type: z.string(), isDevice: z.boolean() }),
  processor: z.object({ architecture: z.string().nullable(), cores: readingSchema(z.number()) }),
  memory: z.object({ totalBytes: readingSchema(z.number()) }),
  storage: readingSchema(z.object({ totalBytes: z.number(), usedBytes: z.number(), freeBytes: z.number() })),
  battery: readingSchema(z.object({ level: z.number().min(0).max(1), charging: z.boolean().nullable(), lowPower: z.boolean().nullable() })),
  display: z.object({ width: z.number(), height: z.number(), scale: z.number(), fontScale: z.number(), isViewport: z.boolean() }),
  network: z.object({ online: z.boolean().nullable(), transport: z.string().nullable(), source: z.string() }),
  warnings: z.array(z.string()),
});
export const reportSchema = z.object({
  id: z.string().min(1).max(100), kind: z.enum(['compute', 'memory', 'snapshot']),
  title: z.string().max(120), createdAt: z.number().nonnegative(),
  status: z.enum(['completed', 'cancelled']), durationMs: z.number().nonnegative(),
  platform: z.string().max(40), deviceName: z.string().max(200), summary: z.string().max(2000),
  metrics: z.array(metricSchema).max(40), snapshot: snapshotSchema.optional(),
});
export type DiagnosticReport = z.infer<typeof reportSchema>;
export const REPORT_LIMIT = 50;
export const REPORTS_KEY = 'veylo:reports:v1';
export const SETTINGS_KEY = 'veylo:settings:v1';

export function parseReports(raw: string | null): DiagnosticReport[] {
  if (raw === null) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed) || parsed.length > REPORT_LIMIT) throw new Error('The saved report collection is not valid.');
  return parsed.map(item => reportSchema.parse(item));
}
export function addReport(reports: DiagnosticReport[], report: DiagnosticReport): DiagnosticReport[] {
  return [reportSchema.parse(report), ...reports.filter(item => item.id !== report.id)].slice(0, REPORT_LIMIT);
}
export function newId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`; // Report identifier only; never used for security.
}
function reportBase(kind: DiagnosticReport['kind'], title: string, snapshot: DeviceSnapshot | null) {
  return { id: newId(), kind, title, createdAt: Date.now(), platform: snapshot?.platform ?? 'unknown', deviceName: snapshot?.device.name ?? 'Unknown device', snapshot: snapshot ?? undefined };
}
export function createBenchmarkReport(result: BenchmarkResult, snapshot: DeviceSnapshot | null): DiagnosticReport {
  if (result.status === 'error') throw new Error('An failed check cannot be saved as a result.');
  return reportSchema.parse({ ...reportBase(result.kind, result.kind === 'compute' ? 'Compute check' : 'Memory check', snapshot),
    status: result.status, durationMs: result.durationMs,
    summary: result.status === 'cancelled' ? 'Stopped early. Partial measurements are not a completed benchmark.' : result.kind === 'compute' ? 'A short, single-thread JavaScript integer workload. Compare only on the same device and runtime.' : 'A bounded allocation and sampled integrity check, not a measurement of total system RAM.',
    metrics: benchmarkMetrics(result),
  });
}
export function createSnapshotReport(snapshot: DeviceSnapshot): DiagnosticReport {
  const checks = deriveChecks(snapshot);
  return reportSchema.parse({ ...reportBase('snapshot', 'Device snapshot', snapshot), status: 'completed', durationMs: 0,
    summary: `${checks.length} supported checks captured. ${snapshot.warnings.length} platform limitations noted. This snapshot is not a hardware diagnosis.`,
    metrics: snapshotRows(snapshot).map(row => ({ label: row.label, value: `${row.value} · ${row.source}` })),
  });
}
export function reportsToCSV(reports: DiagnosticReport[]): string {
  const cell = (value: string | number) => {
    let text = String(value);
    if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  };
  const rows: (string | number)[][] = [['report_id', 'created_at', 'kind', 'status', 'device', 'platform', 'duration_ms', 'metric', 'value']];
  for (const report of reports) for (const metric of report.metrics) rows.push([report.id, new Date(report.createdAt).toISOString(), report.kind, report.status, report.deviceName, report.platform, Math.round(report.durationMs), metric.label, metric.value]);
  return rows.map(row => row.map(cell).join(',')).join('\r\n');
}
export interface KeyValueStore { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void>; removeItem(key: string): Promise<void> }
/** Serialize writes so rapid actions cannot overwrite a newer saved collection. */
export function createReportStore(storage: KeyValueStore) {
  let queue: Promise<unknown> = Promise.resolve();
  const serialize = <T>(task: () => Promise<T>): Promise<T> => {
    const next = queue.then(task, task);
    queue = next.catch(() => undefined);
    return next;
  };
  return {
    load: () => serialize(async () => parseReports(await storage.getItem(REPORTS_KEY))),
    save: (report: DiagnosticReport) => serialize(async () => {
      const next = addReport(parseReports(await storage.getItem(REPORTS_KEY)), report);
      await storage.setItem(REPORTS_KEY, JSON.stringify(next));
      return next;
    }),
    remove: (id: string) => serialize(async () => {
      const next = parseReports(await storage.getItem(REPORTS_KEY)).filter(report => report.id !== id);
      await storage.setItem(REPORTS_KEY, JSON.stringify(next));
      return next;
    }),
    clear: () => serialize(async () => { await storage.removeItem(REPORTS_KEY); return [] as DiagnosticReport[]; }),
  };
}
