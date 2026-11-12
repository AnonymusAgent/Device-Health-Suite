import { z } from 'zod';
import { APP_NAME, APP_VERSION, REPORT_FORMAT_VERSION } from './app-meta';
import { benchmarkMetrics, type BenchmarkResult } from './benchmarks';
import { deriveInsights } from './insights';
import { snapshotRows, type DeviceSnapshot } from './diagnostics';

const finite = z.number().finite();
const nonnegative = finite.nonnegative();
const timestamp = nonnegative;
const metricSchema = z.object({
  label: z.string().min(1).max(120), value: z.string().max(1000),
  source: z.string().max(200).optional(), status: z.enum(['measured', 'estimated', 'unavailable']).optional(),
  observedAt: timestamp.optional(), note: z.string().max(2000).optional(),
  explanation: z.string().max(2000).optional(), whyItMatters: z.string().max(2000).optional(),
});
const readingSchema = <Output,>(value: z.ZodType<Output>) => z.object({
  value: value.nullable(), status: z.enum(['measured', 'estimated', 'unavailable']),
  source: z.string().min(1).max(200), note: z.string().max(2000).optional(), observedAt: timestamp.optional(),
}).superRefine((reading, context) => {
  if ((reading.status === 'unavailable') !== (reading.value === null)) context.addIssue({ code: 'custom', message: 'Reading status and value disagree.' });
});
const storageSchema = z.object({ totalBytes: finite.positive(), usedBytes: nonnegative, freeBytes: nonnegative }).superRefine((value, context) => {
  if (value.usedBytes > value.totalBytes || Math.abs(value.usedBytes + value.freeBytes - value.totalBytes) > Math.max(1, value.totalBytes * 1e-6)) context.addIssue({ code: 'custom', message: 'Storage capacities are inconsistent.' });
});
const snapshotSchema = z.object({
  capturedAt: timestamp, platform: z.enum(['web', 'ios', 'android', 'other']),
  device: z.object({ name: z.string().max(200), brand: z.string().max(200).nullable(), manufacturer: z.string().max(200).nullable(), model: z.string().max(200).nullable(), os: z.string().max(200), type: z.string().max(80), isDevice: z.boolean() }),
  processor: z.object({ architecture: z.string().max(400).nullable(), cores: readingSchema(finite.int().positive()) }),
  memory: z.object({ totalBytes: readingSchema(finite.positive()) }),
  storage: readingSchema(storageSchema),
  battery: readingSchema(z.object({ level: finite.min(0).max(1), charging: z.boolean().nullable(), lowPower: z.boolean().nullable() })),
  display: z.object({ width: finite.positive(), height: finite.positive(), scale: finite.positive(), fontScale: finite.positive(), isViewport: z.boolean() }),
  network: z.object({ online: z.boolean().nullable(), transport: z.string().max(100).nullable(), source: z.string().max(200), observedAt: timestamp.optional(), note: z.string().max(2000).optional() }),
  runtime: z.object({ label: z.string().max(500), appVersion: z.string().max(40) }).optional(),
  warnings: z.array(z.string().max(2000)).max(30),
});
const configurationSchema = z.object({ workloadVersion: z.literal(1), durationMs: finite.int().min(1000).max(15000), memoryCapMiB: finite.int().min(0).max(32) });
const benchmarkSchema = z.object({
  kind: z.enum(['compute', 'memory']), status: z.enum(['completed', 'cancelled']),
  startedAt: timestamp, durationMs: nonnegative, requestedDurationMs: finite.int().min(1000).max(15000),
  workMs: nonnegative, configuration: configurationSchema, operations: nonnegative, throughput: nonnegative,
  peakMemoryMiB: nonnegative, checkedMemoryMiB: nonnegative, verifiedSamples: nonnegative, checksum: finite.int().nonnegative(), error: z.string().max(2000).optional(),
}).superRefine((result, context) => {
  if (result.status === 'completed' && result.operations <= 0) context.addIssue({ code: 'custom', message: 'A completed benchmark must contain measured work.' });
  if (result.kind === 'memory' && (result.configuration.memoryCapMiB < 1 || result.peakMemoryMiB > result.configuration.memoryCapMiB)) context.addIssue({ code: 'custom', message: 'Memory benchmark exceeds its configuration.' });
  if (result.workMs > result.durationMs + 1) context.addIssue({ code: 'custom', message: 'Active work cannot exceed elapsed time.' });
});
export const reportSchema = z.object({
  schemaVersion: z.union([z.literal(1), z.literal(2)]).default(1),
  id: z.string().min(1).max(100), kind: z.enum(['compute', 'memory', 'snapshot']),
  title: z.string().max(120), createdAt: timestamp,
  status: z.enum(['completed', 'cancelled']), durationMs: nonnegative,
  platform: z.string().max(40), deviceName: z.string().max(200), summary: z.string().max(2000),
  metrics: z.array(metricSchema).max(60), snapshot: snapshotSchema.optional(),
  runtime: z.string().max(500).optional(), benchmark: benchmarkSchema.optional(),
}).superRefine((report, context) => {
  if (report.kind === 'snapshot' && report.snapshot === undefined) context.addIssue({ code: 'custom', message: 'A snapshot report requires its captured evidence.' });
  if (report.schemaVersion === 2 && (report.kind === 'snapshot') === (report.benchmark !== undefined)) context.addIssue({ code: 'custom', message: 'Benchmark evidence does not match the report type.' });
  if (report.benchmark && (report.benchmark.kind !== report.kind || report.benchmark.status !== report.status)) context.addIssue({ code: 'custom', message: 'Benchmark status or kind disagrees with its report.' });
});
export type DiagnosticReport = z.infer<typeof reportSchema>;
export type ReportMetric = DiagnosticReport['metrics'][number];
export const REPORT_LIMIT = 50;
export const MAX_PERSISTED_BYTES = 2_000_000;
export const REPORTS_KEY = 'veylo:reports:v1';
export const SETTINGS_KEY = 'veylo:settings:v1';

