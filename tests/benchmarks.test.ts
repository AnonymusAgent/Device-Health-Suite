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
  assert.match(benchmarkMetrics(result).map(row => row.value).join(' '), /sampled writes verified/);
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

test('invalid memory caps are errors, never an unbounded allocation', async () => {
  for (const maxMemoryMiB of [NaN, Infinity, 0, -1, 1.5]) {
    const result = await runBenchmark('memory', { durationMs: 1000, maxMemoryMiB }, () => {}, new AbortController().signal);
    assert.equal(result.status, 'error'); assert.equal(result.operations, 0); assert.equal(result.peakMemoryMiB, 0);
  }
});
test('the engine rejects overlapping runs across callers', async () => {
  const controller = new AbortController();
  const first = runBenchmark('compute', { durationMs: 1000 }, () => {}, controller.signal);
  const second = await runBenchmark('compute', { durationMs: 1000 }, () => {}, new AbortController().signal);
  assert.equal(second.status, 'error'); assert.match(second.error!, /already running/); assert.equal(second.operations, 0);
  controller.abort(); assert.equal((await first).status, 'cancelled');
  const next = await runBenchmark('compute', { durationMs: 1000 }, () => {}, new AbortController().signal);
  assert.equal(next.status, 'completed');
});
test('configuration and actual work time travel with completed results', async () => {
  const result = await runBenchmark('memory', { durationMs: 1000, maxMemoryMiB: 2 }, () => {}, new AbortController().signal);
  assert.deepEqual(result.configuration, { workloadVersion: 1, durationMs: 1000, memoryCapMiB: 2 });
  assert.ok(result.workMs > 0); assert.ok(result.workMs <= result.durationMs); assert.ok(result.verifiedSamples > 0);
  assert.equal(result.peakMemoryMiB, 2);
});
