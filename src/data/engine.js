export const THEMES = {
  '民谣': { name: '民谣原野', en: 'FOLK MEADOWS', color: '#a4bfa0', terrain: 'meadow', phrase: '那些慢下来的日子，都留在这里。' },
  '梦幻流行': { name: '雾色群岛', en: 'DREAM ISLES', color: '#aa9ee3', terrain: 'mist', phrase: '雾里有些旋律，始终没有散去。' },
  '流行': { name: '日光之城', en: 'SUNLIT CITY', color: '#e2a1b0', terrain: 'city', phrase: '把熟悉的副歌，放进明亮的街道。' },
  '电子': { name: '霓虹峡谷', en: 'NEON CANYON', color: '#6fcbd0', terrain: 'neon', phrase: '节奏像海流，带你驶向下一座岛。' },
  '摇滚': { name: '赤岩山脉', en: 'CRIMSON RIDGES', color: '#db997f', terrain: 'rock', phrase: '那些反复响起的声音，长成了山。' },
  '爵士': { name: '琥珀海湾', en: 'AMBER BAY', color: '#d9bd80', terrain: 'bay', phrase: '在世界的尽头，留一盏温暖的灯。' },
};
const EXTRA_COLORS = ['#a5bdd8', '#b5ca92', '#cba4ca'];
export const num = (n) => Number(n).toLocaleString('zh-CN');
export const normalizeTitle = (title) => title.replace(/\s*[（(\[][^)）\]]*(?:\blive\b|现场)[^)）\]]*[)）\]]/gi, '').replace(/\s*[-–—]?\s*(?:live|现场版)\s*$/i, '').trim().toLowerCase();
export const isLiveTitle = (title) => /\blive\b|现场/i.test(title);
export function hash(text) {
  let value = 2166136261;
  for (let i = 0; i < text.length; i++) value = Math.imul(value ^ text.charCodeAt(i), 16777619);
  return value >>> 0;
}
export function random(seed) {
  let s = seed || 1;
  return () => { s += 0x6D2B79F5; let t = s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(value + 'T00:00:00Z');
  return Number.isFinite(+d) && d.toISOString().slice(0, 10) === value;
}

/** RFC-4180-style parser. No split(','): quoted commas/newlines are real data. */
export function csvRows(text) {
  const rows = []; let row = [], cell = '', quoted = false;
  text = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++; }
      else if (quoted || !cell) quoted = !quoted;
      else cell += c;
    } else if (c === ',' && !quoted) { row.push(cell); cell = ''; }
    else if ((c === '\n' || c === '\r') && !quoted) {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); if (row.some(x => x.trim())) rows.push(row); row = []; cell = '';
    } else cell += c;
  }
  if (quoted) throw new Error('CSV 有未闭合的引号，请检查文件格式。');
  row.push(cell); if (row.some(x => x.trim())) rows.push(row);
  return rows;
}
export function parsePlaylist(text) {
  if (text.length > 5_000_000) throw new Error('请导入不超过 5 MB 的 CSV。');
  const rows = csvRows(text);
  if (rows.length < 2) throw new Error('CSV 里没有歌曲记录。');
  const fields = ['title', 'artist', 'genre', 'play_count', 'last_played'];
  const header = rows.shift().map(x => x.trim().toLowerCase());
  const indexes = fields.map(x => header.indexOf(x));
  const missing = fields.filter((_, i) => indexes[i] < 0);
  if (missing.length) throw new Error(`缺少必要字段：${missing.join(', ')}`);
  if (rows.length > 5000) throw new Error('一次最多导入 5,000 首歌，请先缩小歌单。');
  const songs = [], errors = [], seen = new Set(); let duplicates = 0;
  for (const [index, row] of rows.entries()) {
    const [title, artist, genre, count, last_played] = indexes.map(i => (row[i] || '').trim());
    const play_count = Number(count);
    if (!title || !artist || !genre || title.length > 300 || artist.length > 200 || genre.length > 80 || !count || !Number.isSafeInteger(play_count) || play_count < 0 || play_count > 1_000_000_000 || !validDate(last_played)) {
      errors.push({ row: index + 2, reason: '歌名、艺人、流派不能为空；播放次数须为非负整数；日期须为有效的 YYYY-MM-DD。' }); continue;
    }
    const key = JSON.stringify([title, artist, genre, play_count, last_played]);
    if (seen.has(key)) { duplicates++; continue; }
    seen.add(key);
    songs.push({ id: `s-${hash(key).toString(36)}-${index}`, title, artist, genre, play_count, last_played, year: Number(last_played.slice(0, 4)), live: isLiveTitle(title) });
  }
  if (!songs.length) throw new Error('没有可用记录，请检查字段、播放次数和日期。');
  return { songs, report: { input: rows.length, valid: songs.length, duplicates, errors } };
}
export function dormancy(song, referenceDate) {
  const years = Math.max(0, (Date.parse(referenceDate) - Date.parse(song.last_played)) / 86400000 / 365.2425);
  const state = years < 1 ? '近期回声' : years < 3 ? '余音未散' : years < 5 ? '静默岛屿' : '旧日收藏';
  return { years, state, brightness: years < 1 ? 1 : years < 3 ? .78 : years < 5 ? .58 : .42 };
}
export function themeFor(genre, index = 0) { return THEMES[genre] || { name: `${genre}群岛`, en: 'UNEXPLORED ISLES', color: EXTRA_COLORS[index % 3], terrain: 'mist', phrase: '一段新的回声，在这里浮现。' }; }
const groupBy = (items, fn) => { const map = new Map(); for (const s of items) { const k = fn(s); if (!map.has(k)) map.set(k, []); map.get(k).push(s); } return map; };
export function buildWorld(input) {
  if (!input.length) throw new Error('需要至少一首歌才能生成世界。');
  const songs = input.map(s => ({ ...s }));
  const years = [...new Set(songs.map(s => s.year))].sort((a, b) => a - b);
  const maxPlay = Math.max(...songs.map(s => s.play_count), 1);
  const referenceDate = songs.map(s => s.last_played).sort().at(-1);
  const totalPlays = songs.reduce((a, s) => a + s.play_count, 0);
  const artistGroups = groupBy(songs, s => s.artist);
  const chapters = years.map((year, index) => {
    const list = songs.filter(s => s.year === year);
    const genreGroups = groupBy(list, s => s.genre);
    const genre = [...genreGroups].sort((a,b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))[0][0];
    const theme = themeFor(genre, index);
    // A continuous temporal arc; positions are deterministic and keep imports comparable.
    const angle = -Math.PI * .88 + index * Math.PI * 1.7 / Math.max(years.length - 1, 1);
    const center = { x: Math.cos(angle) * 590, y: Math.sin(angle) * 340 };
    return { year, index, songs: list, genre, ...theme, center, count: list.length, artists: new Set(list.map(s => s.artist)).size, plays: list.reduce((a, s) => a + s.play_count, 0), dominantShare: genreGroups.get(genre).length / list.length };
  });
  for (const chapter of chapters) {
    const groups = [...groupBy(chapter.songs, s => s.artist)].sort((a,b) => b[1].reduce((n,s) => n+s.play_count,0) - a[1].reduce((n,s)=>n+s.play_count,0));
    for (const [i, [artist, list]] of groups.entries()) {
      const rng = random(hash(`${chapter.year}|${artist}`));
      const a = i * 2.399963, r = 20 + Math.sqrt(i) * 30;
      const ax = chapter.center.x + Math.cos(a) * r * 1.1, ay = chapter.center.y + Math.sin(a) * r * .8;
      for (const [j, s] of list.sort((a,b)=>b.play_count-a.play_count).entries()) {
        const sa = j * 2.399963 + rng() * .7, sr = j === 0 ? 0 : 13 + Math.sqrt(j) * 17;
        s.x = ax + Math.cos(sa) * sr + (rng() - .5) * 8;
        s.y = ay + Math.sin(sa) * sr * .72 + (rng() - .5) * 8;
        s.radius = 2.4 + Math.sqrt(s.play_count / maxPlay) * 5.2;
        s.islandRadius = 2.2 + Math.sqrt(s.play_count / maxPlay) * 6.7;
        s.color = themeFor(s.genre, chapter.index).color;
        s.chapterIndex = chapter.index;
      }
    }
  }
  const byId = new Map(songs.map(s => [s.id, s]));
  const twins = [];
  for (const list of groupBy(songs, s => `${s.artist.toLowerCase()}|${normalizeTitle(s.title)}`).values()) {
    const studio = list.filter(s => !s.live).sort((a,b)=>b.play_count-a.play_count)[0];
    const live = list.filter(s => s.live).sort((a,b)=>b.play_count-a.play_count)[0];
    if (studio && live) {
      if (studio.year === live.year) {
        live.x = studio.x + studio.radius + live.radius + 9;
        live.y = studio.y + 5;
      }
      twins.push({ studio, live, ratio: live.play_count / Math.max(studio.play_count, 1) });
    }
  }
  const bridges = [];
  for (const [artist, list] of artistGroups) {
    const artistYears = [...new Set(list.map(s => s.year))].sort((a,b)=>a-b);
    if (artistYears.length > 1) bridges.push({ artist, years: artistYears, songs: list, ends: artistYears.map(y => list.filter(s=>s.year===y).sort((a,b)=>b.play_count-a.play_count)[0]) });
  }
  const sorted = [...songs].sort((a,b)=>b.play_count-a.play_count || a.title.localeCompare(b.title));
  const world = { songs, chapters, years, twins, bridges, byId, referenceDate, maxPlay, totalPlays, artists: artistGroups.size, sorted };
  world.discoveries = discover(world);
  return world;
}
export function discover(w) {
  const top = w.sorted[0], first = w.chapters[0], last = w.chapters.at(-1);
  const strongest = [...w.chapters].sort((a,b)=>b.plays-a.plays)[0];
  const twinPlays = w.twins.reduce((n,t)=>n+t.studio.play_count+t.live.play_count,0);
  const studioHigher = w.twins.filter(t=>t.studio.play_count>t.live.play_count).length;
  const oldTop = w.sorted.slice(0,10).filter(s=>dormancy(s,w.referenceDate).years>=3);
  const d = [
    { id:'chapters', tag:'时间的形状', title:`${w.chapters.length} 个年份，${new Set(w.chapters.map(c=>c.genre)).size} 种主色`, text:`按最后播放年份切片，${w.chapters.map(c=>`${c.year} · ${c.genre}`).join(' → ')}。这些是记录的归属，不是完整的年度听歌历史。`, evidence: w.chapters.map(c=>`${c.year}：${c.count} 首，主导流派 ${c.genre} 占 ${(c.dominantShare*100).toFixed(0)}%`), target:{ all:true }, metric:`${w.chapters.length}`, suffix:'个时间章节' },
    { id:'largest', tag:'反复的回声', title:'最大的一座岛，留在旧时光', text:`《${top.title}》累计播放 ${num(top.play_count)} 次，是整张歌单的最高地标。最后播放记录停在 ${top.last_played}。`, evidence:[`title = ${top.title}`, `artist = ${top.artist}`, `play_count = ${top.play_count}`, `last_played = ${top.last_played}`, `排名：1 / ${w.songs.length}`], target:{ song:top.id }, metric:num(top.play_count), suffix:'次累计播放' },
    { id:'old', tag:'旧日收藏', title:`回到 ${first.year} 的${first.genre}`, text:`${first.name}保存着 ${first.count} 首歌、${num(first.plays)} 次累计播放的痕迹。早期记录仍能被重新听见，也能被你写下新的记忆。`, evidence:[`最早的最后播放年份 = ${first.year}`, `该切片歌曲数 = ${first.count}`, `累计播放次数合计 = ${first.plays}`, '累计次数不等于该年份的播放次数。'], target:{ year:first.year }, metric:num(first.count), suffix:'首旧日回声' },
    { id:'latest', tag:'最近的海岸', title:`世界停在${last.name}`, text:`数据中最近的最后播放日期是 ${w.referenceDate}。${last.year} 这片海岸上有 ${last.count} 首歌，主色是${last.genre}。`, evidence:[`数据截止日期 = ${w.referenceDate}`, `切片年份 = ${last.year}`, `主导流派 = ${last.genre}`, '“最近”相对于这份数据，不代表今天的偏好。'], target:{ year:last.year }, metric:String(last.year), suffix:'数据最新章节' },
    { id:'heaviest', tag:'记忆的重量', title:`${strongest.name}，承载最多回声`, text:`最后播放日期落在 ${strongest.year} 的 ${strongest.count} 首歌，累计播放合计 ${num(strongest.plays)} 次，占全歌单 ${(strongest.plays/w.totalPlays*100 || 0).toFixed(1)}%。`, evidence:[`切片累计播放合计 = ${strongest.plays}`, `全歌单累计播放合计 = ${w.totalPlays}`, '按最后播放日期归组；不是年度播放量统计。'], target:{ year:strongest.year }, metric:num(strongest.plays), suffix:'次累计回声' },
  ];
  if (w.bridges.length) {
    const b = w.bridges[0];
    d.splice(2,0,{ id:'bridge', tag:'跨海大桥', title:`${b.artist}，连接了两个时空`, text:`同一个艺人的歌，留在 ${b.years.join('、')} 年的不同区域。${w.bridges.length === 1 ? '这是这份歌单唯一一位跨年份的艺人。' : `歌单共有 ${w.bridges.length} 位跨年份艺人。`}沿着发光的连线，看看共同的声音。`, evidence:b.years.map(y=>`${y}：${b.songs.filter(s=>s.year===y).map(s=>s.title).join('、')}`), target:{ artist:b.artist }, metric:String(b.years.length), suffix:'个年份被连接' });
  }
  if (w.twins.length) d.push({ id:'twins', tag:'Live 双岛', title:'同一首歌，两种在场方式', text:`识别到 ${w.twins.length} 对录音室 / Live 版本，其中 ${studioHigher} 对录音室版本的累计播放更多。两座相邻的岛，收藏了不同的声音。`, evidence:[`按艺人 + 去除 Live 标记后的歌名匹配 = ${w.twins.length} 对`, `录音室播放更多 = ${studioHigher} 对`, `配对歌曲累计播放合计 = ${twinPlays}`, '名称匹配并不等于音频指纹确认。'], target:{ twins:true }, metric:String(w.twins.length), suffix:'对双生岛屿' });
  if (oldTop.length) d.push({ id:'contrast', tag:'时间的反差', title:'最大的回声，也会变得安静', text:`播放最多的前 ${Math.min(10,w.songs.length)} 首歌里，有 ${oldTop.length} 首的最后播放日期距数据截止日超过 3 年。体量与亮度讲的是两个不同的故事。`, evidence:oldTop.map(s=>`${s.title}：${s.play_count} 次 / 最后播放 ${s.last_played}`), target:{ ids:oldTop.map(s=>s.id) }, metric:String(oldTop.length), suffix:'首安静的地标' });
  return d;
}

