import test from 'node:test';
import assert from 'node:assert/strict';
import {matchPreview,resolvePreview,fetchPreview,createPreviewRequests,createSearchBudget} from '../src/data/preview.js';
import {previewHint,missingPreview} from '../src/data/preview-report.js';

const song={id:'light',title:'光',artist:'陈粒'};
const track=(patch={})=>({kind:'song',trackId:123,artistId:77,trackName:'光',artistName:'陳粒',collectionName:'如也',releaseDate:'2015-02-02T12:00:00Z',previewUrl:'https://audio-ssl.itunes.apple.com/p.m4a',trackViewUrl:'https://music.apple.com/hk/album/light/456?i=123',...patch});
const live=()=>track({trackId:124,trackName:'光 (Live at A)',collectionName:'Live at A'});
const cover=()=>track({trackId:125,artistId:88,trackName:'光 (Cover: 陳粒)',artistName:'其他演唱者'});
const lookup=options=>fetchPreview(song,{budget:()=>{},...options});
const response=results=>({ok:true,json:async()=>({results})});

// These records are controlled fixtures, not claims about real releases.
test('original wins over live and explicit cover regardless of catalog ordering',()=>{
  const result=resolvePreview(song,[cover(),live(),track()]);
  assert.equal(result.version,'original');assert.equal(result.originalFound,true);assert.equal(result.trackId,123);
  assert.match(result.evidence,/如也.*2015-02-02/);assert.match(result.hint,/已找到.*原唱/);
});

test('Chinese traditional/simplified forms match without translating song identities',()=>{
  const result=matchPreview({title:'歷歷萬鄉',artist:'陈粒'},[track({trackName:'历历万乡'})]);
  assert.equal(result.version,'original');
  assert.equal(matchPreview(song,[track({trackName:'光年之外'})]),null);
  assert.equal(matchPreview(song,[track({trackName:'Hikari'})]),null);
  assert.equal(matchPreview({title:'Song (Part 1)',artist:'A'},[track({trackName:'Song (Part 2)',artistName:'A'})]),null);
});

test('a Romanized artist requires independently matched Apple artist ID evidence',()=>{
  const roman=track({artistName:'Chen Li'});
  assert.equal(matchPreview(song,[roman]),null);
  const anchored=track({previewUrl:null,trackId:122});
  const result=matchPreview(song,[anchored,roman]);
  assert.equal(result.version,'original');assert.match(result.evidence,/艺人 ID 77/);
  assert.equal(matchPreview(song,[anchored,track({artistId:99,artistName:'Chen Li'})]),null);
});

test('same-title different artist or language cannot be presumed to be a cover',()=>{
  const result=resolvePreview(song,[track({artistName:'別人',artistId:88})]);
  assert.equal(result.version,'unknown');assert.equal(result.url,null);assert.match(result.evidence,/无法确认版本/);
  assert.ok(result.hint.startsWith('未找到目标歌曲《光》的原唱音频'));
  assert.equal(resolvePreview(song,[track({artistName:'Hikari',artistId:99,collectionName:'Japanese songs'})]).url,null);
});

test('live fallback announces missing original before identifying the actual version',()=>{
  const result=resolvePreview(song,[cover(),live()]);
  assert.equal(result.version,'live');assert.equal(result.originalFound,false);assert.equal(result.live,true);
  assert.match(result.hint,/^未找到目标歌曲《光》的原唱音频。.*这是《光》的 live 版/);
  assert.match(result.evidence,/Live/);
});

test('cover requires a source credit linking the target artist and names its actual performer',()=>{
  const result=resolvePreview(song,[cover()]);
  assert.equal(result.version,'cover');assert.equal(result.artistName,'其他演唱者');
  assert.match(result.hint,/^未找到目标歌曲《光》的原唱音频。.*翻唱版（演唱者：其他演唱者）/);
  assert.equal(resolvePreview(song,[track({artistName:'别的艺人',artistId:88,trackName:'光 (Cover: 陈奕迅)'})]).url,null);
  assert.equal(resolvePreview(song,[track({artistName:'Cover Band',artistId:88})]).url,null);
  assert.equal(resolvePreview(song,[track({artistName:'别的艺人',artistId:88,collectionName:'Tribute to 非陈粒'})]).url,null);
  assert.equal(resolvePreview(song,[track({artistName:'别的艺人',artistId:88,collectionName:'Tribute to 陈粒'})]).version,'cover');
});

