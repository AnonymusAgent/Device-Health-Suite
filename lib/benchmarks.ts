export type BenchmarkKind = 'compute' | 'memory';
export type BenchmarkStatus = 'completed' | 'cancelled' | 'error';
export interface BenchmarkProgress { progress: number; metric: string; value: string }
export interface BenchmarkConfiguration {
  workloadVersion: 1;
  durationMs: number;
  memoryCapMiB: number;
}
export interface BenchmarkResult {
  kind: BenchmarkKind;
  status: BenchmarkStatus;
  startedAt: number;
  durationMs: number;
  requestedDurationMs: number;
  workMs: number;
  configuration: BenchmarkConfiguration;
  operations: number;
  throughput: number;
  peakMemoryMiB: number;
  checkedMemoryMiB: number;
  verifiedSamples: number;
  checksum: number;
  error?: string;
}
export const BENCHMARK_LIMITS = { minDurationMs: 1000, maxDurationMs: 15000, maxMemoryMiB: 32, defaultMemoryMiB: 16 } as const;
const clock = () => typeof performance !== 'undefined' ? performance.now() : Date.now();

/** Cancellation interrupts the yield as well as the work loop; no listener survives. */
function yieldToUI(signal: AbortSignal): Promise<void> {
  return new Promise(resolve => {
    if (signal.aborted) { resolve(); return; }
    const finish = () => { clearTimeout(timer); signal.removeEventListener('abort', finish); resolve(); };
    const timer = setTimeout(finish, 0);
    signal.addEventListener('abort', finish, { once: true });
  });
}

let activeRun = false;
export const isBenchmarkRunning = () => activeRun;

/** Version 1: deterministic integer mixing / 1 MiB chunks with sampled integrity checks.
 * Throughput includes scheduling time. This is an app-runtime check, not a hardware score.
 */
