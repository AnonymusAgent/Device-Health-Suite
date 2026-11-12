import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeBattery, storageFromCapacity, supportsLowPowerMode, validBatteryLevel, validStorage } from '../lib/capabilities';
import { readBrowserBattery, readBrowserStorage, type BrowserNavigator } from '../lib/browser-capabilities';
import { withTimeout } from '../lib/async';

const nav = (extra: Partial<BrowserNavigator>): BrowserNavigator => ({ userAgent: 'Test browser', ...extra });
test('capability validation rejects missing, nonfinite and out-of-range readings', () => {
  for (const value of [undefined, null, NaN, Infinity, -0.1, 1.1, '0.5']) assert.equal(validBatteryLevel(value), false);
  assert.equal(validBatteryLevel(0), true); assert.equal(validBatteryLevel(1), true);
  assert.equal(validStorage(100, 20), true);
  for (const [total, free] of [[0, 0], [100, -1], [100, 101], [NaN, 0], [100, Infinity]]) assert.equal(validStorage(total, free), false);
  assert.deepEqual(storageFromCapacity(100, 20), { totalBytes: 100, freeBytes: 20, usedBytes: 80 });
  assert.throws(() => storageFromCapacity(0, 0));
});
test('unsupported low-power mode never becomes a measured off state', () => {
  assert.equal(supportsLowPowerMode('web', '120'), false);
  assert.equal(supportsLowPowerMode('android', '19'), false);
  assert.equal(supportsLowPowerMode('android', undefined), false);
  assert.equal(supportsLowPowerMode('android', '21'), true);
  assert.equal(supportsLowPowerMode('ios', '18.0'), true);
  assert.equal(normalizeBattery(0.5, false, null)?.lowPower, null);
  assert.equal(normalizeBattery(-1, false, false), null);
});
test('missing browser APIs return unavailable without substitute readings', async () => {
  const battery = await readBrowserBattery(nav({}));
  const storage = await readBrowserStorage(nav({}));
  assert.equal(battery.status, 'unavailable'); assert.equal(battery.value, null);
  assert.equal(storage.status, 'unavailable'); assert.equal(storage.value, null);
});
test('browser permission denial and invalid responses remain unavailable', async () => {
  assert.equal((await readBrowserBattery(nav({ getBattery: async () => { throw new Error('denied'); } }))).value, null);
  assert.equal((await readBrowserBattery(nav({ getBattery: async () => ({ level: NaN, charging: true }) }))).value, null);
  assert.equal((await readBrowserStorage(nav({ storage: { estimate: async () => { throw new Error('restricted'); } } }))).value, null);
  assert.equal((await readBrowserStorage(nav({ storage: { estimate: async () => ({ quota: 10, usage: 20 }) } }))).value, null);
});
test('supported browser responses retain their source, status and actual observation time', async () => {
  const before = Date.now();
  const battery = await readBrowserBattery(nav({ getBattery: async () => ({ level: 0.42, charging: false }) }));
  const storage = await readBrowserStorage(nav({ storage: { estimate: async () => ({ quota: 1000, usage: 250 }) } }));
  assert.equal(battery.status, 'measured'); assert.equal(battery.value?.level, 0.42); assert.equal(battery.value?.lowPower, null);
  assert.ok(battery.observedAt! >= before); assert.match(battery.note!, /not battery condition/);
  assert.equal(storage.status, 'estimated'); assert.equal(storage.value?.freeBytes, 750); assert.match(storage.note!, /not physical disk/);
});
test('platform timeouts reject without leaving a pending timer', async () => {
  await assert.rejects(withTimeout(new Promise(() => {}), 15, 'timed out'), /timed out/);
  assert.equal(await withTimeout(Promise.resolve('actual'), 100), 'actual');
  await assert.rejects(withTimeout(Promise.reject(new Error('denied')), 100), /denied/);
});
