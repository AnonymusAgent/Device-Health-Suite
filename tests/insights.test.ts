import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveInsights, INSIGHT_RULES } from '../lib/insights';
import { measured, unavailable } from '../lib/diagnostics';
import { snapshot } from './fixtures';

test('every insight contains evidence, rationale, source, limitations and an action', () => {
  const insights = deriveInsights(snapshot({ battery: measured({ level: 0.5, charging: false, lowPower: null }, 'Battery API') }));
  assert.equal(insights.length, 3);
  for (const insight of insights) {
    for (const field of ['measured', 'whyItMatters', 'source', 'limitations', 'recommendation'] as const) assert.ok(insight[field].length > 0);
    assert.ok(insight.observedAt !== null);
  }
  assert.ok(!JSON.stringify(insights).includes('score'));
});
test('connectivity is informational, never proof of internet access or device health', () => {
  const [network] = deriveInsights(snapshot({ storage: unavailable('test') }));
  assert.equal(network.id, 'network'); assert.equal(network.status, 'info');
  assert.match(network.limitations, /does not guarantee DNS/);
  const offline = deriveInsights(snapshot({ storage: unavailable('test'), network: { online: false, source: 'test', transport: null } }))[0];
  assert.match(offline.recommendation, /Snapshots and benchmarks still work locally/);
});
test('rule boundaries are deterministic and charging context changes the action', () => {
  const atThreshold = deriveInsights(snapshot({ battery: measured({ level: INSIGHT_RULES.lowBatteryCharge, charging: false, lowPower: null }, 'test') }))[0];
  assert.equal(atThreshold.status, 'good');
  const charging = deriveInsights(snapshot({ battery: measured({ level: 0.1, charging: true, lowPower: null }, 'test') }))[0];
  assert.equal(charging.status, 'info'); assert.match(charging.recommendation, /Leave power connected/);
  const storage = deriveInsights(snapshot({ storage: { value: { totalBytes: 100, usedBytes: 86, freeBytes: 14 }, status: 'estimated', source: 'Storage Manager API' } }))[0];
  assert.equal(storage.status, 'attention'); assert.equal(storage.confidence, 'Estimated'); assert.match(storage.limitations, /physical disk/);
});
test('legacy readings without observation times disclose that limitation', () => {
  const insights = deriveInsights(snapshot({ network: { online: true, transport: null, source: 'test' } }));
  assert.equal(insights.find(insight => insight.id === 'storage')?.confidence, 'Estimated');
  const network = insights.find(insight => insight.id === 'network');
  assert.equal(network?.confidence, 'Time not recorded');
  assert.equal(network?.observedAt, null);
});