test('a live cover remains a cover and cannot outrank the target artist live performance',()=>{
  const liveCover={...cover(),trackName:'光 (Live) (Cover: 陈粒)'};
  const result=resolvePreview(song,[liveCover]);assert.equal(result.version,'cover');assert.equal(result.live,true);
  assert.match(result.hint,/翻唱版.*现场版本/);
  assert.equal(resolvePreview(song,[liveCover,live()]).version,'live');
});

test('original priority also applies to a playlist Live title, with explicit studio disclosure',()=>{
  const result=resolvePreview({...song,title:'光 (Live)'},[live(),track()]);
  assert.equal(result.version,'original');assert.match(result.hint,/歌单带现场标记.*实际音频为录音室/);
  const english={title:'Live and Let Die',artist:'A'};
  assert.equal(resolvePreview(english,[track({trackName:english.title,artistName:'A'})]).version,'original');
  assert.doesNotMatch(previewHint(english,{version:'original'}),/现场标记/);
});

test('studio identity rejects explicit cover, ambiguous acoustic metadata and backing tracks',()=>{
  for(const album of ['Karaoke','Instrumental','Acoustic Sessions','Unplugged','伴奏精选'])assert.equal(resolvePreview(song,[track({collectionName:album})]).url,null);
  assert.equal(resolvePreview(song,[track({trackName:'光 (Cover)',collectionName:'Cover Sessions'})]).url,null);
});

test('unavailable original preview permits evidenced fallback and reports missing original audio',()=>{
  const result=resolvePreview(song,[track({previewUrl:''}),cover()]);assert.equal(result.version,'cover');
  const none=resolvePreview(song,[track({previewUrl:''})]);assert.equal(none.version,'not_found');assert.equal(none.url,null);
  assert.match(none.hint,/^未找到目标歌曲《光》的原唱音频。.*没有可用试听地址/);
  assert.equal(none.storeUrl,track().trackViewUrl);
});

test('only Apple HTTPS audio/store URLs and valid track metadata can become playable',()=>{
  for(const patch of [{previewUrl:''},{trackViewUrl:''},{trackViewUrl:'javascript:alert(1)'},{trackViewUrl:'https://music.apple.com.evil.test/123'},{previewUrl:'http://audio-ssl.itunes.apple.com/p.m4a'},{trackId:0},{kind:'music-video'},{artistName:''}])assert.equal(matchPreview(song,[track(patch)]),null);
  assert.equal(matchPreview(song,[null,{}]),null);
  assert.equal(resolvePreview(song,[track(),live()],{excludedURLs:[track().previewUrl]}).url,null);
});

test('Chinese lookup uses HK first, traditional query text and a fresh metadata request',async()=>{
  const calls=[];const result=await lookup({fetchImpl:async(url,options)=>{calls.push({url,options});return response([track()]);}});
  assert.equal(result.version,'original');assert.equal(result.storefront,'HK');assert.equal(calls.length,1);
  assert.equal(new URL(calls[0].url).searchParams.get('country'),'HK');
  assert.equal(new URL(calls[0].url).searchParams.get('term'),'光 陳粒');assert.equal(calls[0].options.cache,'no-store');
});

test('a later storefront original outranks an earlier live result',async()=>{
  const calls=[];const result=await lookup({fetchImpl:async url=>{const country=new URL(url).searchParams.get('country');calls.push(country);return response(country==='HK'?[live()]:[track()]);}});
  assert.equal(result.version,'original');assert.deepEqual(calls,['HK','TW']);
});

test('title-only original search completes before selecting a lower-priority candidate',async()=>{
  const calls=[];const result=await lookup({fetchImpl:async url=>{const p=new URL(url).searchParams;calls.push({country:p.get('country'),term:p.get('term')});return response(calls.length===1?[live()]:calls.length===6?[track()]:[]);}});
  assert.equal(calls.length,6);assert.equal(result.version,'original');assert.equal(calls.at(-1).term,'光');
});

