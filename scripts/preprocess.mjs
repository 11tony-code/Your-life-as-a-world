import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { parsePlaylist, buildWorld } from '../src/data/engine.js';
const parsed = parsePlaylist(await readFile(new URL('../playlist.csv', import.meta.url), 'utf8'));
await mkdir(new URL('../src/data/', import.meta.url), { recursive:true });
await writeFile(new URL('../src/data/playlist.json', import.meta.url), JSON.stringify(parsed.songs, null, 2));
const w = buildWorld(parsed.songs);
console.log(JSON.stringify({songs:w.songs.length,artists:w.artists,plays:w.totalPlays,cutoff:w.referenceDate,twins:w.twins.length,bridges:w.bridges.map(b=>b.artist),quality:parsed.report},null,2));
