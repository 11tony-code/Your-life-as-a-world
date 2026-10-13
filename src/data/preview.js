// Catalog identity checks are deliberately conservative: a missed preview is
// preferable to presenting another artist or recording as the selected song.
const normalized = value => String(value || '').normalize('NFKC').toLocaleLowerCase('en-US').replace(/[^\p{L}\p{N}]/gu, '');

function titleIdentity(value) {
  const title = String(value || '').normalize('NFKC').trim();
  const suffix = title.match(/\s*(?:[([【]\s*(live\b[^)\]】]*|现场[^)\]】]*)[)\]】]|\s+[-–—]\s+(live\b.*|现场.*))\s*$/iu);
  const detail = suffix?.[1] || suffix?.[2] || '';
  return {base: normalized(suffix ? title.slice(0, suffix.index) : title), live: Boolean(suffix), detail: normalized(detail)};
}

function liveAlbum(name) {
  return /^(?:live\b|现场)|\blive\s+(?:at|in|from|on)\b|[([【]\s*live\b|现场(?:录音|专辑|演唱会)/iu.test(String(name || '').normalize('NFKC'));
}

function appleURL(value, preview = false) {
  try {
    const url = new URL(value);
    const allowed = preview ? /(?:^|\.)(?:apple\.com|mzstatic\.com)$/i : /^(?:itunes|music)\.apple\.com$/i;
    return url.protocol === 'https:' && allowed.test(url.hostname) ? url.href : null;
  } catch { return null; }
}

export function matchPreview(song, results) {
  const wanted = titleIdentity(song.title);
  const artist = normalized(song.artist);
  if (!wanted.base || !artist || !Array.isArray(results)) return null;
  for (const item of results) {
    if (!item || item.kind !== 'song' || normalized(item.artistName) !== artist) continue;
    const candidate = titleIdentity(item.trackName);
    if (candidate.base !== wanted.base || (candidate.live || liveAlbum(item.collectionName)) !== wanted.live) continue;
    // A generic "(Live)" can identify a live catalog entry; a named concert
    // must also match its descriptor. Album/venue metadata is shown in the UI.
    if (wanted.live && !['live', '现场', '现场版'].includes(wanted.detail) && candidate.detail !== wanted.detail) continue;
    const url = appleURL(item.previewUrl, true), storeUrl = appleURL(item.trackViewUrl);
    if (!url || !storeUrl || !Number.isSafeInteger(item.trackId) || item.trackId <= 0) continue;
    return {type: 'preview', url, storeUrl, trackId: item.trackId, trackName: String(item.trackName), artistName: String(item.artistName), collectionName: String(item.collectionName || ''), live: candidate.live || liveAlbum(item.collectionName)};
  }
  return null;
}

export async function fetchPreview(song, {fetchImpl = globalThis.fetch, signal, timeoutMs = 12_000} = {}) {
  const controller = new AbortController();
  const cancel = () => controller.abort(signal?.reason);
  if (signal?.aborted) cancel();
  signal?.addEventListener('abort', cancel, {once: true});
  const timer = setTimeout(() => controller.abort(new DOMException('试听查询超时', 'TimeoutError')), timeoutMs);
  try {
    for (const term of [`${song.title} ${song.artist}`, song.title]) {
      controller.signal.throwIfAborted();
      const params = new URLSearchParams({term, media: 'music', entity: 'song', country: 'US', limit: '25'});
      const response = await fetchImpl(`https://itunes.apple.com/search?${params}`, {signal: controller.signal, cache: 'no-store'});
      if (!response.ok) throw new Error(`iTunes HTTP ${response.status}`);
      const preview = matchPreview(song, (await response.json()).results);
      controller.signal.throwIfAborted();
      if (preview) return preview;
    }
    return null;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', cancel);
  }
}

// One active request per view. Even a transport that ignores AbortSignal cannot
// publish an obsolete response after switching songs or choosing local audio.
export function createPreviewRequests({lookup = fetchPreview, onBusy, onResult, onMessage}) {
  let active = null;
  function cancel() {
    const previous = active;
    active = null;
    previous?.controller.abort();
    if (previous) onBusy(null);
  }
  return {
    cancel,
    async load(song, currentAudio) {
      if (!song || currentAudio?.type === 'local' || active?.id === song.id) return;
      cancel();
      const request = {id: song.id, controller: new AbortController()};
      active = request;
      onBusy(song.id);
      try {
        const preview = await lookup(song, {signal: request.controller.signal});
        if (active !== request) return;
        onResult(song.id, preview);
        onMessage(preview ? '已找到同名、同艺人的对应版本。试听片段由 iTunes 提供，可查看商店曲目。' : `未找到「${song.title}」同艺人、对应版本的试听。可关联本地音频或搜索歌曲。`);
      } catch (error) {
        if (active !== request) return;
        onResult(song.id, null);
        onMessage(error.name === 'TimeoutError' ? '试听查询超时，请重试或关联本地音频。' : '试听请求失败，可能是网络受限或服务暂不可用。请重试或关联本地音频。');
      } finally {
        if (active === request) {active = null; onBusy(null);}
      }
    }
  };
}