export async function runBenchmark(
  kind: BenchmarkKind,
  options: { durationMs: number; maxMemoryMiB?: number },
  onProgress: (progress: BenchmarkProgress) => void,
  signal: AbortSignal,
): Promise<BenchmarkResult> {
  const startedAt = Date.now();
  const start = clock();
  const requestedDurationMs = options.durationMs;
  const requestedCap = options.maxMemoryMiB ?? BENCHMARK_LIMITS.defaultMemoryMiB;
  const configuration: BenchmarkConfiguration = {
    workloadVersion: 1,
    durationMs: Number.isFinite(requestedDurationMs) ? requestedDurationMs : 0,
    memoryCapMiB: kind === 'memory' && Number.isFinite(requestedCap) ? Math.max(1, Math.min(BENCHMARK_LIMITS.maxMemoryMiB, Math.floor(requestedCap))) : 0,
  };
  let operations = 0;
  let checksum = 0x811c9dc5;
  let peakMemoryMiB = 0;
  let checkedMemoryMiB = 0;
  let verifiedSamples = 0;
  let workMs = 0;
  let status: BenchmarkStatus = signal.aborted ? 'cancelled' : 'completed';
  let error: string | undefined;
  const chunks: Uint32Array[] = [];
  const chunkWords = 256 * 1024;
  const maxChunks = configuration.memoryCapMiB;

  if (activeRun) { status = 'error'; error = 'Another benchmark is already running. Wait for it to finish or stop it first.'; }
  else if (kind !== 'compute' && kind !== 'memory') { status = 'error'; error = 'Choose a compute or memory check.'; }
  else if (!Number.isInteger(requestedDurationMs) || requestedDurationMs < BENCHMARK_LIMITS.minDurationMs || requestedDurationMs > BENCHMARK_LIMITS.maxDurationMs) { status = 'error'; error = 'Choose a whole-number duration between 1 and 15 seconds.'; }
  else if (kind === 'memory' && (!Number.isInteger(requestedCap) || requestedCap < 1)) { status = 'error'; error = 'The memory working-set cap must be a positive whole number of MiB.'; }

  const ownsRun = status !== 'error';
  if (ownsRun) activeRun = true;
  try {
    if (status === 'error') throw new Error(error);
    let lastYield = start;
    let sliceStart = start;
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
          if (chunk[i] !== ((seed + i) >>> 0)) throw new Error('A sampled memory integrity check did not match. This is not a hardware diagnosis.');
          checksum = Math.imul(checksum ^ chunk[i], 0x01000193);
          verifiedSamples++;
        }
        // Replace a ring slot instead of shifting the array; the old buffer becomes collectible.
        chunks[operations % maxChunks] = chunk;
        operations++;
        checkedMemoryMiB++;
        peakMemoryMiB = Math.max(peakMemoryMiB, Math.min(operations, maxChunks));
      }
      const now = clock();
      if (now - lastUpdate >= 100) {
        const throughput = operations / Math.max((now - start) / 1000, 0.001);
        onProgress({
          progress: Math.min((now - start) / requestedDurationMs, 1),
          metric: kind === 'compute' ? 'Operations / second' : 'Memory checked',
          value: kind === 'compute' ? Math.round(throughput).toLocaleString() : `${checkedMemoryMiB} MiB`,
        });
        lastUpdate = now;
      }
      if (now - lastYield >= (kind === 'memory' ? 8 : 6) || signal.aborted) {
        workMs += now - sliceStart;
        await yieldToUI(signal);
        lastYield = clock(); sliceStart = lastYield;
      }
    }
    workMs += clock() - sliceStart;
    if (signal.aborted) status = 'cancelled';
  } catch (cause) {
    status = signal.aborted ? 'cancelled' : 'error';
    error = cause instanceof Error ? cause.message : 'The check could not finish. Please try again.';
  } finally {
    chunks.length = 0;
    if (ownsRun) activeRun = false;
  }
  const durationMs = Math.max(0, clock() - start);
  const throughput = durationMs > 0 && operations > 0 ? operations / (durationMs / 1000) : 0;
  if (status === 'completed') onProgress({ progress: 1, metric: 'Check complete', value: kind === 'compute' ? `${Math.round(throughput).toLocaleString()} ops/s` : `${checkedMemoryMiB} MiB checked` });
  return {
    kind, status, startedAt, durationMs, requestedDurationMs, workMs: Math.max(0, Math.min(durationMs, workMs)), configuration,
    operations, throughput, peakMemoryMiB, checkedMemoryMiB, verifiedSamples, checksum: checksum >>> 0,
    ...(error === undefined ? {} : { error }),
  };
}

export function benchmarkMetrics(result: BenchmarkResult): { label: string; value: string }[] {
  const rows = [
    { label: 'Elapsed time', value: `${(result.durationMs / 1000).toFixed(2)} s` },
    { label: 'Active workload time', value: `${(result.workMs / 1000).toFixed(2)} s` },
    { label: 'Configured duration', value: `${(result.configuration.durationMs / 1000).toFixed(0)} s` },
    { label: 'Workload version', value: String(result.configuration.workloadVersion) },
    { label: result.status === 'completed' ? 'Work completed' : 'Partial work (not a result)', value: result.kind === 'compute' ? `${result.operations.toLocaleString()} operations` : `${result.checkedMemoryMiB} MiB` },
  ];
  if (result.kind === 'memory') rows.push({ label: 'Retained working-set cap', value: `${result.configuration.memoryCapMiB} MiB` });
  if (result.status === 'completed') rows.push(
    { label: 'Throughput (elapsed time)', value: result.kind === 'compute' ? `${Math.round(result.throughput).toLocaleString()} ops/s` : `${(result.checkedMemoryMiB / (result.durationMs / 1000)).toFixed(1)} MiB/s` },
    ...(result.kind === 'memory'
      ? [{ label: 'Peak retained working set', value: `${result.peakMemoryMiB} MiB` }, { label: 'Integrity', value: 'All sampled writes verified' }]
      : [{ label: 'Workload checksum', value: String(result.checksum) }]),
  );
  return rows;
}
