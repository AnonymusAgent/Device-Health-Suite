import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { Server } from 'node:http';
import { createApp } from '../server/app';

async function serve(t: { after: (fn: () => void) => void }, distDir?: string) {
  const server = createApp({ distDir }).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => (server as Server).close());
  return `http://127.0.0.1:${(server.address() as { port: number }).port}`;
}
test('health endpoint is anonymous and does not claim a database connection', async t => {
  const url = await serve(t); const response = await fetch(`${url}/api/health`);
  assert.equal(response.status, 200); assert.deepEqual(await response.json(), { status: 'ok', app: 'Veylo', version: '1.0.0' });
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff'); assert.equal(response.headers.get('x-powered-by'), null);
});
test('unknown API routes and malformed or oversized bodies are handled safely', async t => {
  const url = await serve(t);
  assert.equal((await fetch(`${url}/api/users`)).status, 404);
  assert.equal((await fetch(`${url}/api/health`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{bad' })).status, 400);
  assert.equal((await fetch(`${url}/api/health`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: 'x'.repeat(20000) }) })).status, 413);
});
test('missing builds are explicit and never fall back to a nonexistent template', async t => {
  const url = await serve(t, path.join(tmpdir(), 'veylo-missing-build-for-test'));
  const response = await fetch(url); assert.equal(response.status, 503); assert.match(await response.text(), /web:build/);
});
test('real static files, SPA fallback, and proxy-host requests work', async t => {
  const dir = await mkdtemp(path.join(tmpdir(), 'veylo-test-')); t.after(() => { void rm(dir, { recursive: true, force: true }); });
  await mkdir(path.join(dir, '_expo')); await writeFile(path.join(dir, 'index.html'), '<html><body>Veylo</body></html>'); await writeFile(path.join(dir, '_expo', 'app.js'), 'console.log("ok")');
  const url = await serve(t, dir);
  const response = await fetch(`${url}/reports/example`, { headers: { Host: '5000-preview.example.test' } });
  assert.equal(response.status, 200); assert.match(await response.text(), /Veylo/); assert.equal(response.headers.get('cache-control'), 'no-cache');
  assert.equal((await fetch(`${url}/_expo/app.js`)).status, 200);
  assert.equal((await fetch(`${url}/_expo/missing.js`)).status, 404);
  assert.equal((await fetch(`${url}/missing.png`)).status, 404);
});
