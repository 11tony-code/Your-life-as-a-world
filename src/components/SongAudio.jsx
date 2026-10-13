import React from 'react';
import {VERSION_LABELS} from '../data/preview-report.js';

export default function SongAudio({audio,song,onError}){
  if(!audio)return <p className="audio-note">查找顺序：原唱 → live → 翻唱。降级会先提示未找到原唱，并标注实际演唱者与依据；无法确认的同名曲目不会自动播放。也可关联本地音频。</p>;
  const remote=audio.type==='preview';
  return <div className="local-audio">
    <dl className="preview-report" aria-label="音频匹配结果">
      <div><dt>目标歌曲</dt><dd>{song.title} / {song.artist}</dd></div>
      <div><dt>找到的版本类型</dt><dd><b className={`preview-version version-${audio.version||'unknown'}`}>{remote?VERSION_LABELS[audio.version]:'无法确认版本（本地关联）'}</b>{remote&&audio.artistName&&<span className="preview-performer">演唱者：{audio.artistName}</span>}</dd></div>
      <div><dt>判定依据</dt><dd>{remote?audio.evidence:'文件由你关联，无法凭文件名确认歌名、艺人或版本。'}</dd></div>
      <div><dt>来源</dt><dd>{remote?(audio.storeUrl?<a href={audio.storeUrl} target="_blank" rel="noreferrer">iTunes Store{audio.storefront?` · ${{HK:'香港',TW:'台湾',US:'美国'}[audio.storefront]}曲库`:''} · {audio.trackName}</a>:'无'):`本机文件 · ${audio.name}`}</dd></div>
      <div className="preview-hint"><dt>给用户的提示语</dt><dd>{remote?audio.hint:'这是你关联的本地音频，无法确认版本；文件仅用于本次会话。'}</dd></div>
    </dl>
    {audio.url&&<>
      {remote&&<div className="preview-store"><a href={audio.storeUrl} target="_blank" rel="noreferrer" aria-label={`在 iTunes Store 查看 ${audio.trackName} — ${audio.artistName}`}><img src={`${import.meta.env.BASE_URL}itunes-store-badge.svg`} alt="Get it on iTunes" width="110"/></a><span>试听片段由 iTunes 提供<br/>provided courtesy of iTunes</span></div>}
      <audio key={`${song.id}:${audio.url}`} controls preload={remote?'none':'metadata'} controlsList={remote?'nodownload':undefined} src={audio.url} onError={onError}/>
      {remote&&<small className="preview-disclosure">短试听用于了解商店曲目。分类依据目录署名与版本标记，未独立核验历史首发身份；具体录音以商店详情为准。</small>}
    </>}
  </div>;
}