/** Guide is deliberately evidence-based. No mood/history fields are fabricated. */
export function localGuide(query, world, memories = {}) {
  const q = query.trim().toLowerCase();
  const result = (text,target,evidence=[]) => ({ text,target,evidence,source:'local' });
  if (!q) return result('告诉我一个歌名、艺人、流派或年份，我会带你去那里。',{});
  if (/孤独|悲伤|快乐|开心|焦虑|深夜|夜晚|情绪|心情|lonely|sad/.test(q)) {
    const noteMatch = world.songs.filter(s => memories[s.id]?.note && q.split(/[，。！？\s]/).some(word=>word.length>1 && memories[s.id].note.toLowerCase().includes(word)));
    if (noteMatch.length) return result(`你的笔记里找到了 ${noteMatch.length} 处相关记忆。带你去《${noteMatch[0].title}》，这是你写下的线索。`,{song:noteMatch[0].id},['依据：你自己的记忆笔记']);
    return result('歌单没有情绪或听歌时段字段，我无法判断你当时的心情。可以先去雾色群岛听听熟悉的歌，或者给一首歌写下属于你的记忆。', {year:world.chapters.find(c=>c.genre==='梦幻流行')?.year ?? world.years[0]}, ['genre 与情绪并非同一个字段', '路线是探索建议，不是心理推断']);
  }
  if (/live|现场|双岛|双生/.test(q) && world.twins.length) return result(`找到 ${world.twins.length} 对 Live 双岛。以《${world.twins[0].studio.title}》为起点，录音室 ${world.twins[0].studio.play_count} 次，Live ${world.twins[0].live.play_count} 次。`,{twins:true,song:world.twins[0].studio.id},['按艺人与规范化歌名匹配']);
  if (/桥|跨年|跨海|连接/.test(q) && world.bridges.length) { const b=world.bridges[0]; return result(`${b.artist} 的歌连接了 ${b.years.join(' 与 ')} 年。镜头已沿着这条跨海大桥展开。`,{artist:b.artist},b.years.map(y=>`${y} 年 ${b.songs.filter(s=>s.year===y).length} 首`)); }
  if (/最多|最大|最爱|最高|top|most/.test(q)) { const s=world.sorted[0]; return result(`最高地标是《${s.title}》，${s.artist}，累计播放 ${s.play_count} 次。最后一次记录在 ${s.last_played}。`,{song:s.id},['按 play_count 降序排列']); }
  if (/最近|最新|终点|现在|latest/.test(q)) { const c=world.chapters.at(-1); return result(`这份数据最近的海岸是 ${c.year} 年的${c.name}。截止日期 ${world.referenceDate}，这里有 ${c.count} 首歌。`,{year:c.year},['按 last_played 的最大值计算']); }
  if (/最早|过去|曾经|起点|旧日|oldest/.test(q)) { const c=world.chapters[0]; return result(`回到 ${c.year} 年的${c.name}。${c.count} 首歌共留下 ${num(c.plays)} 次累计回声。`,{year:c.year},['按 last_played 的最早年份切片']); }
  const year = q.match(/(?:19|20|21)\d{2}/)?.[0];
  if (year && world.years.includes(+year)) { const c=world.chapters.find(c=>c.year===+year); return result(`带你来到 ${year} · ${c.name}。这里有 ${c.count} 首歌、${c.artists} 位艺人。`,{year:+year},[`last_played 年份 = ${year}`]); }
  const artist = [...new Set(world.songs.map(s=>s.artist))].sort((a,b)=>b.length-a.length).find(a=>q.includes(a.toLowerCase()));
  if (artist) { const songs=world.songs.filter(s=>s.artist===artist); return result(`已找到 ${artist} 的 ${songs.length} 座岛，累计 ${num(songs.reduce((n,s)=>n+s.play_count,0))} 次回声。`,{artist},['artist 字段精确匹配']); }
  const genre = world.chapters.find(c=>q.includes(c.genre.toLowerCase()) || q.includes(c.name));
  if (genre) return result(`沿着${genre.genre}的声音，来到 ${genre.year} · ${genre.name}。`,{year:genre.year},[`主导流派 = ${genre.genre}`]);
  const title=world.songs.find(s=>q.includes(s.title.toLowerCase()) || (q.length>1 && s.title.toLowerCase().includes(q)));
  if (title) return result(`找到《${title.title}》，${title.artist}，${title.play_count} 次播放，最后记录 ${title.last_played}。`,{song:title.id},['title 字段匹配']);
  return result('这段线索还没有出现在歌单里。试试“播放最多的歌”“Radiohead 的桥”“2019”或“Live 双岛”。',{},['搜索范围：歌名、艺人、流派、最后播放年份']);
}

export function filterSongs(world, {timeTo, year, artist, query='', liveOnly=false, favorites=false, memories={}} = {}) {
  const q=query.toLowerCase().trim();
  return world.songs.filter(s=>(timeTo == null || s.year<=timeTo) && (year == null || s.year===year) && (!artist || s.artist===artist) && (!liveOnly || s.live) && (!favorites || memories[s.id]?.favorite) && (!q || `${s.title} ${s.artist} ${s.genre} ${s.year}`.toLowerCase().includes(q)));
}
