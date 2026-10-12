import React, { useEffect, useRef } from 'react';
import { dormancy, hash, random } from '../data/engine.js';

export default function World2D(props) {
  const host = useRef(null), current = useRef(props);
  current.current = props;
  useEffect(() => {
    let disposed = false, application, clean = () => {};
    (async () => {
      const { Application, Container, Graphics, Sprite, Texture, Text } = await import('pixi.js');
      if (disposed) return;
      const app = new Application(); application = app;
      await app.init({ preference:'webgl', antialias:true, backgroundAlpha:0, resizeTo:host.current, resolution:Math.min(devicePixelRatio,2), autoDensity:true });
      if (disposed) { app.destroy(true, {children:true,texture:true,textureSource:true}); return; }
      host.current.appendChild(app.canvas);
      app.canvas.setAttribute('aria-label','回声之城音乐地图，拖动平移，滚轮缩放。也可通过街区列表和歌曲列表操作。');
      const {world} = current.current;
      const ocean = new Graphics(); app.stage.addChild(ocean);
      const scene = new Container(); app.stage.addChild(scene);
      const contours = new Graphics(); scene.addChild(contours);
      const routes = new Graphics(); scene.addChild(routes);
      const twinLines = new Graphics(); scene.addChild(twinLines);
      const bridgeLines = new Graphics(); scene.addChild(bridgeLines);
      const points = new Container(); scene.addChild(points);
      const starsCanvas = document.createElement('canvas'); starsCanvas.width=64; starsCanvas.height=64;
      const ctx = starsCanvas.getContext('2d');
      const gradient = ctx.createRadialGradient(32,32,0,32,32,32);
      gradient.addColorStop(0,'rgba(255,255,255,1)'); gradient.addColorStop(.12,'rgba(255,255,255,.5)'); gradient.addColorStop(.4,'rgba(255,255,255,.13)'); gradient.addColorStop(1,'rgba(255,255,255,0)');
      ctx.fillStyle=gradient; ctx.fillRect(0,0,64,64);
      const glowTexture = Texture.from(starsCanvas);
      const markers = new Map(), labels = [], landmarks = [], rings=[];
      const hex = color => parseInt(color.slice(1),16);
      for (const c of world.chapters) {
        const rng = random(hash(c.name));
        for (let level=0;level<5;level++) {
          const xy=[];
          for(let i=0;i<64;i++) { const a=i/64*Math.PI*2, r=158+level*17+Math.sin(a*5+rng())*11+Math.cos(a*3)*13; xy.push(c.center.x+Math.cos(a)*r*1.14,c.center.y+Math.sin(a)*r*.68); }
          contours.poly(xy).fill({color:hex(c.color),alpha:level===0?.022:0}).stroke({color:hex(c.color),alpha:.09-level*.013,width:.7});
        }
        // Roads follow real same-artist relationships, rather than arbitrary proximity.
        const groups = new Map();
        for (const s of c.songs) { if(!groups.has(s.artist))groups.set(s.artist,[]); groups.get(s.artist).push(s); }
        for (const group of groups.values()) {
          const first = group[0];
          for(const s of group.slice(1)) routes.moveTo(first.x,first.y).lineTo(s.x,s.y).stroke({color:hex(c.color),alpha:.11,width:.7});
        }
        const text = new Text({text:`${c.year}  /  ${c.name}`,style:{fontFamily:'"Microsoft YaHei", sans-serif',fontSize:18,fontWeight:'500',letterSpacing:2,fill:hex(c.color)}});
        text.anchor.set(.5); text.position.set(c.center.x,c.center.y-165); scene.addChild(text); labels.push({text,c,offsetY:-165});
        const sub = new Text({text:`${c.en}  ·  ${c.count} TRACKS`,style:{fontFamily:'Arial',fontSize:10,letterSpacing:2,fill:0x6e7f98}});
        sub.anchor.set(.5); sub.position.set(c.center.x,c.center.y-140); scene.addChild(sub); labels.push({text:sub,c,offsetY:-140});
        const beacon=[...c.songs].sort((a,b)=>b.play_count-a.play_count)[0];
        const title=new Text({text:beacon.title.length>25?beacon.title.slice(0,24)+'…':beacon.title,style:{fontFamily:'Arial, "Microsoft YaHei", sans-serif',fontSize:11,fill:0xbdc7d8}});
        title.anchor.set(.5,0); title.position.set(beacon.x,beacon.y+16); scene.addChild(title); landmarks.push({title,song:beacon});
      }
      for(const t of world.twins) {
        twinLines.moveTo(t.studio.x,t.studio.y).lineTo(t.live.x,t.live.y).stroke({color:hex(t.studio.color),alpha:.2,width:.8});
      }
      for(const b of world.bridges) {
        for(let i=1;i<b.ends.length;i++) {
          const a=b.ends[i-1],z=b.ends[i];
          bridgeLines.moveTo(a.x,a.y).bezierCurveTo(a.x+180,a.y-260,z.x-180,z.y-260,z.x,z.y).stroke({color:0xe0c999,alpha:.55,width:1.4});
          const text = new Text({text:`${b.artist}  /  TIME BRIDGE`,style:{fontFamily:'Arial',fontSize:10,letterSpacing:1.5,fill:0xb8a882}});
          text.anchor.set(.5);text.position.set((a.x+z.x)/2,(a.y+z.y)/2-130);scene.addChild(text);labels.push({text,bridge:true,years:b.years});
        }
      }
      for(const s of world.songs) {
        const glow=new Sprite(glowTexture);glow.anchor.set(.5);glow.position.set(s.x,s.y);glow.tint=hex(s.color);glow.width=glow.height=s.radius*10;points.addChild(glow);
        const dot=new Graphics().circle(0,0,s.radius).fill(hex(s.color));dot.position.set(s.x,s.y);points.addChild(dot);
        const core=new Graphics().circle(0,0,Math.max(1,s.radius*.3)).fill(0xf0f1eb);core.position.set(s.x,s.y);points.addChild(core);
        if(s.play_count>=world.maxPlay*.86) {const ring=new Graphics().circle(0,0,s.radius+7).stroke({color:hex(s.color),width:.8,alpha:.5});ring.position.set(s.x,s.y);points.addChild(ring);rings.push({ring,s});}
        markers.set(s.id,{glow,dot,core,s});
      }
      const selection=new Graphics();scene.addChild(selection);
      const centerMark=new Graphics(); scene.addChild(centerMark);
      centerMark.circle(0,0,21).stroke({color:0x8396ac,width:1,alpha:.22}).moveTo(-34,0).lineTo(34,0).moveTo(0,-34).lineTo(0,34).stroke({color:0x8396ac,width:1,alpha:.22});
      let width=0,height=0, camera={x:0,y:0,scale:1}, dest={...camera}, activeFocus='', lastFlags='', lastHovered='', down=null, dragged=false, pointers=new Map(), pinch=null;
      const safe = () => { const mobile=width<760; return {cx: mobile?width/2:(width-45)/2,cy:height*.49,scale:Math.min((width-(mobile?35:540))/1560,(height-(mobile?320:300))/1060)}; };
      const reset=()=>{const p=safe();dest={x:p.cx,y:p.cy,scale:Math.max(.18,p.scale)};};
      const toWorld=(x,y)=>({x:(x-camera.x)/camera.scale,y:(y-camera.y)/camera.scale});
      const hit=(x,y)=>{
        const at=toWorld(x,y);let found=null,best=Infinity;
        for(const s of world.songs){if(s.year>current.current.timeTo)continue;const d=Math.hypot(s.x-at.x,s.y-at.y);if(d<Math.max(s.radius+4,10/camera.scale)&&d<best){best=d;found=s;}}
        return found;
      };
      const coords=e=>{const r=app.canvas.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};};
      const move=e=>{const p=coords(e);if(pointers.has(e.pointerId))pointers.set(e.pointerId,p);if(pointers.size===2){const [a,b]=[...pointers.values()];const distance=Math.hypot(a.x-b.x,a.y-b.y);if(pinch){const next=Math.max(.18,Math.min(4,pinch.scale*distance/pinch.distance));dest.scale=next;dest.x=(a.x+b.x)/2-pinch.world.x*next;dest.y=(a.y+b.y)/2-pinch.world.y*next;}dragged=true;return;}if(down){const dx=p.x-down.x,dy=p.y-down.y;if(Math.hypot(dx,dy)>4)dragged=true;dest.x=down.camX+dx;dest.y=down.camY+dy;camera.x=dest.x;camera.y=dest.y;}else{const s=hit(p.x,p.y);if(s?.id!==lastHovered){lastHovered=s?.id;current.current.onHover?.(s?{song:s,x:p.x,y:p.y}:null);}app.canvas.style.cursor=s?'pointer':'grab';}};
      const press=e=>{const p=coords(e);pointers.set(e.pointerId,p);down={...p,camX:camera.x,camY:camera.y};dragged=false;app.canvas.setPointerCapture(e.pointerId);if(pointers.size===2){const[a,b]=[...pointers.values()];pinch={distance:Math.hypot(a.x-b.x,a.y-b.y),scale:camera.scale,world:toWorld((a.x+b.x)/2,(a.y+b.y)/2)};}current.current.onHover?.(null);};
      const release=e=>{const p=coords(e);if(!dragged&&down){const s=hit(p.x,p.y);if(s)current.current.onSelect(s.id);else current.current.onBlank?.();}pointers.delete(e.pointerId);down=null;pinch=null;};
      const wheel=e=>{e.preventDefault();const p=coords(e),at=toWorld(p.x,p.y),next=Math.max(.18,Math.min(4,dest.scale*Math.exp(-e.deltaY*.0015)));dest={x:p.x-at.x*next,y:p.y-at.y*next,scale:next};};
      const cancel=()=>{down=null;pointers.clear();pinch=null;};
      app.canvas.addEventListener('pointerdown',press);app.canvas.addEventListener('pointermove',move);app.canvas.addEventListener('pointerup',release);app.canvas.addEventListener('pointercancel',cancel);app.canvas.addEventListener('pointerleave',()=>current.current.onHover?.(null));app.canvas.addEventListener('wheel',wheel,{passive:false});
      current.current.onReady?.({zoom:factor=>{dest.scale=Math.min(4,Math.max(.18,dest.scale*factor));},reset});
      app.ticker.add(ticker=>{
        if(disposed)return;
        const p=current.current;
        if(width!==app.screen.width||height!==app.screen.height){width=app.screen.width;height=app.screen.height;reset();camera={...dest};ocean.clear();const rng=random(177);for(let i=0;i<150;i++)ocean.circle(rng()*width,rng()*height,rng()>.93?1.2:.55).fill({color:0xa8b5d0,alpha:rng()*.25+.04});}
        if(p.focus?.key!==activeFocus){activeFocus=p.focus?.key;const target=p.focus?.target||{};let list=target.song?[world.byId.get(target.song)]:target.artist?world.songs.filter(s=>s.artist===target.artist):target.year?world.songs.filter(s=>s.year===target.year):target.ids?target.ids.map(id=>world.byId.get(id)):[];list=list.filter(Boolean);if(!list.length)reset();else{const x=list.reduce((n,s)=>n+s.x,0)/list.length,y=list.reduce((n,s)=>n+s.y,0)/list.length;const bounds=Math.max(120,...list.map(s=>Math.hypot(s.x-x,s.y-y)*2));const safeWidth=width-(width<760?30:610);dest={x:(width-80)/2-x*Math.min(2.2,safeWidth/bounds),y:height*(target.song?.30:.47)-y*Math.min(2.2,safeWidth/bounds),scale:Math.max(.3,Math.min(2.2,safeWidth/bounds))};}}
        const flags=`${p.timeTo}|${p.referenceDate}|${p.focus?.key}|${p.layers.twins}|${p.layers.bridges}|${p.layers.labels}|${p.highlightIds?.join(',')}`;
        if(flags!==lastFlags){lastFlags=flags;const chosen=new Set(p.highlightIds||[]);selection.clear();for(const {glow,dot,core,s} of markers.values()){const exists=s.year<=p.timeTo,dim=chosen.size&&!chosen.has(s.id),light=dormancy(s,p.referenceDate).brightness;dot.visible=glow.visible=core.visible=exists;dot.alpha=exists?(dim?.14:light):0;glow.alpha=dim?.04:.46*light;core.alpha=dim?.18:.8;if(chosen.has(s.id)&&exists)selection.circle(s.x,s.y,s.radius+11).stroke({color:0xf4dfaa,width:1.7,alpha:.9});}
          twinLines.clear();for(const t of world.twins)if(t.studio.year<=p.timeTo&&t.live.year<=p.timeTo)twinLines.moveTo(t.studio.x,t.studio.y).lineTo(t.live.x,t.live.y).stroke({color:hex(t.studio.color),alpha:.2,width:.8});
          bridgeLines.clear();for(const b of world.bridges)for(let i=1;i<b.ends.length;i++){const a=b.ends[i-1],z=b.ends[i];if(a.year<=p.timeTo&&z.year<=p.timeTo)bridgeLines.moveTo(a.x,a.y).bezierCurveTo(a.x+180,a.y-260,z.x-180,z.y-260,z.x,z.y).stroke({color:0xe0c999,alpha:.55,width:1.4});}
          twinLines.visible=p.layers.twins;bridgeLines.visible=p.layers.bridges;labels.forEach(o=>o.text.visible=p.layers.labels&&(o.bridge?p.layers.bridges&&o.years.every(y=>y<=p.timeTo):o.c.year<=p.timeTo));landmarks.forEach(o=>o.title.visible=p.layers.labels&&o.song.year<=p.timeTo);}
        const ease=p.reducedMotion?1:Math.min(.2,.07*ticker.deltaTime);camera.x+=(dest.x-camera.x)*ease;camera.y+=(dest.y-camera.y)*ease;camera.scale+=(dest.scale-camera.scale)*ease;scene.position.set(camera.x,camera.y);scene.scale.set(camera.scale);
        const tick=performance.now()/1000;for(const {ring,s}of rings){ring.visible=s.year<=p.timeTo;ring.alpha=p.reducedMotion?.45:.3+Math.sin(tick*1.5+s.x)*.18;const v=p.reducedMotion?1:1+Math.sin(tick*1.5+s.x)*.09;ring.scale.set(v);}
        for(const o of labels){
          o.text.scale.set(Math.max(1,(width<760?.58:.75)/camera.scale));
          if(o.c){o.text.position.set(o.c.center.x,o.c.center.y+o.offsetY);if(width<760){const half=o.text.width*camera.scale/2,at=camera.x+o.text.x*camera.scale;const clamped=Math.max(12+half,Math.min(width-12-half,at));o.text.x=(clamped-camera.x)/camera.scale;}}
        }
        for(const o of landmarks)o.title.scale.set(Math.max(1,.7/camera.scale));
      });
      clean=()=>{app.canvas.removeEventListener('pointerdown',press);app.canvas.removeEventListener('pointermove',move);app.canvas.removeEventListener('pointerup',release);app.canvas.removeEventListener('pointercancel',cancel);app.canvas.removeEventListener('wheel',wheel);app.destroy(true,{children:true,texture:true,textureSource:true});};
    })().catch(error=>{if(!disposed)current.current.onError?.(error.message);});
    return()=>{disposed=true;clean();};
  },[props.world]);
  return <div className="world-canvas" ref={host} />;
}
