import test from 'node:test';
import assert from 'node:assert/strict';
import { addReport, createBenchmarkReport, createReportStore, createSnapshotReport, parseReports, REPORT_LIMIT, REPORTS_KEY, reportsToCSV, type DiagnosticReport, type KeyValueStore } from '../lib/reports';
import { DEFAULT_PREFERENCES, parsePreferences } from '../lib/preferences';
import { snapshot } from './fixtures';

const report = () => createSnapshotReport(snapshot());
test('snapshots round-trip with sources and unavailable readings intact', () => {
  const saved = report(); const parsed = parseReports(JSON.stringify([saved]));
  assert.deepEqual(parsed, [saved]); assert.equal(parsed[0].snapshot?.battery.value, null);
});
test('malformed storage is rejected rather than silently replaced', () => {
  assert.deepEqual(parseReports(null), []);
  for (const raw of ['not json', '{}', '[{}]', JSON.stringify(Array(51).fill({}))]) assert.throws(() => parseReports(raw));
});
test('report IDs are idempotent and retention is bounded', () => {
  let reports: DiagnosticReport[] = [];
  for (let i = 0; i < REPORT_LIMIT + 5; i++) reports = addReport(reports, report());
  assert.equal(reports.length, REPORT_LIMIT);
  const first = reports[0]; reports = addReport(reports, first);
  assert.equal(reports.length, REPORT_LIMIT); assert.equal(reports[0].id, first.id);
});
test('cancelled checks stay partial and failed checks cannot be saved', async () => {
  const controller = new AbortController(); controller.abort();
  const { runBenchmark } = await import('../lib/benchmarks');
  const cancelled = await runBenchmark('compute', { durationMs: 1000 }, () => {}, controller.signal);
  assert.equal(createBenchmarkReport(cancelled, snapshot()).status, 'cancelled');
  const failed = await runBenchmark('compute', { durationMs: 0 }, () => {}, controller.signal);
  assert.throws(() => createBenchmarkReport(failed, null));
});
test('CSV escapes quotes and neutralizes spreadsheet formulas', () => {
  const saved = report(); saved.metrics = [{ label: '=HYPERLINK("bad")', value: 'a,"b"\nnext' }];
  const csv = reportsToCSV([saved]); assert.match(csv, /"'=HYPERLINK/); assert.match(csv, /"a,""b""\nnext"/);
});
test('concurrent writes are serialized and failed writes do not change stored data', async () => {
  const data = new Map<string, string>(); let fail = false;
  const adapter: KeyValueStore = { getItem: async key => data.get(key) ?? null, setItem: async (key, value) => { if (fail) throw new Error('quota'); data.set(key, value); }, removeItem: async key => { data.delete(key); } };
  const store = createReportStore(adapter);
  const reports = Array.from({ length: 8 }, report);
  await Promise.all(reports.map(store.save)); assert.equal((await store.load()).length, 8);
  const before = data.get(REPORTS_KEY); fail = true;
  await assert.rejects(store.save(report())); assert.equal(data.get(REPORTS_KEY), before);
  fail = false; const id = (await store.load())[0].id;
  assert.equal((await store.remove(id)).length, 7); assert.deepEqual(await store.clear(), []); assert.equal(data.has(REPORTS_KEY), false);
});
test('preferences validate types and supported sampling intervals', () => {
  assert.deepEqual(parsePreferences(null), DEFAULT_PREFERENCES);
  assert.equal(parsePreferences('{"theme":"dark","sampleIntervalMs":5000}').theme, 'dark');
  assert.throws(() => parsePreferences('{"sampleIntervalMs":25}'));
  assert.throws(() => parsePreferences('{"autoSave":"yes"}'));
});

test('snapshot exports retain structured availability, timestamps and explanations', () => {
  const saved = createSnapshotReport(snapshot());
  const metric = saved.metrics.find(row => row.label === 'Battery charge')!;
  assert.equal(metric.status, 'unavailable'); assert.ok(metric.observedAt); assert.ok(metric.explanation); assert.ok(metric.whyItMatters);
  const csv = reportsToCSV([saved]); assert.match(csv, /reading_status/); assert.match(csv, /observed_at/); assert.match(csv, /why_it_matters/);
});
test('semantic corruption and duplicate identifiers are rejected', () => {
  const saved = report();
  const invalid = structuredClone(saved); invalid.snapshot!.battery = { value: { level: 0.5, charging: false, lowPower: null }, status: 'unavailable', source: 'test' };
  assert.throws(() => parseReports(JSON.stringify([invalid])));
  assert.throws(() => parseReports(JSON.stringify([saved, saved])));
  assert.throws(() => parseReports(' '.repeat(2_000_001)));
});
test('CSV neutralizes whitespace-prefixed spreadsheet formulas', () => {
  const saved = report(); saved.metrics = [{ label: '  =HYPERLINK("bad")', value: '\t@SUM(1)' }];
  const csv = reportsToCSV([saved]); assert.match(csv, /"'  =HYPERLINK/);
});
test('re-saving the same benchmark does not create a duplicate history entry', async () => {
  const { runBenchmark } = await import('../lib/benchmarks');
  const result = await runBenchmark('compute', { durationMs: 1000 }, () => {}, new AbortController().signal);
  const first = createBenchmarkReport(result, snapshot()); const second = createBenchmarkReport(result, snapshot());
  assert.equal(first.id, second.id); assert.equal(addReport([first], second).length, 1);
  assert.ok(first.benchmark); assert.equal(first.schemaVersion, 2);
});
