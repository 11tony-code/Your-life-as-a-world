import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { fork, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { APP_ID, candidatePorts, isWorldRunning, startWorldServer } from '../server/runtime.mjs';

const worldHandler = (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ app: APP_ID }));
};
const foreignHandler = (_req, res) => res.end(JSON.stringify({ aiConfigured: false }));

function trackedServer(t, handler) {
  const server = http.createServer(handler);
  t.after(() => new Promise(resolve => {
    server.closeAllConnections();
    server.close(() => resolve());
  }));
  return server;
}

async function fixture(t, handler) {
  const server = trackedServer(t, handler);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { server, port: server.address().port };
}

test('port configuration is bounded and ephemeral ports report their actual address', async t => {
  assert.deepEqual(candidatePorts(65534), [65534, 65535]);
  assert.throws(() => candidatePorts('invalid'), /PORT/);
  assert.throws(() => candidatePorts(-1), /PORT/);
  const server = trackedServer(t, worldHandler);
  const result = await startWorldServer(server, 0);
  assert.ok(result.port > 0);
  assert.equal(result.url, `http://127.0.0.1:${server.address().port}`);
  assert.equal(result.reused, false);
});

test('repeated launch reuses the identified app instead of opening another listener', async t => {
  const existing = await fixture(t, worldHandler);
  const duplicate = trackedServer(t, worldHandler);
  const result = await startWorldServer(duplicate, existing.port);
  assert.equal(result.reused, true);
  assert.equal(result.port, existing.port);
  assert.equal(duplicate.listening, false);
});

test('an unrelated occupied port is left running and the app uses a free port', async t => {
  const foreign = await fixture(t, foreignHandler);
  const server = trackedServer(t, worldHandler);
  const result = await startWorldServer(server, foreign.port);
  assert.notEqual(result.port, foreign.port);
  assert.equal(result.reused, false);
  assert.equal(foreign.server.listening, true);
  assert.equal(await isWorldRunning(foreign.port), false);
  assert.equal(await isWorldRunning(result.port), true);
  const repeat = await startWorldServer(trackedServer(t, worldHandler), foreign.port);
  assert.equal(repeat.port, result.port);
  assert.equal(repeat.reused, true);
});

test('simultaneous launches converge on one running app', async t => {
  const temporary = await fixture(t, foreignHandler);
  const port = temporary.port;
  await new Promise(resolve => temporary.server.close(resolve));
  const a = trackedServer(t, worldHandler);
  const b = trackedServer(t, worldHandler);
  const results = await Promise.all([startWorldServer(a, port), startWorldServer(b, port)]);
  assert.equal(results[0].port, results[1].port);
  assert.equal(results.filter(result => result.reused).length, 1);
  assert.equal(Number(a.listening) + Number(b.listening), 1);
});

test('exhausted ports produce a bounded error without terminating other servers', async t => {
  const foreign = await fixture(t, foreignHandler);
  await assert.rejects(startWorldServer(trackedServer(t, worldHandler), foreign.port, 1), /均不可用/);
  assert.equal(foreign.server.listening, true);
});

test('unresponsive and oversized health responses cannot be mistaken for the app', async t => {
  const hanging = await fixture(t, () => {});
  assert.equal(await isWorldRunning(hanging.port, 50), false);
  const oversized = await fixture(t, (_req, res) => res.end('x'.repeat(5000)));
  assert.equal(await isWorldRunning(oversized.port), false);
});

test('real launcher reopens the running production app and exits successfully', { timeout: 10000 }, async t => {
  if (!existsSync(new URL('../dist/index.html', import.meta.url))) {
    t.skip('Run npm run build to include the production launcher integration test.');
    return;
  }
  const folder = fileURLToPath(new URL('../', import.meta.url));
  const server = fork(fileURLToPath(new URL('../server/index.mjs', import.meta.url)), [], {
    cwd: folder, env: { ...process.env, PORT: '0' }, silent: true,
  });
  t.after(async () => {
    if (server.exitCode !== null || server.signalCode !== null) return;
    const exited = once(server, 'exit');
    server.kill();
    await exited;
  });
  const [ready] = await once(server, 'message');
  assert.equal(ready.type, 'ready');
  assert.ok(ready.port > 0);
  const launcher = spawn(process.execPath, [fileURLToPath(new URL('../scripts/launch.mjs', import.meta.url))], {
    cwd: folder, env: { ...process.env, PORT: String(ready.port), ECHO_ATLAS_NO_BROWSER: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  t.after(() => { if (launcher.exitCode === null && launcher.signalCode === null) launcher.kill(); });
  let output = '';
  let errors = '';
  launcher.stdout.on('data', chunk => { output += chunk; });
  launcher.stderr.on('data', chunk => { errors += chunk; });
  const [code] = await once(launcher, 'close');
  assert.equal(code, 0, errors);
  assert.match(output, /already running/);
  assert.ok(output.includes(ready.url));
  const health = await fetch(`${ready.url}/api/health`);
  assert.equal((await health.json()).app, APP_ID);
  const page = await fetch(ready.url);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /Echo Atlas/);
});
