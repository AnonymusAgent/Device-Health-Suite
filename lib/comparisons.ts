import type { DiagnosticReport } from './reports';

export interface BenchmarkComparison {
  current: number;
  previous: number;
  difference: number;
  percentDifference: number | null;
  unit: string;
  previousAt: number;
  configuration: string;
}
export function comparisonKey(report: DiagnosticReport): string | null {
  const result = report.benchmark;
  if (!result || report.status !== 'completed' || report.kind === 'snapshot' || !report.runtime || !report.snapshot) return null;
  const { workloadVersion, durationMs, memoryCapMiB } = result.configuration;
  return [report.kind, report.platform, report.deviceName, report.snapshot.device.os, report.runtime, workloadVersion, durationMs, memoryCapMiB].join('|');
}
export function comparableReports(report: DiagnosticReport, reports: DiagnosticReport[]): DiagnosticReport[] {
  const key = comparisonKey(report);
  if (!key) return [];
  return reports.filter(candidate => candidate.id !== report.id && candidate.createdAt < report.createdAt && comparisonKey(candidate) === key)
    .sort((a, b) => b.createdAt - a.createdAt);
}
export function throughputOf(report: DiagnosticReport): number | null {
  const result = report.benchmark;
  if (!result || report.status !== 'completed' || result.durationMs <= 0 || result.operations <= 0) return null;
  return result.kind === 'compute' ? result.throughput : result.checkedMemoryMiB / (result.durationMs / 1000);
}
export function compareBenchmarks(current: DiagnosticReport, previous: DiagnosticReport): { comparison: BenchmarkComparison | null; reason: string } {
  const key = comparisonKey(current);
  if (!key || comparisonKey(previous) !== key) return { comparison: null, reason: 'Only completed runs with the same device, OS, runtime, workload version, duration and memory cap can be compared. Legacy reports lack this configuration.' };
  if (current.id === previous.id || previous.createdAt >= current.createdAt) return { comparison: null, reason: 'Choose a different, earlier run as the comparison baseline.' };
  const now = throughputOf(current);
  const before = throughputOf(previous);
  if (now === null || before === null) return { comparison: null, reason: 'Both runs need positive measured work and elapsed time.' };
  const config = current.benchmark!.configuration;
  return {
    comparison: {
      current: now, previous: before, difference: now - before,
      percentDifference: before > 0 ? (now - before) / before * 100 : null,
      unit: current.kind === 'compute' ? 'ops/s' : 'MiB/s', previousAt: previous.createdAt,
      configuration: `v${config.workloadVersion} · ${config.durationMs / 1000}s${current.kind === 'memory' ? ` · ${config.memoryCapMiB} MiB cap` : ''}`,
    },
    reason: 'Like-for-like configuration matched. Background load, power settings, thermal conditions and runtime scheduling can still change throughput. This is not a hardware-health score.',
  };
}
export function formatThroughput(value: number, unit: string): string {
  return `${unit === 'ops/s' ? Math.round(value).toLocaleString() : value.toFixed(1)} ${unit}`;
}
