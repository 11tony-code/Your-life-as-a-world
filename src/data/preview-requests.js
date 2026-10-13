import {missingPreview,previewHint} from './preview-report.js';

// Catalog dictionaries load only after the user requests a preview.
const lookupPreview=async(...args)=>(await import('./preview.js')).fetchPreview(...args);
export function createPreviewRequests({lookup=lookupPreview,onBusy,onResult,onMessage}){
  let active=null;
  function cancel(){const previous=active;active=null;previous?.controller.abort();if(previous)onBusy(null);}
  return {cancel,async load(song,currentAudio,{excludedURLs=[]}={}){
    if(!song||currentAudio?.type==='local'||active?.id===song.id)return;
    cancel();const request={id:song.id,controller:new AbortController()};active=request;onBusy(song.id);
    try{
      let result=await lookup(song,{signal:request.controller.signal,excludedURLs});
      if(active!==request)return;
      result=result||missingPreview(song);if(result.rateLimited)result={...result,hint:previewHint(song,result)};
      onResult(song.id,result);onMessage(result.hint);
    }catch(error){
      if(active!==request)return;
      const result=missingPreview(song,error.name==='TimeoutError'?'查询超时，无法确认未完成查询的曲库。请重试或关联本地音频。':'曲库请求失败，无法确认版本。请重试或关联本地音频。');
      onResult(song.id,result);onMessage(result.hint);
    }finally{if(active===request){active=null;onBusy(null);}}
  }};
}
