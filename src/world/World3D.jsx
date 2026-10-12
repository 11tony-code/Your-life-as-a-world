import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { dormancy } from '../data/engine.js';

export default function World3D(props) {
  const host=useRef(null), labels=useRef([]), current=useRef(props);current.current=props;
  useEffect(()=>{
    const world=props.world, element=host.current;
    let renderer;
    try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});}catch(e){props.onError?.('当前设备无法开启 3D，可以继续使用二维地图。');return;}
    renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.setClearColor(0x080e19,0);renderer.outputColorSpace=THREE.SRGBColorSpace;
    element.appendChild(renderer.domElement);renderer.domElement.setAttribute('aria-label','三维音乐群岛，拖动旋转，滚轮缩放，点击岛屿查看歌曲。');
    const scene=new THREE.Scene();scene.fog=new THREE.Fog(0x080e19,150,350);
    const overviewZoom=()=>Math.max(.22,Math.min(.85,(element.clientWidth-(element.clientWidth<760?30:420))/Math.max(element.clientHeight,1)*.75));
    const camera=new THREE.OrthographicCamera(-95,95,60,-60,.1,600);camera.position.set(78,105,110);camera.zoom=overviewZoom();
    const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.075;controls.minZoom=.2;controls.maxZoom=8;controls.maxPolarAngle=Math.PI*.43;controls.minPolarAngle=.2;controls.enablePan=true;
    scene.add(new THREE.HemisphereLight(0xd6e9ed,0x223144,2.4));
    const key=new THREE.DirectionalLight(0xffead1,3.5);key.position.set(-30,70,20);scene.add(key);
    const rim=new THREE.DirectionalLight(0x8fa9dc,1.8);rim.position.set(55,30,-60);scene.add(rim);
    const ocean=new THREE.Mesh(new THREE.PlaneGeometry(900,900),new THREE.MeshStandardMaterial({color:0x091728,roughness:.8,metalness:.15,transparent:true,opacity:.5}));ocean.rotation.x=-Math.PI/2;ocean.position.y=-.48;scene.add(ocean);
    const grid=new THREE.GridHelper(270,54,0x345367,0x203648);grid.position.y=-.465;grid.material.transparent=true;grid.material.opacity=.045;scene.add(grid);
    const meshes=[],shelves=[],bridges=new THREE.Group(),twins=new THREE.Group(),highlights=new THREE.Group();scene.add(bridges,twins,highlights);
    const dummy=new THREE.Object3D(),tempColor=new THREE.Color(),dark=new THREE.Color(0x121e2a);
    const geometries=[],materials=[];
    const mat=(options)=>{const m=new THREE.MeshStandardMaterial({flatShading:true,roughness:.85,...options});materials.push(m);return m;};
    const geometry=g=>{geometries.push(g);return g;};
    for(const c of world.chapters){
      const shelf=new THREE.Mesh(geometry(new THREE.CircleGeometry(21,48)),new THREE.MeshBasicMaterial({color:c.color,transparent:true,opacity:.035,side:THREE.DoubleSide,depthWrite:false}));shelf.rotation.x=-Math.PI/2;shelf.position.set(c.center.x*.1,-.47,c.center.y*.1);shelf.scale.y=.75;scene.add(shelf);shelves.push({shelf,c});
      const base=new THREE.InstancedMesh(geometry(new THREE.CylinderGeometry(1,.72,1,7,1)),mat({color:0xffffff}),c.count);
      const topGeo=c.terrain==='rock'?new THREE.ConeGeometry(.98,2,5):c.terrain==='bay'?new THREE.SphereGeometry(1,7,4,0,Math.PI*2,0,Math.PI*.5):c.terrain==='neon'?new THREE.ConeGeometry(.95,.95,4):new THREE.ConeGeometry(1,.8,7);
      const top=new THREE.InstancedMesh(geometry(topGeo),mat({color:0xffffff}),c.count);
      base.userData.songs=top.userData.songs=c.songs;
      c.songs.forEach((s,i)=>{
        const r=s.islandRadius*.105,height=.3+Math.sqrt(s.play_count/world.maxPlay)*.65;
        dummy.position.set(s.x*.1,height*.5-.55,s.y*.1);dummy.rotation.set(0,(s.x%5)*.4,0);dummy.scale.set(r,height,r);dummy.updateMatrix();base.setMatrixAt(i,dummy.matrix);
        const rise=c.terrain==='rock'?1.2:c.terrain==='city'?.5:.8;
        dummy.position.y=height-.55+rise*.35*r;dummy.scale.set(r,r*rise,r);dummy.updateMatrix();top.setMatrixAt(i,dummy.matrix);
        base.setColorAt(i,new THREE.Color(c.color).multiplyScalar(.5));top.setColorAt(i,new THREE.Color(c.color));
      });base.instanceMatrix.needsUpdate=top.instanceMatrix.needsUpdate=true;scene.add(base,top);meshes.push({base,top,c});
      // Each regional landmark gets a small lighthouse made entirely from geometry.
      const s=[...c.songs].sort((a,b)=>b.play_count-a.play_count)[0];
      const r=s.islandRadius*.105,rise=c.terrain==='rock'?1.2:c.terrain==='city'?.5:.8;
      const peak=.3+Math.sqrt(s.play_count/world.maxPlay)*.65-.55+rise*r*(c.terrain==='rock'?1.35:c.terrain==='bay'?1.35:.75);
      const tower=new THREE.Mesh(geometry(new THREE.CylinderGeometry(.09,.16,1.2,5)),mat({color:0xe3dccc}));tower.position.set(s.x*.1,peak+.6,s.y*.1);scene.add(tower);
      const lamp=new THREE.Mesh(geometry(new THREE.OctahedronGeometry(.2)),new THREE.MeshBasicMaterial({color:c.color}));lamp.position.set(s.x*.1,peak+1.32,s.y*.1);scene.add(lamp);shelves.push({shelf:tower,c});shelves.push({shelf:lamp,c});
    }
    for(const b of world.bridges){for(let i=1;i<b.ends.length;i++){const a=b.ends[i-1],z=b.ends[i];const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(a.x*.1,3,a.y*.1),new THREE.Vector3((a.x+z.x)*.05,11,(a.y+z.y)*.05),new THREE.Vector3(z.x*.1,3,z.y*.1)]);const mesh=new THREE.Mesh(geometry(new THREE.TubeGeometry(curve,64,.095,5,false)),new THREE.MeshBasicMaterial({color:0xe4ce9d,transparent:true,opacity:.85}));mesh.userData.years=[a.year,z.year];bridges.add(mesh);}}
    for(const t of world.twins){const g=geometry(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(t.studio.x*.1,.15,t.studio.y*.1),new THREE.Vector3(t.live.x*.1,.15,t.live.y*.1)]));const line=new THREE.Line(g,new THREE.LineBasicMaterial({color:t.studio.color,transparent:true,opacity:.2}));line.userData.years=[t.studio.year,t.live.year];twins.add(line);}
    const ringGeo=geometry(new THREE.RingGeometry(1,1.12,36));
    const ringMat=new THREE.MeshBasicMaterial({color:0xf3dcab,side:THREE.DoubleSide,transparent:true,opacity:.9});materials.push(ringMat);
    const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();let down=null,moved=false,frame,disposed=false,lastFocus='',flags='',transition=null;
    const getHit=e=>{const r=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(pointer,camera);const hits=raycaster.intersectObjects(meshes.flatMap(m=>[m.base,m.top]));return hits.map(h=>h.object.userData.songs[h.instanceId]).find(s=>s&&s.year<=current.current.timeTo);};
    const press=e=>{down={x:e.clientX,y:e.clientY};moved=false;transition=null;};
    const move=e=>{if(down&&Math.hypot(e.clientX-down.x,e.clientY-down.y)>5)moved=true;if(!down){const s=getHit(e),r=renderer.domElement.getBoundingClientRect();current.current.onHover?.(s?{song:s,x:e.clientX-r.left,y:e.clientY-r.top}:null);renderer.domElement.style.cursor=s?'pointer':'grab';}};
    const release=e=>{if(down&&!moved){const s=getHit(e);if(s)current.current.onSelect(s.id);else current.current.onBlank?.();}down=null;};
    renderer.domElement.addEventListener('pointerdown',press);renderer.domElement.addEventListener('pointermove',move);renderer.domElement.addEventListener('pointerup',release);
    renderer.domElement.addEventListener('pointerleave',()=>current.current.onHover?.(null));
    const resize=()=>{const {width,height}=element.getBoundingClientRect();renderer.setSize(width,height);camera.left=-60*width/height;camera.right=60*width/height;camera.top=60;camera.bottom=-60;const t=current.current.focus?.target||{};if(!t.song&&!t.artist&&!t.year&&!t.ids){camera.zoom=overviewZoom();transition=null;}camera.updateProjectionMatrix();};const observer=new ResizeObserver(resize);observer.observe(element);resize();
    current.current.onReady?.({zoom:factor=>{camera.zoom=THREE.MathUtils.clamp(camera.zoom*factor,.2,8);camera.updateProjectionMatrix();},reset:()=>{transition={target:new THREE.Vector3(0,0,0),zoom:overviewZoom()};}});
    const projected=new THREE.Vector3(),matrix=new THREE.Matrix4();
    const animate=()=>{
      if(disposed)return;frame=requestAnimationFrame(animate);const p=current.current;
      if(p.focus?.key!==lastFocus){
        lastFocus=p.focus?.key;const t=p.focus?.target||{};let list=t.song?[world.byId.get(t.song)]:t.artist?world.songs.filter(s=>s.artist===t.artist):t.year?world.songs.filter(s=>s.year===t.year):t.ids?t.ids.map(id=>world.byId.get(id)):[];list=list.filter(Boolean);
        const target=new THREE.Vector3();let zoom=overviewZoom();
        if(list.length){target.x=list.reduce((n,s)=>n+s.x,0)/list.length*.1;target.z=list.reduce((n,s)=>n+s.y,0)/list.length*.1;if(t.song)target.y=-7;
          const diameter=Math.max(8,...list.map(s=>Math.hypot(s.x*.1-target.x,s.y*.1-target.z)*2));
          const safeWidth=element.clientWidth-(element.clientWidth<760?30:580);
          zoom=Math.max(.22,Math.min(list.length===1?3.8:t.artist?2:t.year?2.1:1.5,120*safeWidth/element.clientHeight/diameter));
        }transition={target,zoom};
      }
      if(transition){const delta=new THREE.Vector3().subVectors(transition.target,controls.target).multiplyScalar(p.reducedMotion?1:.075);controls.target.add(delta);camera.position.add(delta);camera.zoom+=(transition.zoom-camera.zoom)*(p.reducedMotion?1:.075);camera.updateProjectionMatrix();if(delta.length()<.015&&Math.abs(camera.zoom-transition.zoom)<.01)transition=null;}
      const next=`${p.timeTo}|${p.referenceDate}|${p.layers.twins}|${p.layers.bridges}|${p.highlightIds?.join(',')}`;
      if(flags!==next){
        flags=next;const chosen=new Set(p.highlightIds||[]);
        while(highlights.children.length)highlights.remove(highlights.children[0]);
        for(const m of meshes){
          m.c.songs.forEach((s,i)=>{
            const d=dormancy(s,p.referenceDate).brightness,dim=chosen.size&&!chosen.has(s.id);
            tempColor.set(s.color).lerp(dark,dim?.86:1-d*.8);
            m.top.setColorAt(i,tempColor);m.base.setColorAt(i,tempColor.clone().multiplyScalar(.48));
            const exists=s.year<=p.timeTo,r=s.islandRadius*.105,h=.3+Math.sqrt(s.play_count/world.maxPlay)*.65;
            dummy.position.set(s.x*.1,h*.5-.55,s.y*.1);dummy.rotation.set(0,(s.x%5)*.4,0);dummy.scale.set(exists?r:0,exists?h:0,exists?r:0);dummy.updateMatrix();m.base.setMatrixAt(i,dummy.matrix);
            const rise=m.c.terrain==='rock'?1.2:m.c.terrain==='city'?.5:.8;
            dummy.position.y=h-.55+rise*.35*r;dummy.scale.set(exists?r:0,exists?r*rise:0,exists?r:0);dummy.updateMatrix();m.top.setMatrixAt(i,dummy.matrix);
            if(chosen.has(s.id)&&exists){const ring=new THREE.Mesh(ringGeo,ringMat);ring.rotation.x=-Math.PI/2;ring.position.set(s.x*.1,h+.1,s.y*.1);ring.scale.setScalar(r*1.8);highlights.add(ring);}
          });
          m.base.instanceColor.needsUpdate=m.top.instanceColor.needsUpdate=true;m.base.instanceMatrix.needsUpdate=m.top.instanceMatrix.needsUpdate=true;
        }
        shelves.forEach(o=>o.shelf.visible=o.c.year<=p.timeTo);twins.visible=p.layers.twins;bridges.visible=p.layers.bridges;
        twins.children.forEach(o=>o.visible=o.userData.years.every(y=>y<=p.timeTo));bridges.children.forEach(o=>o.visible=o.userData.years.every(y=>y<=p.timeTo));
      }
      controls.update();renderer.render(scene,camera);
      world.chapters.forEach((c,i)=>{const el=labels.current[i];if(!el)return;projected.set(c.center.x*.1,9,c.center.y*.1-14).project(camera);el.style.transform=`translate(${(projected.x+1)/2*element.clientWidth}px,${(-projected.y+1)/2*element.clientHeight}px) translate(-50%,-50%)`;el.style.opacity=p.layers.labels&&c.year<=p.timeTo?'1':'0';el.style.pointerEvents=p.layers.labels&&c.year<=p.timeTo?'auto':'none';});
    };animate();
    return()=>{disposed=true;cancelAnimationFrame(frame);observer.disconnect();controls.dispose();renderer.domElement.removeEventListener('pointerdown',press);renderer.domElement.removeEventListener('pointermove',move);renderer.domElement.removeEventListener('pointerup',release);scene.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){const materials=Array.isArray(o.material)?o.material:[o.material];materials.forEach(m=>m.dispose());}});renderer.dispose();renderer.domElement.remove();};
  },[props.world]);
  return <div className="world-canvas" ref={host}><div className="labels-3d">{props.world.chapters.map((c,i)=><button key={c.year} ref={el=>labels.current[i]=el} style={{color:c.color}} onClick={()=>props.onChapter?.(c.year)}><span>{c.year} / {c.name}</span><small>{c.en}</small></button>)}</div></div>;
}
