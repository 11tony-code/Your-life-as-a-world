export const VERSION_LABELS={original:'原唱',live:'live',cover:'翻唱',unknown:'未找到（无法确认版本）',not_found:'未找到'};

export function previewHint(song,result){
  const title=String(song.title||''),missing=`未找到目标歌曲《${title}》的原唱音频。`;
  if(result.version==='original')return `已找到目标歌曲《${title}》按目标艺人署名匹配的原唱试听。${/[([【（]\s*(?:live\b|现场)|\s+[-–—]\s+(?:live\b|现场)/iu.test(title)?'歌单带现场标记，本次仍按原唱优先返回；实际音频为录音室条目。':''}`;
  const suffix=result.rateLimited?' 查询过于频繁，请稍后重试。':result.partial?' 部分曲库查询失败，结论仅限本次可核实结果。':'';
  if(result.version==='live')return `${missing}这是《${title}》的 live 版（演唱者：${result.artistName}）。${suffix}`;
  if(result.version==='cover')return `${missing}这是《${title}》的翻唱版（演唱者：${result.artistName}）${result.live?'，曲库同时标注现场版本':''}。${suffix}`;
  if(result.version==='unknown')return `${missing}存在同名候选，但无法确认版本，未提供该音频。${suffix}`;
  return `${missing}${result.reason||'没有找到有依据且提供试听地址的原唱、live 或翻唱版本。'}${suffix}`;
}

export function missingPreview(song,reason){
  const result={type:'preview',version:'not_found',originalFound:false,url:null,storeUrl:null,reason,evidence:reason||'没有可核实的可用试听条目。'};
  return {...result,hint:previewHint(song,result)};
}
