import test from 'node:test';
import assert from 'node:assert/strict';
import { BENCHMARK_LIMITS, benchmarkMetrics, runBenchmark } from '../lib/benchmarks';

test('compute reports real finite throughput without a fabricated score', async () => {
  const result = await runBenchmark('compute', { durationMs: 1000 }, () => {}, new AbortController().signal);
  assert.equal(result.status, 'completed'); assert.ok(result.operations > 0); assert.ok(Number.isFinite(result.throughput)); assert.ok(result.durationMs >= 1000);
  assert.equal(result.peakMemoryMiB, 0); assert.ok(!('score' in result)); assert.ok(!JSON.stringify(result).includes('temperature'));
});
test('memory respects the retained working-set cap and verifies writes', async () => {
  const result = await runBenchmark('memory', { durationMs: 1000, maxMemoryMiB: 4 }, () => {}, new AbortController().signal);
  assert.equal(result.status, 'completed'); assert.ok(result.checkedMemoryMiB > 4); assert.ok(result.peakMemoryMiB <= 4); assert.equal(result.operations, result.checkedMemoryMiB);
  assert.match(benchmarkMetrics(result).map(row => row.value).join(' '), /All sampled writes verified/);
});
test('pre-aborted checks produce no completed result', async () => {
  const controller = new AbortController(); controller.abort();
  const result = await runBenchmark('compute', { durationMs: 5000 }, () => {}, controller.signal);
  assert.equal(result.status, 'cancelled'); assert.equal(result.operations, 0); assert.equal(result.throughput, 0);
});
test('cancellation is cooperative and retains partial-work status', async () => {
  const controller = new AbortController(); setTimeout(() => controller.abort(), 80);
  const result = await runBenchmark('memory', { durationMs: 5000, maxMemoryMiB: 4 }, () => {}, controller.signal);
  assert.equal(result.status, 'cancelled'); assert.ok(result.durationMs < 1500); assert.ok(result.peakMemoryMiB <= 4);
  assert.match(benchmarkMetrics(result).map(row => row.label).join(' '), /Partial work/);
});
test('invalid durations and excessive memory requests are bounded', async () => {
  const result = await runBenchmark('compute', { durationMs: BENCHMARK_LIMITS.maxDurationMs + 1 }, () => {}, new AbortController().signal);
  assert.equal(result.status, 'error'); assert.equal(result.operations, 0);
  const memory = await runBenchmark('memory', { durationMs: 1000, maxMemoryMiB: 10000 }, () => {}, new AbortController().signal);
  assert.ok(memory.peakMemoryMiB <= BENCHMARK_LIMITS.maxMemoryMiB);
});