export function parseReports(raw: string | null): DiagnosticReport[] {
  if (raw === null) return [];
  if (raw.length > MAX_PERSISTED_BYTES) throw new Error('The saved report collection is too large.');
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed) || parsed.length > REPORT_LIMIT) throw new Error('The saved report collection is not valid.');
  const reports = parsed.map(item => reportSchema.parse(item));
  if (new Set(reports.map(report => report.id)).size !== reports.length) throw new Error('The saved collection contains duplicate report identifiers.');
  return reports;
}
export function addReport(reports: DiagnosticReport[], report: DiagnosticReport): DiagnosticReport[] {
  return [reportSchema.parse(report), ...reports.filter(item => item.id !== report.id)]
    .sort((a, b) => b.createdAt - a.createdAt).slice(0, REPORT_LIMIT);
}
export function newId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`; // Identifier only, never a security token or device reading.
}
function reportBase(kind: DiagnosticReport['kind'], title: string, snapshot: DeviceSnapshot | null, id = newId()) {
  return {
    schemaVersion: REPORT_FORMAT_VERSION, id, kind, title, createdAt: Date.now(),
    platform: snapshot?.platform ?? 'unknown', deviceName: snapshot?.device.name ?? 'Unknown device',
    ...(snapshot?.runtime ? { runtime: snapshot.runtime.label } : {}), snapshot: snapshot ?? undefined,
  };
}
export function createBenchmarkReport(result: BenchmarkResult, snapshot: DeviceSnapshot | null): DiagnosticReport {
  if (result.status === 'error') throw new Error('A failed check cannot be saved as a result.');
  const id = `bench-${result.kind}-${result.startedAt.toString(36)}-${result.checksum.toString(36)}`;
  return reportSchema.parse({
    ...reportBase(result.kind, result.kind === 'compute' ? 'Compute check' : 'Memory check', snapshot, id),
    createdAt: result.startedAt, status: result.status, durationMs: result.durationMs, benchmark: result,
    summary: result.status === 'cancelled'
      ? 'Stopped early. Partial work is excluded from historical comparisons.'
      : result.kind === 'compute'
        ? 'Version 1 single-threaded JavaScript integer workload. Throughput includes scheduling time; compare only the same device, runtime and configuration.'
        : 'Version 1 bounded allocation with sampled integrity checks. Throughput is checked MiB per elapsed second, not system RAM capacity or a hardware diagnosis.',
    metrics: benchmarkMetrics(result).map(metric => ({ ...metric, source: 'Veylo benchmark engine v1', status: 'measured' as const, observedAt: result.startedAt + result.durationMs, note: 'App-level measurement; device load, power settings and runtime scheduling affect results.' })),
  });
}
export function createSnapshotReport(snapshot: DeviceSnapshot): DiagnosticReport {
  const insights = deriveInsights(snapshot);
  const rows = snapshotRows(snapshot);
  const available = rows.filter(row => row.status !== 'unavailable').length;
  return reportSchema.parse({
    ...reportBase('snapshot', 'Device snapshot', snapshot), status: 'completed', durationMs: 0,
    summary: `${insights.length} explainable insights from ${available} available readings. ${rows.length - available} readings are explicitly unavailable. No overall health score is calculated.`,
    metrics: rows.map(({ label, value, source, status, observedAt, note, explanation, whyItMatters }) => ({ label, value, source, status, ...(observedAt === undefined ? {} : { observedAt }), ...(note === undefined ? {} : { note }), explanation, whyItMatters })),
  });
}
export function reportExportDocument(reports: DiagnosticReport[]) {
  return { app: APP_NAME, appVersion: APP_VERSION, formatVersion: REPORT_FORMAT_VERSION, exportedAt: new Date().toISOString(), privacy: 'Local export initiated by the user. No copy was uploaded by Veylo.', reports };
}
export function reportsToCSV(reports: DiagnosticReport[]): string {
  const cell = (value: string | number) => {
    let text = String(value);
    if (/^\s*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  };
  const rows: (string | number)[][] = [[
    'report_id', 'format_version', 'created_at', 'kind', 'status', 'device', 'platform', 'runtime', 'duration_ms',
    'workload_version', 'configured_duration_ms', 'memory_cap_mib', 'metric', 'value', 'reading_status', 'source', 'observed_at', 'limitation', 'explanation', 'why_it_matters',
  ]];
  for (const report of reports) for (const metric of report.metrics) rows.push([
    report.id, report.schemaVersion, new Date(report.createdAt).toISOString(), report.kind, report.status, report.deviceName, report.platform,
    report.runtime ?? '', Math.round(report.durationMs), report.benchmark?.configuration.workloadVersion ?? '',
    report.benchmark?.configuration.durationMs ?? '', report.benchmark?.configuration.memoryCapMiB ?? '',
    metric.label, metric.value, metric.status ?? '', metric.source ?? '',
    metric.observedAt === undefined ? '' : new Date(metric.observedAt).toISOString(), metric.note ?? '', metric.explanation ?? '', metric.whyItMatters ?? '',
  ]);
  return rows.map(row => row.map(cell).join(',')).join('\r\n');
}
export interface KeyValueStore { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void>; removeItem(key: string): Promise<void> }
/** Serialize this runtime's read-modify-write operations; never replace corrupt data on load. */
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
      const raw = JSON.stringify(next);
      if (raw.length > MAX_PERSISTED_BYTES) throw new Error('The report collection exceeds the local storage safety limit.');
      await storage.setItem(REPORTS_KEY, raw);
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
