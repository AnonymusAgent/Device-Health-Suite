import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveChecks, formatBytes, formatPercent, snapshotRows, storageRatio, unavailable, type DeviceSnapshot } from '../lib/diagnostics';

export const snapshot = (overrides: Partial<DeviceSnapshot> = {}): DeviceSnapshot => ({
  capturedAt: 1762905600000, platform: 'web', device: { name: 'Chrome on Windows', brand: null, manufacturer: null, model: null, os: 'Windows', type: 'Browser', isDevice: false },
  processor: { architecture: null, cores: { value: 8, status: 'measured', source: 'test' } },
  memory: { totalBytes: { value: 8 * 1024 ** 3, status: 'estimated', source: 'test', note: 'Coarse hint' } },
  storage: { value: { totalBytes: 1000, usedBytes: 200, freeBytes: 800 }, status: 'estimated', source: 'test' },
  display: { width: 1440, height: 900, scale: 1, fontScale: 1, isViewport: true },
  battery: unavailable('test'), network: { online: true, transport: null, source: 'test' }, warnings: [], ...overrides,
});
test('formatting never turns missing or invalid readings into zero', () => {
  for (const value of [null, undefined, NaN, Infinity, -1]) assert.equal(formatBytes(value), 'Unavailable');
  assert.equal(formatBytes(0), '0 B'); assert.equal(formatBytes(1024), '1 KB'); assert.equal(formatBytes(1024 ** 3), '1 GB');
  assert.equal(formatPercent(null), 'Unavailable'); assert.equal(formatPercent(0.556), '56%'); assert.equal(formatPercent(2), '100%');
});
test('unsupported readings do not create invented health checks', () => {
  assert.deepEqual(deriveChecks(null), []);
  const s = snapshot({ storage: unavailable('test'), network: { online: null, transport: null, source: 'test' } });
  assert.deepEqual(deriveChecks(s), []);
});
test('low charge and low storage are actionable, with browser quota qualified', () => {
  const checks = deriveChecks(snapshot({ battery: { value: { level: 0.15, charging: false, lowPower: true }, status: 'measured', source: 'test' }, storage: { value: { totalBytes: 1000, usedBytes: 950, freeBytes: 50 }, status: 'estimated', source: 'test' } }));
  assert.equal(checks.filter(check => check.status === 'attention').length, 2);
  assert.match(checks.find(check => check.id === 'storage')!.description, /not your physical disk/);
  assert.equal(checks.find(check => check.id === 'power')?.status, 'info');
});
test('snapshot exports preserve sources and explicitly unavailable metrics', () => {
  const rows = snapshotRows(snapshot());
  assert.equal(rows.find(row => row.label === 'Battery charge')?.value, 'Unavailable');
  assert.equal(rows.find(row => row.label === 'Device memory')?.source, 'test');
  assert.equal(rows.find(row => row.label === 'CPU utilization / clock')?.value, 'Not exposed');
  assert.equal(storageRatio({ totalBytes: 0, usedBytes: 0, freeBytes: 0 }), 0);
  assert.equal(storageRatio({ totalBytes: 100, usedBytes: 150, freeBytes: 0 }), 1);
});
