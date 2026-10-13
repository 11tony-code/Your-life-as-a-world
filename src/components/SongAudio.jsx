import React from 'react';

export default function SongAudio({audio, song, onError}) {
  if (!audio) return <p className="audio-note">歌单不含录音。可关联本地音频，或查询同艺人、对应 Live / 录音室版本的商店试听；未匹配时会提示。</p>;
  return <div className="local-audio">
    {audio.type === 'preview' ? <>
      <div className="preview-identity"><b>{audio.trackName}</b><span>{audio.artistName} · {audio.live ? 'Live' : '录音室版本'}</span>{audio.collectionName && <small>{audio.collectionName}</small>}</div>
      <div className="preview-store"><a href={audio.storeUrl} target="_blank" rel="noreferrer" aria-label={`在 iTunes Store 查看 ${audio.trackName} — ${audio.artistName}`}><img src={`${import.meta.env.BASE_URL}itunes-store-badge.svg`} alt="Get it on iTunes" width="110"/></a><span>试听片段由 iTunes 提供<br/>provided courtesy of iTunes</span></div>
      <audio key={`${song.id}:${audio.url}`} controls preload="none" controlsList="nodownload" src={audio.url} onError={onError}/>
      <small className="preview-disclosure">短片段用于了解商店曲目；歌单没有专辑或录音编号，请以商店详情确认具体录音。</small>
    </> : <><span>本次会话 · {audio.name}</span><audio key={`${song.id}:${audio.url}`} controls src={audio.url} onError={onError}/></>}
  </div>;
}
