import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('Windows launcher uses ASCII and CRLF so cmd can parse every command', async () => {
  const bytes = await readFile(new URL('../启动应用.cmd', import.meta.url));
  assert.ok(bytes.every(byte => byte < 128), 'Keep localized messages outside the cmd script.');
  const text = bytes.toString('ascii');
  assert.ok(text.endsWith('\r\n'), 'The Windows launcher must end with CRLF.');
  assert.ok(!/(?<!\r)\n|\r(?!\n)/.test(text), 'Use CRLF throughout the Windows launcher.');
});
