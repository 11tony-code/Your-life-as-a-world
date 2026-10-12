import http from 'node:http';

export const APP_ID = 'echo-atlas';

export function candidatePorts(value = 4173, count = 20) {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error('PORT 必须是 0 到 65535 之间的整数。');
  }
  if (port === 0) return [0];
  return Array.from({ length: Math.min(count, 65536 - port) }, (_, i) => port + i);
}

export function isWorldRunning(port, timeoutMs = 400) {
  if (port === 0) return Promise.resolve(false);
  return new Promise(resolve => {
    let settled = false;
    const finish = value => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      request.destroy();
      resolve(value);
    };
    const request = http.get({ hostname: '127.0.0.1', port, path: '/api/health' }, response => {
      if (response.statusCode !== 200) return finish(false);
      let size = 0;
      const chunks = [];
      response.on('data', chunk => {
        size += chunk.length;
        if (size > 4096) return finish(false);
        chunks.push(chunk);
      });
      response.on('error', () => finish(false));
      response.on('end', () => {
        try { finish(JSON.parse(Buffer.concat(chunks).toString('utf8')).app === APP_ID); }
        catch { finish(false); }
      });
    });
    const timer = setTimeout(() => finish(false), timeoutMs);
    request.on('error', () => finish(false));
  });
}

export async function findRunningWorld(ports) {
  const running = await Promise.all(ports.map(port => isWorldRunning(port)));
  const index = running.indexOf(true);
  return index < 0 ? null : ports[index];
}

function listenOnce(server, port) {
  return new Promise((resolve, reject) => {
    const onError = error => {
      server.off('listening', onListening);
      reject(error);
    };
    const onListening = () => {
      server.off('error', onError);
      resolve(server.address().port);
    };
    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(port, '127.0.0.1');
  });
}

export async function startWorldServer(server, preferredPort = 4173, attempts = 20) {
  const ports = candidatePorts(preferredPort, attempts);
  const runningPort = await findRunningWorld(ports);
  if (runningPort !== null) {
    return { port: runningPort, url: `http://127.0.0.1:${runningPort}`, reused: true };
  }
  for (const port of ports) {
    try {
      const actualPort = await listenOnce(server, port);
      return { port: actualPort, url: `http://127.0.0.1:${actualPort}`, reused: false };
    } catch (error) {
      if (!['EADDRINUSE', 'EACCES'].includes(error.code)) throw error;
      // A second launcher may have started the same app after the initial check.
      if (await isWorldRunning(port)) {
        return { port, url: `http://127.0.0.1:${port}`, reused: true };
      }
    }
  }
  throw new Error(`本地端口 ${ports[0]}–${ports.at(-1)} 均不可用，请稍后重试或设置 PORT。`);
}