test('one failed storefront does not prevent another from providing the original',async()=>{
  let count=0;const result=await lookup({fetchImpl:async()=>{if(++count===1)throw new Error('network');return response([track()]);}});
  assert.equal(result.version,'original');assert.equal(result.partial,true);assert.equal(count,2);
});

test('an incomplete search discloses limits and never creates fake links or certainty',async()=>{
  const result=await lookup({fetchImpl:async()=>({ok:true,json:async()=>({})})});
  assert.equal(result.version,'not_found');assert.equal(result.partial,true);assert.equal(result.url,null);
  assert.match(result.hint,/^未找到目标歌曲《光》的原唱音频。.*部分曲库查询失败/);
  const partial=resolvePreview(song,[live()],{errors:['network']});assert.equal(partial.version,'live');assert.match(partial.hint,/仅限本次/);
});

test('query budget stops request bursts and resets without caching preview recordings',async()=>{
  let time=0;const budget=createSearchBudget({limit:2,windowMs:100,now:()=>time});budget();budget();assert.throws(budget,{name:'CatalogRateLimitError'});time=100;budget();
  let count=0;const result=await lookup({fetchImpl:async()=>{count++;return {ok:false,status:429};}});
  assert.equal(count,1);assert.equal(result.rateLimited,true);assert.equal(result.url,null);
  assert.match(result.hint,/过于频繁/);
});

test('transport honors already-cancelled requests and total timeouts',async()=>{
  const controller=new AbortController();controller.abort();let calls=0;
  await assert.rejects(lookup({signal:controller.signal,fetchImpl:async()=>{calls++;}}),{name:'AbortError'});assert.equal(calls,0);
  await assert.rejects(lookup({timeoutMs:5,fetchImpl:async(url,{signal})=>new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(signal.reason),{once:true}))}),{name:'TimeoutError'});
});

function harness(lookup){const events=[];return {events,requests:createPreviewRequests({lookup,onBusy:id=>events.push(['busy',id]),onResult:(id,result)=>events.push(['result',id,result]),onMessage:text=>events.push(['message',text])})};}

test('retry queries again while preserving explicitly associated local audio',async()=>{
  let calls=0;const {requests,events}=harness(async()=>{calls++;return resolvePreview(song,[track()]);});
  await requests.load(song,{type:'preview'});await requests.load(song,{type:'preview'});await requests.load(song,{type:'local'});
  assert.equal(calls,2);assert.equal(events.filter(e=>e[0]==='result').length,2);
});

test('duplicate clicks and stale responses cannot overwrite a different song selection',async()=>{
  const pending=[];const {requests,events}=harness((song,{signal})=>new Promise(resolve=>pending.push({song,signal,resolve})));
  const first=requests.load(song);await requests.load(song);assert.equal(pending.length,1);
  const second=requests.load({...song,id:'other'});assert.equal(pending[0].signal.aborted,true);
  pending[0].resolve(resolvePreview(song,[track()]));await first;assert.equal(events.some(e=>e[0]==='result'),false);
  pending[1].resolve(resolvePreview(song,[track()]));await second;assert.deepEqual(events.filter(e=>e[0]==='result').map(e=>e[1]),['other']);
});

test('local association or detail closure cancels results without misleading error notices',async()=>{
  let resolve;const {requests,events}=harness(()=>new Promise(done=>{resolve=done;}));const pending=requests.load(song);
  requests.cancel();resolve(resolvePreview(song,[track()]));await pending;
  assert.equal(events.some(e=>e[0]==='result'||e[0]==='message'),false);assert.deepEqual(events.at(-1),['busy',null]);
});

test('failure stays visible and retry passes failed audio URLs to the next search',async()=>{
  let calls=0,options;const {requests,events}=harness(async(song,opts)=>{options=opts;if(++calls===1)throw new Error('network');return missingPreview(song);});
  await requests.load(song);const failure=events.find(e=>e[0]==='result')[2];assert.equal(failure.version,'not_found');assert.match(failure.hint,/^未找到目标歌曲《光》的原唱音频/);
  await requests.load(song,failure,{excludedURLs:['https://audio-ssl.itunes.apple.com/bad.m4a']});assert.equal(calls,2);assert.equal(options.excludedURLs.length,1);
});
