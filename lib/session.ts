import type { SessionSample } from '@/contexts/SessionContext';

export type SessionMetric = 'frameRate' | 'batteryLevel';
export interface ChartPoint { x: number; y: number }
export function sampleTime(sample: SessionSample, metric: SessionMetric): number {
  return metric === 'batteryLevel' ? sample.batteryObservedAt ?? sample.timestamp : sample.timestamp;
}
export function selectSamples(samples: SessionSample[], metric: SessionMetric, windowMs: number, now: number): SessionSample[] {
  const end = samples.length ? Math.max(now, sampleTime(samples[samples.length - 1], metric)) : now;
  return samples.filter(sample => sample[metric] !== null && sampleTime(sample, metric) >= end - windowMs && sampleTime(sample, metric) <= end);
}
export function sessionStatistics(samples: SessionSample[], metric: SessionMetric, windowMs: number, now: number) {
  const selected = selectSamples(samples, metric, windowMs, now);
  const values = selected.map(sample => sample[metric]).filter((value): value is number => value !== null && Number.isFinite(value));
  return {
    samples: selected, count: values.length,
    latest: values.at(-1) ?? null,
    average: values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null,
    min: values.length ? values.reduce((min, value) => Math.min(min, value), values[0]) : null,
    max: values.length ? values.reduce((max, value) => Math.max(max, value), values[0]) : null,
  };
}
export function chartPoints(samples: SessionSample[], metric: SessionMetric, windowMs: number, now: number): ChartPoint[] {
  return selectSamples(samples, metric, windowMs, now).map(sample => ({ x: sampleTime(sample, metric), y: sample[metric]! }))
    .sort((a, b) => a.x - b.x);
}
/** Break lines across missing observations rather than interpolating a pause. */
export function chartSegments(points: ChartPoint[], maximumGapMs: number): ChartPoint[][] {
  const segments: ChartPoint[][] = [];
  let current: ChartPoint[] = [];
  for (const point of points) {
    if (current.length && point.x - current[current.length - 1].x > maximumGapMs) { segments.push(current); current = []; }
    current.push(point);
  }
  if (current.length) segments.push(current);
  return segments;
}
export function sessionCSV(samples: SessionSample[]): string {
  return 'frame_observed_at,frame_interval_ms,app_js_frame_rate_fps,battery_percent,battery_observed_at,during_benchmark\r\n' + samples.map(sample => [
    new Date(sample.timestamp).toISOString(), sample.frameIntervalMs.toFixed(2), sample.frameRate?.toFixed(3) ?? '',
    sample.batteryLevel?.toFixed(3) ?? '', sample.batteryObservedAt === null ? '' : new Date(sample.batteryObservedAt).toISOString(), sample.duringBenchmark ? 'true' : 'false',
  ].join(',')).join('\r\n');
}
