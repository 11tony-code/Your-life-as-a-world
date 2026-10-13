import test from 'node:test';
import assert from 'node:assert/strict';
import {matchPreview, fetchPreview, createPreviewRequests} from '../src/data/preview.js';

const song = {id:'radiohead', title:'No Surprises', artist:'Radiohead'};
const track = (patch = {}) => ({kind:'song',trackId:123,trackName:'No Surprises',artistName:'Radiohead',collectionName:'OK Computer',previewUrl:'https://audio-ssl.itunes.apple.com/preview.m4a',trackViewUrl:'https://music.apple.com/us/album/no-surprises/456?i=123',...patch});

test('preview requires an exact title and artist, rejecting covers and partial titles', () => {
  assert.equal(matchPreview({title:'光',artist:'陈粒'}, [track({trackName:'光',artistName:'其他艺人'})]), null);
  assert.equal(matchPreview({title:'光',artist:'陈粒'}, [track({trackName:'光年之外',artistName:'陈粒'})]), null);
  const hit = matchPreview({...song,title:'Ｎｏ  Surprises',artist:'radiohead'}, [track()]);
  assert.equal(hit.trackId,123);
  assert.equal(hit.artistName,'Radiohead');
  assert.equal(hit.collectionName,'OK Computer');
  assert.equal(hit.storeUrl,track().trackViewUrl);
});

test('Live and studio previews cannot be substituted for each other', () => {
  const live = {...song,title:'No Surprises (Live)'};
  assert.equal(matchPreview(live,[track()]),null);
  assert.equal(matchPreview(song,[track({trackName:'No Surprises (Live at the BBC)'})]),null);
  assert.equal(matchPreview(song,[track({collectionName:'Live at the BBC'})]),null);
  assert.equal(matchPreview(live,[track({trackName:'No Surprises (Live at the BBC)'})]).live,true);
  assert.equal(matchPreview(live,[track({collectionName:'Live at the BBC'})]).live,true);
  assert.equal(matchPreview({title:'光（现场版）',artist:'陈粒'},[track({trackName:'光 - 现场版',artistName:'陈粒'})]).live,true);
});

test('semantic subtitles and specified concert descriptors remain part of identity', () => {
  assert.equal(matchPreview({title:'Song (Part 1)',artist:'Radiohead'},[track({trackName:'Song (Part 2)'})]),null);
  assert.equal(matchPreview(song,[track({trackName:'No Surprises (Acoustic)'})]),null);
  assert.equal(matchPreview({...song,title:'No Surprises (Live at A)'},[track({trackName:'No Surprises (Live at B)'})]),null);
  assert.equal(matchPreview({title:'Live and Let Die',artist:'Radiohead'},[track({trackName:'Live and Let Die'})]).live,false);
});

test('preview metadata must include a valid Apple HTTPS store link and audio source', () => {
  for (const patch of [{previewUrl:''},{trackViewUrl:''},{trackViewUrl:'javascript:alert(1)'},{trackViewUrl:'https://music.apple.com.evil.test/123'},{previewUrl:'http://audio-ssl.itunes.apple.com/p.m4a'},{trackId:0},{kind:'music-video'}]) {
    assert.equal(matchPreview(song,[track(patch)]),null);
  }
  assert.equal(matchPreview(song,[null,{}]),null);
});

test('fallback query still enforces artist/version and sends only the selected identity', async () => {
  const calls=[];
  const hit=await fetchPreview(song,{fetchImpl:async(url,options)=>{calls.push({url,options});return {ok:true,json:async()=>({results:calls.length===1?[track({artistName:'Cover Band'})]:[track()]})};}});
  assert.equal(hit.trackId,123);
  assert.equal(calls.length,2);
  assert.equal(new URL(calls[0].url).searchParams.get('term'),'No Surprises Radiohead');
  assert.equal(new URL(calls[1].url).searchParams.get('term'),'No Surprises');
  assert.equal(calls[0].options.cache,'no-store');
});

test('preview transport handles malformed data, failed status, cancellation and timeout', async () => {
  assert.equal(await fetchPreview(song,{fetchImpl:async()=>({ok:true,json:async()=>({})})}),null);
  await assert.rejects(fetchPreview(song,{fetchImpl:async()=>({ok:false,status:429})}),/HTTP 429/);
  const controller=new AbortController();controller.abort();let requests=0;
  await assert.rejects(fetchPreview(song,{signal:controller.signal,fetchImpl:async()=>{requests++;}}),{name:'AbortError'});
  assert.equal(requests,0);
  await assert.rejects(fetchPreview(song,{timeoutMs:5,fetchImpl:async(url,{signal})=>new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(signal.reason),{once:true}))}),{name:'TimeoutError'});
});

function harness(lookup){
  const events=[];
  const requests=createPreviewRequests({lookup,onBusy:id=>events.push(['busy',id]),onResult:(id,hit)=>events.push(['result',id,hit]),onMessage:text=>events.push(['message',text])});
  return {events,requests};
}

test('retry performs a fresh lookup even with an existing preview, while local audio is preserved', async () => {
  let lookups=0;
  const {events,requests}=harness(async()=>{lookups++;return matchPreview(song,[track()]);});
  await requests.load(song,{type:'preview',url:'old'});
  await requests.load(song,{type:'preview',url:'new'});
  await requests.load(song,{type:'local',url:'blob:local'});
  assert.equal(lookups,2);
  assert.equal(events.filter(e=>e[0]==='result').length,2);
  assert.equal(events.at(-1)[1],null);
});

test('duplicate pending clicks are ignored and obsolete responses cannot update another selection', async () => {
  const pending=[];
  const {events,requests}=harness((selected,{signal})=>new Promise(resolve=>pending.push({selected,signal,resolve})));
  const first=requests.load(song);
  await requests.load(song);
  assert.equal(pending.length,1);
  const other={...song,id:'other'};
  const second=requests.load(other);
  assert.equal(pending[0].signal.aborted,true);
  pending[0].resolve(track());await first;
  assert.equal(events.some(e=>e[0]==='result'),false);
  pending[1].resolve(track());await second;
  assert.deepEqual(events.filter(e=>e[0]==='result').map(e=>e[1]),['other']);
});

test('selecting local audio or closing details cancels pending results without an error toast', async () => {
  let resolve;
  const {events,requests}=harness(()=>new Promise(done=>{resolve=done;}));
  const pending=requests.load(song);
  requests.cancel();resolve(track());await pending;
  assert.equal(events.some(e=>e[0]==='result'||e[0]==='message'),false);
  assert.deepEqual(events.at(-1),['busy',null]);
});

test('missing or failed preview clears an obsolete cached link and remains retryable', async () => {
  let attempts=0;
  const {events,requests}=harness(async()=>{attempts++;if(attempts===1)throw new Error('network');return attempts===2?null:track();});
  for(let i=0;i<3;i++)await requests.load(song,{type:'preview'});
  assert.deepEqual(events.filter(e=>e[0]==='result').map(e=>e[2]),[null,null,track()]);
  assert.equal(attempts,3);
  assert.equal(events.filter(e=>e[0]==='busy'&&e[1]===null).length,3);
});
