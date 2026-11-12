import test from 'node:test';
import assert from 'node:assert/strict';
import { runBenchmark } from '../lib/benchmarks';
import { createBenchmarkReport, parseReports, type DiagnosticReport } from '../lib/reports';
import { comparableReports, compareBenchmarks } from '../lib/comparisons';
import { snapshot } from './fixtures';

const context = () => snapshot({ runtime: { label: 'Expo test runtime · Veylo 1.0.0', appVersion: '1.0.0' } });
async function completed() {
  const result = await runBenchmark('compute', { durationMs: 1000 }, () => {}, new AbortController().signal);
  const report = createBenchmarkReport(result, context());
  return report;
}
test('historical comparisons match configuration and report raw throughput differences', async () => {
  const previous = await completed();
  const current = { ...previous, id: 'later', createdAt: previous.createdAt + 1000, benchmark: { ...previous.benchmark!, throughput: previous.benchmark!.throughput * 1.1 } };
  const { comparison, reason } = compareBenchmarks(current, previous);
  assert.ok(comparison); assert.ok(Math.abs(comparison.percentDifference! - 10) < 1e-8);
  assert.equal(comparison.unit, 'ops/s'); assert.match(reason, /not a hardware-health score/);
  assert.deepEqual(comparableReports(current, [previous, current]), [previous]);
});
test('different duration, cap, runtime, device or partial status cannot be compared', async () => {
  const previous = await completed();
  const current = { ...previous, id: 'later', createdAt: previous.createdAt + 1000 };
  const variations: DiagnosticReport[] = [
    { ...previous, deviceName: 'Another device' },
    { ...previous, runtime: 'A different runtime' },
    { ...previous, status: 'cancelled', benchmark: { ...previous.benchmark!, status: 'cancelled' } },
    { ...previous, benchmark: { ...previous.benchmark!, configuration: { ...previous.benchmark!.configuration, durationMs: 5000 } } },
    { ...previous, benchmark: { ...previous.benchmark!, configuration: { ...previous.benchmark!.configuration, memoryCapMiB: 8 } } },
  ];
  for (const variant of variations) assert.equal(compareBenchmarks(current, variant).comparison, null);
  assert.equal(compareBenchmarks(current, current).comparison, null);
});
test('legacy reports remain readable but are excluded from configuration-aware comparisons', async () => {
  const current = await completed();
  const legacy: unknown = { ...current, schemaVersion: 1, benchmark: undefined, runtime: undefined };
  const [parsed] = parseReports(JSON.stringify([legacy]));
  assert.equal(parsed.schemaVersion, 1); assert.equal(parsed.benchmark, undefined);
  assert.equal(compareBenchmarks(current, parsed).comparison, null);
  assert.match(compareBenchmarks(current, parsed).reason, /Legacy reports/);
});
