import test from 'node:test';
import assert from 'node:assert/strict';
import { chartPoints, chartSegments, selectSamples, sessionCSV, sessionStatistics } from '../lib/session';
import type { SessionSample } from '../contexts/SessionContext';

const sample = (timestamp: number, frameRate: number | null, batteryLevel: number | null = null, batteryObservedAt: number | null = null): SessionSample => ({ timestamp, frameRate, batteryLevel, batteryObservedAt, frameIntervalMs: 2000, duringBenchmark: false });
test('session statistics use only actual observations in the selected window', () => {
  const samples = [sample(1000, 50), sample(3000, 60), sample(5000, null), sample(65000, 70)];
  const stats = sessionStatistics(samples, 'frameRate', 10000, 65000);
  assert.equal(stats.count, 1); assert.equal(stats.latest, 70); assert.equal(stats.average, 70);
  assert.equal(sessionStatistics([], 'batteryLevel', 10000, 10000).average, null);
});
test('battery charts use response timestamps rather than request timestamps', () => {
  const samples = [sample(1000, 60, 80, 4000), sample(3000, 60)];
  assert.deepEqual(chartPoints(samples, 'batteryLevel', 10000, 5000), [{ x: 4000, y: 80 }]);
  assert.equal(selectSamples(samples, 'batteryLevel', 1000, 5000).length, 1);
});
test('pauses produce separate chart segments based on the sampling interval', () => {
  const points = [{ x: 0, y: 1 }, { x: 5000, y: 2 }, { x: 20000, y: 3 }, { x: 25000, y: 4 }];
  assert.deepEqual(chartSegments(points, 10000).map(segment => segment.length), [2, 2]);
  assert.deepEqual(chartSegments([], 10000), []);
});
test('CSV leaves missing readings blank and records benchmark interference', () => {
  const csv = sessionCSV([{ ...sample(1000, null, 50, 2000), duringBenchmark: true }]);
  assert.match(csv, /frame_observed_at,frame_interval_ms,app_js_frame_rate_fps,battery_percent,battery_observed_at,during_benchmark/);
  assert.match(csv, /,2000.00,,50.000,1970-01-01T00:00:02.000Z,true/);
});
