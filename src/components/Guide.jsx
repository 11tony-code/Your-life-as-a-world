import React, {useEffect,useState,useRef} from 'react';
import { Sparkles, ArrowUp, ChevronDown, Radio } from 'lucide-react';
import {localGuide} from '../data/engine.js';

export default function Guide({world,memories,onNavigate,onNotice}) {
  const [query,setQuery]=useState(''),[reply,setReply]=useState(null),[busy,setBusy]=useState(false),[online,setOnline]=useState(false),[health,setHealth]=useState({aiConfigured:false}),[expanded,setExpanded]=useState(()=>innerWidth>760);
  const generation=useRef(0);
  useEffect(()=>{generation.current++;setReply(null);setQuery('');setBusy(false);},[world]);
  useEffect(()=>{let active=true;fetch('./api/health').then(r=>r.ok?r.json():{}).then(data=>{if(active)setHealth(data);}).catch(()=>{});return()=>{active=false;};},[]);
  async function submit(value=query){
    if(busy||!value.trim())return;const version=generation.current;setBusy(true);setQuery('');setExpanded(true);
    let answer=localGuide(value,world,memories),failure=false;
    if(online){
      const target=answer.target||{};
      const relevant=target.artist?world.songs.filter(s=>s.artist===target.artist):target.year?world.songs.filter(s=>s.year===target.year):target.song?[world.byId.get(target.song)]:[];
      const records=[...new Map([...relevant.slice(0,35),...world.sorted.slice(0,15),...world.chapters.map(c=>c.songs[0])].filter(Boolean).map(s=>[s.id,s])).values()].slice(0,60).map(({id,title,artist,genre,play_count,last_played,year})=>({id,title,artist,genre,play_count,last_played,year}));
      try{const r=await fetch('./api/guide',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:value,facts:{records,years:world.years,cutoff:world.referenceDate,totalSongs:world.songs.length,totalPlays:world.totalPlays,twins:world.twins.length,chapters:world.chapters.map(({year,genre,count,plays})=>({year,genre,count,plays}))}}),signal:AbortSignal.timeout(25000)});if(!r.ok)throw new Error('offline');answer=await r.json();}catch{failure=true;}
    }
    if(version!==generation.current)return;
    setReply({...answer,query:value,failure});setBusy(false);if(Object.keys(answer.target||{}).length)onNavigate(answer.target);onNotice?.('');
  }
  return <section className={`guide glass ${expanded?'':'guide-folded'}`} aria-label="回声向导">
    <div className="guide-header"><span><Sparkles size={15}/><b>回声向导</b><small>{online?'在线 AI':'本地导览'}</small></span><button className="icon-button" aria-label={expanded?'收起向导':'展开向导'} onClick={()=>setExpanded(!expanded)}><ChevronDown size={15} className={expanded?'':'flipped'}/></button></div>
    {expanded&&<><p className="guide-intro">给我一段线索，带你找回一片回声。</p>
    {reply&&<div className="guide-answer" aria-live="polite"><div className="guide-question">{reply.query}</div><p>{reply.text}</p><small>{reply.failure?'在线暂不可用 · 已切换本地导览':reply.source==='ai'?'AI 生成 · 依据歌单摘要':'本地匹配 · 可核验数据'}</small>{reply.evidence?.length>0&&<details><summary>查看依据</summary><ul>{reply.evidence.map((e,i)=><li key={i}>{e}</li>)}</ul></details>}</div>}
    <form onSubmit={e=>{e.preventDefault();submit();}} className="guide-input"><input aria-label="向导问题" value={query} onChange={e=>setQuery(e.target.value)} placeholder="带我去 Radiohead 的两个时空…" maxLength={500}/><button aria-label="发送导览问题" disabled={busy||!query.trim()} type="submit"><ArrowUp size={17}/></button></form>
    {busy&&<div role="status" className="guide-working">正在寻找回声…</div>}
    <div className="guide-suggestions">{['最高地标','跨海大桥','旧日回声'].map(q=><button disabled={busy} key={q} onClick={()=>submit(q)}>{q}</button>)}</div>
    {health.aiConfigured&&<label className="online-choice"><input type="checkbox" checked={online} onChange={e=>setOnline(e.target.checked)}/><Radio size={12}/>使用在线 AI <small>将问题和歌单摘要发给模型服务</small></label>}
    </>}
  </section>;
}
