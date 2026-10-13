import {Converter as toChinese} from 'opencc-js/t2cn';
import {Converter as fromChinese} from 'opencc-js/cn2t';
import {missingPreview, previewHint} from './preview-report.js';
export {createPreviewRequests} from './preview-requests.js';

const simplify=toChinese({from:'t',to:'cn'}), traditionalize=fromChinese({from:'cn',to:'tw'});
const normalized=value=>simplify(String(value||'').normalize('NFKC')).toLocaleLowerCase('en-US').replace(/[^\p{L}\p{N}]/gu,'');
export const STORE_NAMES={HK:'香港',TW:'台湾',US:'美国'};

function titleIdentity(value){
  let base=String(value||'').normalize('NFKC').trim(), live=false, explicitCover=false;
  const references=[],credits=[];
  function annotation(text){
    text=simplify(text).trim();
    if(/^(?:live\b|现场(?:版|录音)?)/iu.test(text)){live=true;return true;}
    // A named film/series credit describes where the song was used. Do not
    // remove arbitrary subtitles, featured artists or alternate editions.
    if(/^(?:电影|电视剧|网剧|动画|纪录片)\s*(?:《[^《》]+》|「[^「」]+」|“[^“”]+”|"[^"]+")\s*(?:中国区|台湾区|香港区|中文版)?\s*(?:主题曲|片头曲|片尾曲|插曲|推广曲)$/u.test(text)){credits.push(text);return true;}
    const cover=text.match(/^(cover(?:\s+(?:of|by))?|翻唱(?:版)?|原唱(?:者)?|original(?:ly performed by| artist))\s*[:：]?\s*(.*)$/iu);
    if(!cover)return false;
    if(/^(?:cover|翻唱)/iu.test(cover[1]))explicitCover=true;
    if(cover[2])references.push(normalized(cover[2]));
    return true;
  }
  for(let i=0;i<4;i++){
    const suffix=base.match(/\s*[([【]([^()[\]【】]*)[)\]】]\s*$/u);
    if(!suffix||!annotation(suffix[1]))break;
    base=base.slice(0,suffix.index).trim();
  }
  const dash=base.match(/\s+[-–—]\s+(live\b.*|现场.*|cover\b.*|翻唱.*|原唱.*)$/iu);
  if(dash&&annotation(dash[1]))base=base.slice(0,dash.index).trim();
  return {base,identity:normalized(base),live,explicitCover,references,credits};
}

function liveAlbum(value){
  const name=simplify(String(value||'').normalize('NFKC'));
  return /^live\s*$|\blive\s+(?:at|in|from|on)\b|[([【]\s*live\b|\s[-–—]\s*live\b|现场(?:版|录音|专辑|演唱会)|演唱会/iu.test(name);
}

function appleURL(value,preview=false){
  try{const url=new URL(value),allowed=preview?/(?:^|\.)(?:apple\.com|mzstatic\.com)$/i:/^(?:itunes|music)\.apple\.com$/i;
    return url.protocol==='https:'&&allowed.test(url.hostname)?url.href:null;
  }catch{return null;}
}

function classifiedCandidates(song,results,excludedURLs=[]){
  const wanted=titleIdentity(song.title),artist=normalized(song.artist),excluded=new Set(excludedURLs);
  if(!wanted.identity||!artist||!Array.isArray(results))return [];
  // Romanized names require a provider ID independently anchored to the
  // target's Chinese name; pronunciation or a different artist is not enough.
  const artistIds=new Map(results.filter(i=>i?.kind==='song'&&normalized(i.artistName)===artist&&Number.isSafeInteger(i.artistId)&&i.artistId>0).map(i=>[i.artistId,i.artistName]));
  return results.flatMap(item=>{
    if(!item||item.kind!=='song'||!Number.isSafeInteger(item.trackId)||item.trackId<=0||!String(item.artistName||'').trim())return [];
    const title=titleIdentity(item.trackName),storeUrl=appleURL(item.trackViewUrl);
    if(title.identity!==wanted.identity||!storeUrl)return [];
    const direct=normalized(item.artistName)===artist,sameArtist=direct||artistIds.has(item.artistId);
    const album=String(item.collectionName||''),isLive=title.live||liveAlbum(album);
    const albumCover=/\bcover\b|翻唱|tribute\s+to/iu.test(simplify(album));
    const albumText=simplify(album).trim();
    const albumCredit=albumText.match(/^(?:tribute\s+to|covers?\s+of|翻唱\s*[:：]?|原唱\s*[:：]?)\s*(.+)$/iu)?.[1]||albumText.match(/^(.+?)(?:的)?(?:作品)?翻唱(?:集|合集|精选)?$/u)?.[1];
    const coverLinked=title.references.includes(artist)||normalized(albumCredit)===artist;
    const markedCover=title.explicitCover||albumCover;
    let version='unknown';
    const ambiguous=/\bunplugged\b|\bacoustic\b|\bkaraoke\b|\binstrumental\b|\bremix\b|伴奏|卡拉|纯音乐/iu.test(albumText);
    const programme=/第\s*[\d一二三四五六七八九十百零〇两]+\s*(?:期|季)|\b(?:episode|season)\s+\d+\b/iu.test(albumText);
    const backing=/\bkaraoke\b|\binstrumental\b|伴奏|卡拉|纯音乐/iu.test(albumText);
    if(!backing&&sameArtist&&!markedCover&&!title.references.some(name=>name!==artist)&&(!(ambiguous||programme)||isLive))version=isLive?'live':'original';
    else if(!backing&&!sameArtist&&coverLinked)version='cover';
    let url=appleURL(item.previewUrl,true);if(excluded.has(url))url=null;
    const releaseDate=/^\d{4}-\d{2}-\d{2}T/.test(String(item.releaseDate||''))?item.releaseDate.slice(0,10):'';
    const identityEvidence=direct?'艺人署名与目标一致（支持简繁）':`地区署名“${item.artistName}”与“${artistIds.get(item.artistId)}”使用同一 Apple 艺人 ID ${item.artistId}`;
    const description=version==='unknown'?(sameArtist&&programme&&!isLive?'歌名与艺人匹配，但专辑是分期节目且未明确标注录音版本；无法确认版本':'歌名匹配，但艺人身份、翻唱关系或录音版本不能核实；无法确认版本'):
      version==='cover'?`标题相同，曲目或专辑明确关联目标艺人的翻唱 / 原唱署名；演唱者为 ${item.artistName}`:
      `${identityEvidence}；${isLive?'曲目或专辑含 Live / 现场标记':'曲目与专辑没有 Live 或翻唱标记'}`;
    return [{type:'preview',version,url:version==='unknown'?null:url,storeUrl,trackId:item.trackId,artistId:item.artistId,
      trackName:String(item.trackName),artistName:String(item.artistName),collectionName:album,releaseDate,
      storefront:STORE_NAMES[item.storefront]?item.storefront:null,live:isLive,
      evidence:`${description}${title.credits.length?`；标题附带影视使用说明“${title.credits.join('；')}”`:''}${album?`；专辑《${album}》`:''}${releaseDate?`，发行 ${releaseDate}`:''}。`}];
  });
}

export function resolvePreview(song,results,{excludedURLs=[],errors=[]}={}){
  const candidates=classifiedCandidates(song,results,excludedURLs);
  const hit=['original','live','cover'].map(version=>candidates.find(c=>c.version===version&&c.url)).find(Boolean);
  const partial=errors.length>0;
  if(hit){const result={...hit,originalFound:hit.version==='original',partial};result.hint=previewHint(song,result);return result;}
  const unknown=candidates.find(c=>c.version==='unknown'),unavailable=candidates.find(c=>c.version!=='unknown');
  const result=missingPreview(song,unknown?'存在同名候选，但无法确认版本，因此未提供该音频。':unavailable?'曲库有匹配条目，但没有可用试听地址。':'成功查询的曲库中没有可核实的对应试听。');
  Object.assign(result,unknown||unavailable||{}, {version:unknown?'unknown':'not_found',url:null,originalFound:false,partial});
  if(!unknown&&!unavailable)result.evidence=partial?'部分曲库查询失败，无法确认这些曲库中的版本。':'没有找到歌名、艺人身份或翻唱关系有依据且提供试听地址的条目。';
  result.hint=previewHint(song,result);
  return result;
}

export function matchPreview(song,results,options){const result=resolvePreview(song,results,options);return result.url?result:null;}

export function createSearchBudget({limit=18,windowMs=60_000,now=Date.now}={}){
  let recent=[];
  return()=>{const time=now();recent=recent.filter(t=>time-t<windowMs);if(recent.length>=limit){const error=new Error('曲库查询过于频繁，请稍后重试。');error.name='CatalogRateLimitError';throw error;}recent.push(time);};
}
const requestBudget=createSearchBudget();

export async function fetchPreview(song,{fetchImpl=globalThis.fetch,signal,timeoutMs=40_000,requestTimeoutMs=6500,excludedURLs=[],budget=requestBudget}={}){
  const controller=new AbortController(),cancel=()=>controller.abort(signal?.reason);
  if(signal?.aborted)cancel();signal?.addEventListener('abort',cancel,{once:true});
  const timer=setTimeout(()=>controller.abort(new DOMException('试听查询超时','TimeoutError')),timeoutMs);
  const title=titleIdentity(song.title).base,chinese=/\p{Script=Han}/u.test(`${title}${song.artist}`);
  const stores=chinese?['HK','TW','US']:['US','HK','TW'],records=[],errors=[];
  try{
    // Search every selected storefront for originals before using live/cover.
    for(const broad of [false,true])for(const country of stores){
      controller.signal.throwIfAborted();
      const term=broad?title:`${title} ${song.artist}`;
      const params=new URLSearchParams({term:chinese&&country!=='US'?traditionalize(term):term,media:'music',entity:'song',country,limit:'50'});
      let requestTimer;
      try{
        budget();const request=new AbortController();requestTimer=setTimeout(()=>request.abort(new DOMException('曲库查询超时','TimeoutError')),requestTimeoutMs);
        const response=await fetchImpl(`https://itunes.apple.com/search?${params}`,{signal:AbortSignal.any([controller.signal,request.signal]),cache:'no-store'});
        if(!response.ok){const error=new Error(`iTunes HTTP ${response.status}`);if(response.status===429)error.name='CatalogRateLimitError';throw error;}
        const data=await response.json();if(!Array.isArray(data.results))throw new Error('曲库返回格式无效');
        records.push(...data.results.filter(i=>i&&typeof i==='object').map(i=>({...i,storefront:country})));
        const result=resolvePreview(song,records,{excludedURLs,errors});
        if(result.originalFound)return result;
      }catch(error){
        controller.signal.throwIfAborted();
        if(error.name==='CatalogRateLimitError'){const result={...resolvePreview(song,records,{excludedURLs,errors:[...errors,error.message]}),rateLimited:true};result.hint=previewHint(song,result);return result;}
        errors.push(`${country}: ${error.message}`);
      }finally{clearTimeout(requestTimer);}
    }
    return resolvePreview(song,records,{excludedURLs,errors});
  }finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel);}
}
