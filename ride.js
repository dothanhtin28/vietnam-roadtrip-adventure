(() => {
'use strict';
const W=1000,H=500,END=6550;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const mix=(a,b,t)=>a+(b-a)*t;
const smooth=t=>t*t*(3-2*t);
const terrain=[
 [0,370],[500,366],[1000,370],[1500,367],[1850,372],[2160,364],[2490,299],[2680,279],
 [2920,311],[3190,345],[3430,335],[3690,261],[3950,268],[4240,317],[4450,316],[4740,235],
 [4960,206],[5200,241],[5480,265],[5740,196],[6030,176],[6240,198],[6550,182],[7200,182],
];
function ground(x) {
 for(let i=1;i<terrain.length;i++) {
  const [ax,ay]=terrain[i-1], [bx,by]=terrain[i];
  if(x<=bx)return mix(ay,by,smooth(clamp((x-ax)/(bx-ax),0,1)));
 }
 return terrain.at(-1)[1];
}
const zones=[
 {x:0,name:'Đồng bằng',note:'Lúa chín bên bờ sông',sky:'#80b4a9',light:'#f2dba2',back:'#88a793',middle:'#638c66',front:'#80994c',grass:'#597a39'},
 {x:2150,name:'Đồi chè',note:'Gió chạy qua những luống chè',sky:'#7baba3',light:'#f4dfa4',back:'#88a79a',middle:'#4f866c',front:'#638947',grass:'#3d6f46'},
 {x:4450,name:'Đèo đá',note:'Mây trôi dưới chân đèo',sky:'#728f9f',light:'#f0c99b',back:'#82999b',middle:'#4d6b73',front:'#55725b',grass:'#435d50'}
];
const zone=x=>x>=4450?2:x>=2150?1:0;
const mud=[[1120,1370],[3160,3350]];
const blocks=[{x:1760,w:37,h:22,kind:'log'},{x:2820,w:33,h:23,kind:'rock'},{x:4030,w:39,h:26,kind:'log'},{x:4900,w:41,h:28,kind:'rock'},{x:5570,w:48,h:31,kind:'rock'}];
const views=[{x:760,name:'Cánh đồng bên sông'},{x:3610,name:'Đồi chè trong gió'},{x:6060,name:'Biển mây trên đèo'}];
const startX=120, fresh=()=>({x:startX,y:ground(startX),vx:0,vy:0,bike:false,face:1,air:false,phase:0,photos:[],finished:false,bump:0});
let p=fresh(),cam=0, dust=[], running=false, last=0,at=0,toast='',until=0,flash=0,frame=0;
const held=new Set(), pointers=new Map(), reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const $=s=>document.querySelector(s), canvas=$('#world'), ctx=canvas.getContext('2d');
const right=()=>held.has('right')||[...pointers.values()].includes('right');
const left=()=>held.has('left')||[...pointers.values()].includes('left');
function say(t,seconds=2.4){toast=t;until=at+seconds;syncHud();}
function getView(){return views.findIndex(v=>Math.abs(v.x-p.x)<90);}
function syncHud(){
 $('#district').textContent=zones[zone(p.x)].name;
 $('#mode').textContent=p.bike?'Đạp xe':'Đi bộ';
 $('#photos').textContent=p.photos.length+' / 3 bưu thiếp';
 $('#progress').style.width=(p.x/END*100).toFixed(1)+'%';
 const v=getView();
 const text=until>at?toast: v!==-1&&!p.photos.includes(v)?'F / Ngắm cảnh: '+views[v].name:'';
 const hint=$('#hint');hint.textContent=text;hint.hidden=!running||p.finished||!text;
}
function play(){
 if(p.finished)reset(false);
 running=true;$('#banner').hidden=true;$('#start').blur();
 syncHud();
}
function finish(){
 p.finished=true;p.vx=0;
 const b=$('#banner');b.querySelector('.eyebrow').textContent='ĐÃ TỚI ĐỈNH ĐÈO';
 b.querySelector('h2').textContent='Gió đợi anh ở đây.';
 b.querySelector('p:not(.eyebrow)').textContent='Anh mang về '+p.photos.length+'/3 bưu thiếp. '+(p.photos.length===3?'Không bỏ lỡ cảnh nào.':'Có thể quay lại để tìm cảnh đã bỏ lỡ.');
 // Keep the full-screen finish an explicit choice; it doesn't erase the journey.
 $('#start').textContent='Đi chuyến mới';
 let back=$('#continue');
 if(!back){back=document.createElement('button');back.id='continue';back.type='button';back.textContent='Quay lại đường';back.style.marginLeft='6px';back.addEventListener('click',()=>{p.finished=false;p.x=END-80;p.y=ground(p.x);p.vx=0;b.hidden=true;syncHud();});b.append(back);}
 back.hidden=false;b.hidden=false;syncHud();
}
function reset(start=true){
 p=fresh();cam=0;dust=[];held.clear();pointers.clear();until=0;flash=0;running=start;
 $('#banner').hidden=start;
 if($('#continue'))$('#continue').hidden=true;
 syncHud();
}
function action(a){
 if(!running||p.finished)return;
 if(a==='mount'){
  if(p.air){say('Chạm đất rồi hãy đổi xe.');return;}
  p.bike=!p.bike;say(p.bike?'Đạp xe nhanh hơn trên đường khô.':'Đi bộ dễ vượt bùn và nhảy qua đá.');
 }
 if(a==='jump'&&!p.air){
  p.air=true;p.vy=p.bike?-237:-365;
  if(!reduce)burst(p.x,p.y,8,'#eed9a2');
 }
 if(a==='photo'){
  const v=getView();
  if(v===-1){say('Tìm biển bưu thiếp màu vàng dọc đường.');return;}
  if(p.photos.includes(v)){say('Đã lưu: '+views[v].name);return;}
  p.photos.push(v);flash=reduce?0:.22;say('Đã lưu bưu thiếp: '+views[v].name,3);
 }
}
function burst(x,y,num,color){
 for(let i=0;i<num;i++)dust.push({x,y,vx:(Math.random()-.5)*120,vy:-15-Math.random()*52,life:.25+Math.random()*.25,color});
 if(dust.length>140)dust.splice(0,dust.length-140);
}
function update(dt){
 if(!running||p.finished)return;
 const prevX=p.x,dir=Number(right())-Number(left()),slope=ground(p.x+10)-ground(p.x-10);
 const wet=mud.some(([a,b])=>p.x>a&&p.x<b);
 if(dir)p.face=dir;
 const speed=p.bike?(wet?94:clamp(310+slope*dir*10,135,410)):(wet?152:175);
 const target=dir*speed;
 p.vx=mix(p.vx,target,1-Math.exp(-dt*(dir?9:15)));
 let nx=clamp(p.x+p.vx*dt,40,END), ny=p.y;
 if(p.air){p.vy+=830*dt;ny+=p.vy*dt;}else{ny=ground(nx);}
 p.bump=Math.max(0,p.bump-dt);
 for(const b of blocks){
  const r=p.bike?25:10, edge=b.x-b.w/2-r, far=b.x+b.w/2+r;
  if(nx<edge||nx>far||ny<=ground(b.x)-b.h-2)continue;
  if(p.air&&p.vy>=0&&p.y<=ground(b.x)-b.h&&ny>=ground(b.x)-b.h){
   ny=ground(b.x)-b.h;p.vy=0;p.air=true;continue;
  }
  nx=p.x<=b.x?edge-.15:far+.15;p.vx=0;
  if(!p.air)ny=ground(nx);
  if(p.bump===0){p.bump=.55;say(p.bike?'Đá hoặc gỗ chắn đường. Xuống xe (E) rồi nhảy.':'Nhấn Space / Nhảy để vượt chướng ngại.');if(!reduce)burst(b.x,ground(b.x),6,'#ede0ad');}
 }
 const floor=ground(nx);
 if(p.air&&p.vy>=0&&ny>=floor){
  ny=floor;p.air=false;p.vy=0;if(!reduce)burst(nx,ny,6,wet?'#9c8460':'#ecdbad');
 }
 p.x=nx;p.y=ny;p.phase+=Math.abs(p.x-prevX)*(p.bike?.065:.096);
 if(!reduce&&!p.air&&Math.abs(p.vx)>65&&frame%5===0)burst(p.x-p.face*10,p.y,wet?3:1,wet?'#a18260':'#e3d09a');
 if(zone(prevX)!==zone(p.x))say(zones[zone(p.x)].name+' · '+zones[zone(p.x)].note,3);
 if(p.x>=END)finish();
}
function poly(points,fill){
 ctx.fillStyle=fill;ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);
 for(let i=1;i<points.length;i++)ctx.lineTo(points[i][0],points[i][1]);
 ctx.closePath();ctx.fill();
}
function line(points,color,w=1){
 ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);for(let i=1;i<points.length;i++)ctx.lineTo(points[i][0],points[i][1]);
 ctx.strokeStyle=color;ctx.lineWidth=w;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke();
}
function ell(x,y,rx,ry,color){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();}
function rnd(i){return((Math.sin(i*127.1+93.8)*43758.5453)%1+1)%1;}
function ridge(rate,base,amp,step,c,seed,steep=false){
 const dx=cam*rate,start=Math.floor(dx/step)-1, pts=[[-step,H]];
 for(let i=start;i<=start+W/step+4;i++){
  const x=i*step-dx, y=base-rnd(i+seed)*amp;
  if(steep&&i%2===0)pts.push([x-13,y+25],[x,y],[x+20,y+13]);
  else pts.push([x,y]);
 }
 pts.push([W+step,H]);poly(pts,c);
}
function tree(x,y,s,kind){
 ctx.save();ctx.translate(x,y);ctx.scale(s,s);
 line([[0,1],[0,-26]],'#725c42',3);
 if(kind===2){
  for(let n=0;n<3;n++)poly([[-13+n*2,-13-n*9],[0,-39-n*4],[12-n*2,-13-n*9]],n%2?'#335747':'#425f48');
 }else{
  ell(-6,-24,11,10,'#466c48');ell(5,-26,12,10,'#507b51');ell(0,-33,10,10,'#648653');
 }
 ctx.restore();
}
function house(x,y,s){
 ctx.save();ctx.translate(x,y);ctx.scale(s,s);ctx.fillStyle='#e1c89a';ctx.fillRect(-22,-24,44,24);
 poly([[-29,-23],[-19,-42],[18,-42],[28,-23]],'#a85940');
 line([[-25,-24],[25,-24]],'#794636',3);
 ctx.fillStyle='#425347';ctx.fillRect(-5,-15,10,15);
 ctx.fillStyle='#92886a';ctx.fillRect(10,-17,6,6);ctx.restore();
}
function groundShape(c){
 const pts=[];
 for(let x=-30;x<=W+36;x+=9)pts.push([x,ground(cam+x)]);
 poly([...pts,[W+36,H],[-30,H]],c.front);
 line(pts,'#b7ae70',18);
 line(pts.map(([x,y])=>[x,y+2]),'#ddbb83',8);
 for(let i=Math.floor(cam/30)-1;i<cam/30+W/30+2;i++){
  const x=i*30+rnd(i+240)*24,y=ground(x),sx=x-cam;
  const h=5+rnd(i)*14,off=12+rnd(i+4)*70;
  line([[sx-3,y+off+4],[sx,y+off-h],[sx+4,y+off+4]],c.grass,1.3);
  if(i%3===0)ell(sx+5,y+off-3,1.8,1.8,'#e9cd79');
 }
 for(const [a,b] of mud){
  if(b<cam||a>cam+W)continue;const pts=[];
  for(let x=a;x<=b;x+=8)pts.push([x-cam,ground(x)+6+Math.sin(x*.2)*2]);
  line(pts,'#927553',13);line(pts.filter((_,i)=>i%3===0),'#b59a72',2);
  for(let x=a+9;x<b;x+=32)ell(x-cam,ground(x)+5,10,2,'#665f51');
 }
}
function world(){
 const z=zone(cam+W*.52), c=zones[z], grad=ctx.createLinearGradient(0,0,0,H);
 grad.addColorStop(0,c.sky);grad.addColorStop(.82,c.light);
 ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);
 const sun=770-cam*.045;ell(sun,87,50,50,'#f5df9c55');ell(sun,87,34,34,'#ffe7a2');
 for(let i=0;i<8;i++){
  const drift=reduce?0:at*(2+i%3);
  const x=((i*203-cam*.11+drift)%1370+1370)%1370-180,y=34+rnd(i+5)*148;
  ell(x,y,72,10,'#fff3d974');ell(x-34,y+8,45,4,'#fff3d95c');
 }
 ridge(.17,265,[67,104,180][z],135,c.back,12,z===2);
 ridge(.35,337,[44,99,150][z],123,c.middle,28,z===2);
 if(z===0){
  poly([[0,306],[W,286],[W,407],[0,429]],'#7f9b5d');
  poly([[0,318],[W,290],[W,318],[0,354]],'#8db7a5');
  for(let i=0;i<28;i++){
   const x=((i*91-cam*.55)%1140+1140)%1140-60;
   line([[x,334-x*.035],[x+21,333-x*.035]],'#c7d4ae',2);
  }
  for(let i=0;i<8;i++)line([[0,375+i*10],[W,342+i*14]],i%2?'#a6aa63':'#bbad65',4);
 }
 if(z===1){
  for(let i=0;i<10;i++){
   const pts=[];
   for(let x=-20;x<=1040;x+=22)pts.push([x,290+i*10+Math.sin((x+cam*.6)*.005+i*.13)*28]);
   line(pts,i%2?'#749859':'#91a66b',3);
  }
 }
 if(z===2){
  poly([[375,443],[430,397],[548,378],[573,337],[833,341],[688,397],[610,420],[584,462]],'#7eaab0');
  line([[490,428],[466,417],[512,401],[599,381],[619,369],[771,352]],'#c2d6c2',3);
 }
 for(let i=Math.floor(cam/130)-1;i<(cam+W)/130+1;i++){
  const x=i*130+40+rnd(i+88)*45, y=ground(x)-9;
  if(i%6===1)house(x-cam,y,.67+rnd(i)*.35);else tree(x-cam,y,.54+rnd(i)*.71,zone(x));
 }
 groundShape(c);
 for(const b of blocks){
  const x=b.x-cam,y=ground(b.x),hw=b.w/2;
  if(x<-80||x>W+80)continue;
  if(b.kind==='rock'){
   poly([[x-hw,y],[x-hw+5,y-b.h+8],[x+4,y-b.h],[x+hw-4,y-b.h+12],[x+hw,y]],'#5e655b');
   poly([[x-hw+5,y-b.h+8],[x+4,y-b.h],[x+hw-4,y-b.h+12],[x-2,y-b.h+13]],'#999485');
  }else{
   line([[x-hw+8,y-9],[x+hw-8,y-12]],'#6e5039',16);ell(x+hw-5,y-12,7,9,'#c29261');ell(x+hw-5,y-12,3,5,'#835f40');
  }
 }
 for(let i=0;i<views.length;i++){
  const x=views[i].x-cam,y=ground(views[i].x);
  if(x<-25||x>W+25)continue;
  const glow=reduce?1:.9+.12*Math.sin(at*5+i);
  line([[x,y],[x,y-40]],'#574d36',4);
  poly([[x-13,y-39],[x+13,y-39],[x+13,y-25],[x-13,y-25]],p.photos.includes(i)?'#9ac797':'#ffdf87');
  line([[x-6,y-30],[x-2,y-35],[x+2,y-30],[x+6,y-33],[x+9,y-30]],'#5f6542',1.5);
  if(!p.photos.includes(i)){ell(x,y-51,3*glow,3*glow,'#ffeeb5');}
 }
 const end=END-cam,endY=ground(END);
 if(end<W+40){line([[end,endY],[end,endY-57]],'#d3b37b',3);poly([[end,endY-57],[end+23,endY-52],[end,endY-44]],'#d56e4e');}
}
function rider(){
 const x=p.x-cam,y=p.y,walk=p.air?.5:Math.sin(p.phase)*Math.min(Math.abs(p.vx)/95,1);
 ell(x,ground(p.x)+2,p.bike?27:13,4,'#273e3266');
 ctx.save();ctx.translate(x,y);ctx.scale(p.face,1);
 const body=p.bike?-34:-35, bob=p.air?0:Math.abs(walk)*1.5;
 if(p.bike){
  for(const wx of [-19,18]){
   ctx.beginPath();ctx.arc(wx,-10,10,0,Math.PI*2);ctx.strokeStyle='#283d37';ctx.lineWidth=3;ctx.stroke();
   for(let i=0;i<3;i++){const a=p.phase+i*Math.PI/3;line([[wx-8*Math.cos(a),-10-8*Math.sin(a)],[wx+8*Math.cos(a),-10+8*Math.sin(a)]],'#e1d4ad',.9);}
  }
  line([[-19,-10],[-5,-26],[2,-10],[-19,-10],[13,-24],[18,-10]],'#edaa54',2.5);
  line([[13,-24],[12,-31],[17,-31]],'#344a40',2);
  const pedalX=2+5*Math.cos(p.phase),pedalY=-10+4*Math.sin(p.phase);
  line([[-5,body+16],[7,-23],[pedalX,pedalY]],'#323e3a',4);
  line([[pedalX,pedalY],[pedalX+5,pedalY]],'#503d36',3);
 }else{
  line([[0,-15],[walk*7,-8],[walk*11,-1],[walk*11+4,-1]],'#5f5e52',4);
  line([[0,-15],[-walk*7,-8],[-walk*11,-1],[-walk*11+4,-1]],'#334743',4);
 }
 const y0=body-bob;
 ell(-6,y0+8,7,9,'#c09655');
 line([[-1,y0+18],[1,y0+4]],'#c2644c',9);
 line([[2,y0+5],[p.bike?12:4+walk*5,y0+11],[p.bike?17:5+walk*6,y0+(p.bike?3:16)]],'#e3a36c',3.6);
 ell(2,y0-3,6.6,7,'#e9b884');ell(1,y0-7,7.6,4.3,'#3a5b4d');line([[-7,y0-5],[11,y0-5]],'#3a5b4d',2.3);
 ell(5,y0-2,1,1,'#45382f');
 ctx.restore();
}
function draw(dt){
 cam=clamp(mix(cam,p.x-W*.30,1-Math.exp(-dt*5.5)),0,END-W*.65);
 world();
 for(const q of dust){
  q.life-=dt;q.x+=q.vx*dt;q.y+=q.vy*dt;q.vy+=80*dt;
  if(q.life>0){ctx.globalAlpha=clamp(q.life*2,0,1);ell(q.x-cam,q.y,3,2,q.color);}
 }
 dust=dust.filter(q=>q.life>0);ctx.globalAlpha=1;rider();
 if(flash>0){ctx.fillStyle='rgba(255,246,206,'+(flash*2)+')';ctx.fillRect(0,0,W,H);flash-=dt;}
}
function loop(ms){
 const dt=last?Math.min((ms-last)/1000,.032):.016;last=ms;at+=dt;frame++;
 update(dt);draw(dt);syncHud();requestAnimationFrame(loop);
}
const keys={ArrowLeft:'left',a:'left',ArrowRight:'right',d:'right',' ':'jump',ArrowUp:'jump',w:'jump',e:'mount',f:'photo'};
window.addEventListener('keydown',e=>{
 const a=keys[e.key.length===1?e.key.toLowerCase():e.key];
 if(!a||e.ctrlKey||e.metaKey||e.altKey)return;
 if((e.key===' '||e.key==='Enter')&&e.target instanceof HTMLButtonElement)return;
 e.preventDefault();
 if(a==='left'||a==='right'){if(!running)play();held.add(a);}else if(!e.repeat)action(a);
});
window.addEventListener('keyup',e=>held.delete(keys[e.key.length===1?e.key.toLowerCase():e.key]));
window.addEventListener('blur',()=>{held.clear();pointers.clear();});
document.querySelectorAll('[data-hold]').forEach(b=>{
 b.addEventListener('pointerdown',e=>{e.preventDefault();if(!running)play();b.setPointerCapture(e.pointerId);pointers.set(e.pointerId,b.dataset.hold);b.setAttribute('aria-pressed','true');});
 ['pointerup','pointercancel','lostpointercapture'].forEach(n=>b.addEventListener(n,e=>{pointers.delete(e.pointerId);b.setAttribute('aria-pressed','false');}));
 b.addEventListener('keydown',e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();if(!running)play();held.add(b.dataset.hold);}});
 b.addEventListener('keyup',e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();held.delete(b.dataset.hold);}});
 b.addEventListener('blur',()=>held.delete(b.dataset.hold));
});
document.querySelectorAll('[data-action]').forEach(b=>b.addEventListener('click',()=>action(b.dataset.action)));
$('#start').addEventListener('click',play);$('#reset').addEventListener('click',()=>reset());
requestAnimationFrame(loop);
})();
