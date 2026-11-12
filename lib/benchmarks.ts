export type BenchmarkKind = 'compute' | 'memory';
export type BenchmarkStatus = 'completed' | 'cancelled' | 'error';
export interface BenchmarkProgress { progress: number; metric: string; value: string }
export interface BenchmarkResult {
  kind: BenchmarkKind;
  status: BenchmarkStatus;
  startedAt: number;
  durationMs: number;
  requestedDurationMs: number;
  operations: number;
  throughput: number;
  peakMemoryMiB: number;
  checkedMemoryMiB: number;
  checksum: number;
  error?: string;
}
export const BENCHMARK_LIMITS = { minDurationMs: 1000, maxDurationMs: 15000, maxMemoryMiB: 32 } as const;
const clock = () => typeof performance !== 'undefined' ? performance.now() : Date.now();
const yieldToUI = () => new Promise<void>(resolve => setTimeout(resolve, 0));

/** A cooperative JS integer workload, not a native multi-core or thermal test. */
export async function runBenchmark(
  kind: BenchmarkKind,
  options: { durationMs: number; maxMemoryMiB?: number },
  onProgress: (progress: BenchmarkProgress) => void,
  signal: AbortSignal,
): Promise<BenchmarkResult> {
  const requestedDurationMs = options.durationMs;
  const startedAt = Date.now();
  const start = clock();
  let operations = 0;
  let checksum = 0x811c9dc5;
  let peakMemoryMiB = 0;
  let checkedMemoryMiB = 0;
  let status: BenchmarkStatus = signal.aborted ? 'cancelled' : 'completed';
  let error: string | undefined;
  const chunks: Uint32Array[] = [];
  const chunkWords = 256 * 1024; // exactly 1 MiB, including the typed-array buffer.
  const maxChunks = Math.max(1, Math.min(BENCHMARK_LIMITS.maxMemoryMiB, Math.floor(options.maxMemoryMiB ?? 16)));
  if (!Number.isFinite(requestedDurationMs) || requestedDurationMs < BENCHMARK_LIMITS.minDurationMs || requestedDurationMs > BENCHMARK_LIMITS.maxDurationMs) {
    status = 'error'; error = 'Choose a duration between 1 and 15 seconds.';
  }
  try {
    if (status === 'error') throw new Error(error);
    let lastYield = start;
    let lastUpdate = start;
    while (!signal.aborted && clock() - start < requestedDurationMs) {
      if (kind === 'compute') {
        for (let i = 0; i < 128; i++) {
          checksum ^= operations + i;
          checksum = Math.imul(checksum, 0x01000193);
          checksum ^= checksum >>> 13;
          operations++;
        }
      } else {
        const chunk = new Uint32Array(chunkWords);
        const seed = operations + 1;
        for (let i = 0; i < chunkWords; i += 1024) chunk[i] = (seed + i) >>> 0;
        for (let i = 0; i < chunkWords; i += 1024) {
          if (chunk[i] !== ((seed + i) >>> 0)) throw new Error('A memory integrity check did not match.');
          checksum = Math.imul(checksum ^ chunk[i], 0x01000193);
        }
        chunks.push(chunk);
        operations++;
        checkedMemoryMiB++;
        if (chunks.length > maxChunks) chunks.shift();
        peakMemoryMiB = chunks.length;
      }
      const now = clock();
      if (now - lastUpdate >= 100) {
        const throughput = operations / Math.max((now - start) / 1000, 0.001);
        onProgress({ progress: Math.min((now - start) / requestedDurationMs, 1), metric: kind === 'compute' ? 'Operations / second' : 'Memory checked',
          value: kind === 'compute' ? Math.round(throughput).toLocaleString() : `${checkedMemoryMiB} MiB` });
        lastUpdate = now;
      }
      // Bound synchronous work and retained memory; give cancellation and rendering a chance.
      if (now - lastYield >= (kind === 'memory' ? 8 : 6) || signal.aborted) {
        await yieldToUI();
        lastYield = clock();
      }
    }
    if (signal.aborted) status = 'cancelled';
  } catch (cause) {
    status = 'error';
    error = cause instanceof Error ? cause.message : 'The check could not finish. Please try again.';
  } finally {
    chunks.length = 0; // Release every retained buffer on completion, cancellation, and error.
  }
  const durationMs = Math.max(0, clock() - start);
  const throughput = durationMs > 0 ? operations / (durationMs / 1000) : 0;
  if (status === 'completed') onProgress({ progress: 1, metric: 'Check complete', value: kind === 'compute' ? `${Math.round(throughput).toLocaleString()} ops/s` : `${checkedMemoryMiB} MiB checked` });
  return { kind, status, startedAt, durationMs, requestedDurationMs, operations, throughput, peakMemoryMiB, checkedMemoryMiB, checksum: checksum >>> 0, error };
}

export function benchmarkMetrics(result: BenchmarkResult): { label: string; value: string }[] {
  const rows = [
    { label: 'Elapsed time', value: `${(result.durationMs / 1000).toFixed(2)} s` },
    { label: result.status === 'completed' ? 'Work completed' : 'Partial work (not a result)', value: result.kind === 'compute' ? `${result.operations.toLocaleString()} operations` : `${result.checkedMemoryMiB} MiB` },
  ];
  if (result.status === 'completed') rows.push(
    { label: 'Throughput', value: result.kind === 'compute' ? `${Math.round(result.throughput).toLocaleString()} ops/s` : `${(result.checkedMemoryMiB / (result.durationMs / 1000)).toFixed(1)} MiB/s` },
    ...(result.kind === 'memory' ? [{ label: 'Peak retained working set', value: `${result.peakMemoryMiB} MiB` }, { label: 'Integrity', value: 'All sampled writes verified' }] : [{ label: 'Workload checksum', value: String(result.checksum) }]),
  );
  return rows;
}
