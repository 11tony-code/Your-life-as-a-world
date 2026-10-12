const PREFIX='echo-atlas-v1:';
export function readStore(key,fallback) {try{return JSON.parse(localStorage.getItem(PREFIX+key))??fallback;}catch{return fallback;}}
export function writeStore(key,value) {try{localStorage.setItem(PREFIX+key,JSON.stringify(value));return true;}catch{return false;}}
export function download(filename,content,type) {
  const blob=content instanceof Blob?content:new Blob([content],{type});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
}
export function csvFor(songs) {
  const cell=value=>'"'+String(value).replaceAll('"','""')+'"';
  return '\uFEFFtitle,artist,genre,play_count,last_played\r\n'+songs.map(s=>[s.title,s.artist,s.genre,s.play_count,s.last_played].map(cell).join(',')).join('\r\n');
}
export function exportPostcard(world,memories) {
  const canvas=document.createElement('canvas');canvas.width=2000;canvas.height=1360;const c=canvas.getContext('2d');
  c.fillStyle='#080f1b';c.fillRect(0,0,2000,1360);
  const haze=c.createRadialGradient(1000,650,50,1000,650,850);haze.addColorStop(0,'#142538');haze.addColorStop(1,'#080f1b');c.fillStyle=haze;c.fillRect(0,0,2000,1360);
  c.font='500 23px Arial';c.fillStyle='#83b9ad';c.fillText('E C H O   A T L A S',110,100);
  c.fillStyle='#e5e8eb';c.font='500 52px "Microsoft YaHei", sans-serif';c.fillText('那些听过的歌，后来成了你的世界。',110,178);
  c.font='22px "Microsoft YaHei", sans-serif';c.fillStyle='#8090a7';c.fillText(`${world.songs.length} 首歌   /   ${world.artists} 位艺人   /   ${world.totalPlays.toLocaleString()} 次累计回声`,112,228);
  const sx=1.05,sy=.97,ox=1000,oy=770;
  for(const ch of world.chapters){const glow=c.createRadialGradient(ox+ch.center.x*sx,oy+ch.center.y*sy,0,ox+ch.center.x*sx,oy+ch.center.y*sy,210);glow.addColorStop(0,ch.color+'16');glow.addColorStop(1,ch.color+'00');c.fillStyle=glow;c.beginPath();c.arc(ox+ch.center.x*sx,oy+ch.center.y*sy,210,0,Math.PI*2);c.fill();c.strokeStyle=ch.color+'32';c.lineWidth=1;for(let j=0;j<4;j++){c.beginPath();c.ellipse(ox+ch.center.x*sx,oy+ch.center.y*sy,175+j*14,118+j*10,0,0,Math.PI*2);c.stroke();}c.fillStyle=ch.color;c.font='22px "Microsoft YaHei", sans-serif';c.textAlign='center';c.fillText(`${ch.year} · ${ch.name}`,ox+ch.center.x*sx,oy+(ch.center.y-175)*sy);c.font='13px Arial';c.fillStyle='#8190a4';c.fillText(ch.en,ox+ch.center.x*sx,oy+(ch.center.y-151)*sy);}
  for(const b of world.bridges){const a=b.ends[0],z=b.ends.at(-1);c.beginPath();c.moveTo(ox+a.x*sx,oy+a.y*sy);c.bezierCurveTo(ox+(a.x+150)*sx,oy+(a.y-260)*sy,ox+(z.x-150)*sx,oy+(z.y-260)*sy,ox+z.x*sx,oy+z.y*sy);c.strokeStyle='#d9c39190';c.lineWidth=1.5;c.stroke();}
  for(const s of world.songs){c.globalAlpha=.55;c.shadowColor=s.color;c.shadowBlur=16;c.fillStyle=s.color;c.beginPath();c.arc(ox+s.x*sx,oy+s.y*sy,s.radius*.7,0,Math.PI*2);c.fill();if(memories[s.id]?.favorite){c.globalAlpha=.9;c.shadowBlur=0;c.strokeStyle='#f3d8a0';c.beginPath();c.arc(ox+s.x*sx,oy+s.y*sy,s.radius+4,0,Math.PI*2);c.stroke();}}
  c.globalAlpha=1;c.shadowBlur=0;c.textAlign='left';c.strokeStyle='#273343';c.beginPath();c.moveTo(110,1240);c.lineTo(1890,1240);c.stroke();c.font='17px "Microsoft YaHei", sans-serif';c.fillStyle='#8090a7';c.fillText(`YOUR LIFE AS A WORLD  /  数据截止 ${world.referenceDate}  /  每一个光点是一首歌`,110,1293);c.textAlign='right';c.fillStyle='#a7c5bd';c.fillText('回声群岛',1890,1293);
  canvas.toBlob(blob=>{if(blob)download('echo-atlas-world.png',blob,'image/png');},'image/png');
}
