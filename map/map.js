(() => {
'use strict';
const {places,roads,modes}=TripData,E=TripEngine,key='wind-trip-map-v1';
const $=id=>document.getElementById(id),vp=$('viewport'),world=$('world'),marker=$('marker');
const dom=(tag,text='')=>{const e=document.createElement(tag);e.textContent=text;return e;};
function load(){
 try{
  const s=JSON.parse(localStorage.getItem(key));
  if(s&&Number.isInteger(s.at)&&places[s.at]&&Object.hasOwn(modes,s.mode)&&['food','water','energy','health','money','clock','casts'].every(k=>Number.isFinite(s[k])&&s[k]>=0)&&Array.isArray(s.photos)&&Array.isArray(s.owned)&&s.owned.includes(s.mode)&&s.pets&&s.jobs&&s.bag&&['meals','bottles','treats','fish','meds'].every(k=>Number.isInteger(s.bag[k])&&s.bag[k]>=0))return s;
 }catch{}
 return E.fresh();
}
let s=load(),selected=s.at, travel=null, cast=null, last=0, hit=0, scale=1, tx=0,ty=0, initialized=false;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const scene=globalThis.TripScene3D?.attach($('canvas3d'))??null;
let in3d=false,geographic=false,orbit=0,lastDraw=0,cameraDrag=null,aside=0,needRelease=false,blocked='',motion=false,steerPose=0,speedPose=0,activity=null;
let throttleRamp=0,lastThrottle=0,actualSpeed=0;
const keys=new Set(),buttons=new Map(),inputs={w:'forward',ArrowUp:'forward',s:'back',ArrowDown:'back',a:'left',ArrowLeft:'left',d:'right',ArrowRight:'right'};
const pressing=dir=>[...keys].some(k=>inputs[k]===dir)||[...buttons.values()].includes(dir);
function clearDrive(){keys.clear();buttons.clear();for(const dir of ['left','forward','back','right'])$('drive-'+dir).setAttribute('aria-pressed','false');motion=false;}
function roadPoint(plan,d,offset){
 const p=E.sample(plan.profile,d),a=E.sample(plan.profile,d-2),b=E.sample(plan.profile,d+2),n=Math.hypot(b.x-a.x,b.z-a.z)||1;
 return {...p,x:p.x+(b.z-a.z)/n*offset,z:p.z-(b.x-a.x)/n*offset};
}
const fullRoute=E.profile(0,places.length-1);
const previewRoute=()=>E.profile(s.at,s.at<places.length-1?s.at+1:s.at-1);
let idleRoute=previewRoute();
function livePos(){return travel?roadPoint(travel.plan,travel.d,aside):idleRoute[0];}
function setView(on,geo=false){
 clearDrive();needRelease=false;
 geographic=geo;
 in3d=Boolean(on&&scene);if(on&&!scene)say('Thiết bị không mở được góc nhìn 3D. Bản đồ vẫn dùng được.');
 $('scene-panel').hidden=!in3d;vp.hidden=in3d||geo;$('map-nav').hidden=vp.hidden;$('map-caption').hidden=vp.hidden;
 $('geo-panel').hidden=!geo;$('pace').hidden=geo;
 $('map-view').setAttribute('aria-pressed',String(!vp.hidden));$('scene-view').setAttribute('aria-pressed',String(in3d));$('geo-view').setAttribute('aria-pressed',String(geo));
 if(in3d){scene.reset();lastDraw=0;}
 else if(geo&&!$('geo-frame').src)$('geo-frame').src='https://www.openstreetmap.org/export/embed.html?bbox=104.87%2C22.73%2C105.49%2C23.33&layer=mapnik';
 else if(!geo){const p=livePos();center([p.x,p.z]);}
 trailGuide();
}
$('map-view').onclick=()=>setView(false);$('scene-view').onclick=()=>setView(true);
$('geo-view').onclick=()=>setView(false,true);
$('mini').onclick=()=>setView(false);
const rotate=n=>{orbit=Math.atan2(Math.sin(orbit+n),Math.cos(orbit+n));};
$('orbit-left').onclick=()=>rotate(-.43);$('orbit-right').onclick=()=>rotate(.43);$('orbit-reset').onclick=()=>{orbit=0;};
const canvas=$('canvas3d');
function drivingKey(e){return inputs[e.key.length===1?e.key.toLowerCase():e.key];}
window.addEventListener('keydown',e=>{
 if(!in3d||e.ctrlKey||e.metaKey||e.altKey||!drivingKey(e)||e.target?.closest?.('input,textarea,select,[contenteditable]'))return;
 e.preventDefault();keys.add(e.key.length===1?e.key.toLowerCase():e.key);
});
window.addEventListener('keyup',e=>{keys.delete(e.key.length===1?e.key.toLowerCase():e.key);});
window.addEventListener('blur',clearDrive);
for(const dir of ['left','forward','back','right']){
 const b=$('drive-'+dir);
 const press=e=>{buttons.set(e.pointerId??dir,dir);b.setAttribute('aria-pressed','true');};
 const release=e=>{buttons.delete(e.pointerId??dir);b.setAttribute('aria-pressed','false');};
 b.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;e.preventDefault();b.setPointerCapture(e.pointerId);press(e);});
 for(const name of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(name,release);
 b.addEventListener('keydown',e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();press(e);}});
 b.addEventListener('keyup',e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();release(e);}});
 b.addEventListener('blur',release);
}
canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;cameraDrag={id:e.pointerId,x:e.clientX};canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{if(cameraDrag?.id===e.pointerId){rotate((cameraDrag.x-e.clientX)*.009);cameraDrag.x=e.clientX;}});
['pointerup','pointercancel','lostpointercapture'].forEach(k=>canvas.addEventListener(k,e=>{if(cameraDrag?.id===e.pointerId)cameraDrag=null;}));
let lastStats=NaN;
function meters(v){['food','water','energy','health'].forEach(k=>{$(k).value=v[k];$(k).title=Math.round(v[k])+'/100';});}
function animate(kind,seconds){activity={kind,at:performance.now(),until:performance.now()+seconds*1000};}
function updateStats(){
 const t=travel;
 if(t){
  const g=E.pace(t.plan,t.d,s,t.damage), pct=Math.round(g.speed/t.plan.speed*100), slope=Math.round(g.slope*100);
  $('pace-speed').textContent=motion?'Nhịp '+pct+'%':'Đang dừng';
  $('pace-grade').textContent=Math.abs(slope)<2?'Đường bằng':(slope>0?'Lên dốc +':'Xuống dốc ')+slope+'%';
  $('pace-shape').textContent='Thể trạng '+Math.round(g.needs*100)+'%';
  meters(E.condition(s,t.plan,t.d,t.damage));
 }else{$('pace-speed').textContent='Đang dừng';$('pace-grade').textContent='';$('pace-shape').textContent='';meters(s);}
}
let miniCourse=null;
function drawScene(ms){
 if(!in3d||ms-lastDraw<(reduced?30:14))return;
 lastDraw=ms;
 const t=travel,route=t?t.plan.profile:idleRoute,d=t?t.d:0,p=livePos();
 if(miniCourse!==route){
  miniCourse=route;
  $('mini-route').innerHTML=svgLine(fullRoute.map(v=>[v.x,v.z]),'stroke="#739785" stroke-width="22"')+svgLine(route.map(v=>[v.x,v.z]),'stroke="#325f50" stroke-width="12"')+'<circle id="mini-marker" r="28" fill="#f0c476" stroke="#244b40" stroke-width="9"/>';
 }
 const dot=$('mini-marker');dot.setAttribute('cx',p.x);dot.setAttribute('cy',p.z);
 scene.render({route,d,mode:s.mode,moving:motion,offset:aside,speed:speedPose,actualSpeed,steer:steerPose,seconds:ms/1000,orbit,reduced,
  action:cast?'fish':activity&&ms<activity.until?activity.kind:'',actionTime:cast?(ms-cast.start)/1000:activity?(ms-activity.at)/1000:0,hazard:t?.plan.hazards[t.nextHazard],damage:ms<hit,pets:Object.keys(s.pets).filter(k=>s.pets[k]===2)});
}
let showText='Giữ W hoặc nút ▲ để tự lên đường.';
function say(text){showText=text;$('message').textContent=text;}
function save(){try{localStorage.setItem(key,JSON.stringify(s));}catch{}}
const coords=p=>[p.x,p.y];
const svgLine=(p,style)=>`<polyline points="${p.map(v=>v.join(',')).join(' ')}" fill="none" stroke-linecap="round" stroke-linejoin="round" ${style}/>`;
function buildTerrain(){
 const rand=i=>((Math.sin(i*79.1+91.7)*46713.52)%1+1)%1;
 const contour=(cx,cy,rx,ry,seed)=>{
  const pts=Array.from({length:52},(_,i)=>{const a=i/52*2*Math.PI,w=.94+.12*Math.sin(a*3+seed)+.12*Math.cos(a*5-seed);return [(cx+rx*Math.cos(a)*w).toFixed(1),(cy+ry*Math.sin(a)*w).toFixed(1)];});
  return 'M'+pts.map(p=>p.join(',')).join('L')+'Z';
 };
 const hills=[[110,210,275,225],[400,150,225,210],[672,151,255,190],[1035,70,225,106],[1250,164,219,171],[1010,515,265,226],[1277,624,210,255],[614,668,235,193],[402,940,135,100],[190,551,173,202],[852,930,269,209]];
 const relief=hills.map(([x,y,rx,ry],i)=>Array.from({length:12},(_,k)=>{const a=1-k*.064;return `<path d="${contour(x,y,rx*a,ry*a,i)}" fill="${['#abc39d','#a6bd94','#a0b88d','#96b185','#91aa7e','#87a277'][k>>1]}" stroke="#73936e" stroke-width=".84" stroke-opacity=".58"/>`;}).join('')).join('');
 const trees=Array.from({length:430},(_,i)=>{
  const x=rand(i*4)*1400,y=rand(i*4+3)*1020,r=1+rand(i+430)*2.7;
  return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${i%2?'#507956':'#82a46f'}" opacity=".40"/>`;
 }).join('');
 const fields=Array.from({length:16},(_,i)=>{const x=90+i*18,y=882+Math.sin(i*.24)*54;return `<path d="M${x} ${y}l13 -15 24 12 -12 17z" fill="${i%2?'#c7cc81':'#b8c783'}" stroke="#8fa77c"/>`;}).join('');
 const villages=places.filter(p=>p.services?.includes('shop')).map(p=>Array.from({length:12},(_,i)=>{
  const x=p.x-29+rand(i+1)*65,y=p.y-28+rand(i+25)*68;
  return `<rect x="${x}" y="${y}" width="7" height="5" rx="1" fill="#d4ae87" stroke="#9c886c" stroke-width=".7" transform="rotate(18 ${x} ${y})"/>`;
 }).join('')).join('');
 const river='M-20 1005 Q125 930 184 937T283 832 Q284 789 327 763T410 720 Q463 699 492 715 L550 753 Q596 785 660 772T740 822';
 const nho='M1230 -12 Q1200 96 1250 145T1286 256 Q1320 314 1306 365T1337 491 Q1384 564 1418 580';
 const all=fullRoute.map(p=>[p.x,p.z]);
 $('terrain').innerHTML=`<defs><pattern id="grid" width="90" height="90" patternUnits="userSpaceOnUse"><path d="M90 0H0V90" fill="none" stroke="#7c9c83" stroke-opacity=".27" stroke-width=".8"/></pattern></defs>
 <rect width="1400" height="1020" fill="#c5d3ad"/>${relief}<rect width="1400" height="1020" fill="url(#grid)"/>${trees}${fields}
 <g fill="none" stroke-linecap="round"><path d="${river}" stroke="#719e96" stroke-width="16"/><path d="${river}" stroke="#8cbab4" stroke-width="9"/><path d="${nho}" stroke="#799f98" stroke-width="19"/><path d="${nho}" stroke="#9bc4b5" stroke-width="9"/></g>
 ${villages}${svgLine(all,'stroke="#84967a" stroke-width="9"')}${svgLine(all,'stroke="#fbf3d2" stroke-width="5.5"')}
 <g id="active-route"></g>
 <g fill="#3b6251" font-family="Georgia,serif" font-style="italic" font-size="19" opacity=".8"><text x="141" y="978">Sông Lô</text><text x="1266" y="130" transform="rotate(62 1266 130)">Sông Nho Quế</text><text x="548" y="247">Cao nguyên đá</text><text x="830" y="740">Đường núi</text></g>`;
}
const pins=[];
places.forEach((p,i)=>{
 const pin=dom('button');pin.className='pin';pin.type='button';pin.style.left=p.x+'px';pin.style.top=p.y+'px';pin.setAttribute('aria-label',p.name);
 const icon=dom('span',p.icon);icon.className='icon';const label=dom('span',p.name);label.className='pin-name';pin.append(icon,label);
 pin.addEventListener('click',()=>select(i));$('pins').append(pin);pins.push(pin);
 const listing=dom('button',p.name);listing.addEventListener('click',()=>{select(i);center(coords(p),Math.max(scale,.7));});$('directory').append(listing);
});
function fit(){return Math.min((vp.clientWidth-28)/1400,(vp.clientHeight-25)/1020);}
function view(){
 const pad=55,w=vp.clientWidth,h=vp.clientHeight;
 if(w<1||h<1)return;
 if(1400*scale<=w-2*pad)tx=(w-1400*scale)/2;else tx=Math.max(w-1400*scale-pad,Math.min(pad,tx));
 if(1020*scale<=h-2*pad)ty=(h-1020*scale)/2;else ty=Math.max(h-1020*scale-pad,Math.min(pad,ty));
 world.style.transform=`translate(${tx}px,${ty}px) scale(${scale})`;
 world.style.setProperty('--pin-scale',String(Math.min(2.1,1/scale)));
 $('zoom').textContent=Math.round(scale*100)+'%';
 pins.forEach((pin,i)=>pin.classList.toggle('compact',scale<.62&&i!==selected));
}
function center([x,y],z=scale){scale=z;tx=vp.clientWidth/2-x*scale;ty=vp.clientHeight/2-y*scale;view();}
function zoomBy(factor,x=vp.clientWidth/2,y=vp.clientHeight/2){
 const next=Math.max(fit(),Math.min(2.5,scale*factor)),ratio=next/scale;
 tx=x-(x-tx)*ratio;ty=y-(y-ty)*ratio;scale=next;view();
}
const overview=()=>center([700,510],fit());
$('plus').onclick=()=>zoomBy(1.32);$('minus').onclick=()=>zoomBy(1/1.32);
$('overview').onclick=overview;$('locate').onclick=()=>center(travel?E.pointAt(travel.plan.points,travel.d):coords(places[s.at]),Math.max(.8,scale));
vp.addEventListener('wheel',e=>{e.preventDefault();const r=vp.getBoundingClientRect();zoomBy(Math.exp(-Math.max(-120,Math.min(120,e.deltaY))*.003),e.clientX-r.left,e.clientY-r.top);},{passive:false});
const fingers=new Map();
const local=e=>{const r=vp.getBoundingClientRect();return [e.clientX-r.left,e.clientY-r.top];};
const gap=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
vp.addEventListener('pointerdown',e=>{if(e.target.closest('button')||(e.pointerType==='mouse'&&e.button!==0))return;fingers.set(e.pointerId,local(e));vp.setPointerCapture(e.pointerId);});
vp.addEventListener('pointermove',e=>{
 if(!fingers.has(e.pointerId))return;
 const before=fingers.get(e.pointerId),now=local(e),other=[...fingers].find(([id])=>id!==e.pointerId)?.[1];
 fingers.set(e.pointerId,now);
 if(other){const anchor=[(before[0]+other[0])/2,(before[1]+other[1])/2];zoomBy(gap(now,other)/Math.max(2,gap(before,other)),...anchor);tx+=(now[0]-before[0])/2;ty+=(now[1]-before[1])/2;}
 else {tx+=now[0]-before[0];ty+=now[1]-before[1];}
 view();
});
['pointerup','pointercancel','lostpointercapture'].forEach(k=>vp.addEventListener(k,e=>fingers.delete(e.pointerId)));
vp.addEventListener('keydown',e=>{if(e.target!==vp)return;if(e.key==='+'||e.key==='=')zoomBy(1.32);else if(e.key==='-')zoomBy(1/1.32);else if(e.key==='ArrowLeft')tx+=58;else if(e.key==='ArrowRight')tx-=58;else if(e.key==='ArrowDown')ty-=58;else if(e.key==='ArrowUp')ty+=58;else return;e.preventDefault();view();});
window.addEventListener('resize',()=>{if(initialized){scale=Math.max(fit(),scale);view();}});
function select(i){selected=i;render();}
function pinState(){
 pins.forEach((pin,i)=>{pin.setAttribute('aria-pressed',String(i===selected));pin.classList.toggle('visited',s.photos.includes(places[i].id));pin.classList.toggle('compact',scale<.62&&i!==selected);});
}
function position(x,y){
 marker.style.left=x+'px';marker.style.top=y+'px';marker.classList.toggle('hit',performance.now()<hit);
}
function route(plan,progress=0){
 const target=$('active-route');
 if(!plan){target.replaceChildren();return;}
 target.innerHTML=svgLine(plan.points,'stroke="#327362" stroke-width="7"')+svgLine(plan.points,'stroke="#fbd27c" stroke-width="3.4" stroke-dasharray="8 6"')
 +plan.hazards.map(h=>{const [x,y]=E.pointAt(plan.points,h.at);return `<circle cx="${x}" cy="${y}" r="10" fill="#c77746" stroke="#fff0bb" stroke-width="3"/><path d="M${x} ${y-4}v5m0 3v.1" stroke="white" stroke-width="2" stroke-linecap="round"/>`;}).join('')
 +(progress>0?(()=>{const [x,y]=E.pointAt(plan.points,progress);return `<circle cx="${x}" cy="${y}" r="13" fill="#efd88b" opacity=".5"/>`;})():'');
}
function action(label,fn,disabled=false){
 const b=dom('button',label);b.type='button';b.disabled=disabled;b.addEventListener('click',fn);$('actions').append(b);
}
const servicesAnimation={meal:['meal',2.5],drink:['drink',2],nap:['rest',3.2],camp:['rest',3.2],photo:['photo',1.7]};
function service(k){
 const allowed=(k==='meal'&&s.bag.meals)||(k==='drink'&&s.bag.bottles)||k==='nap'||(k==='camp'&&s.money>=15)||(k==='photo'&&places[s.at].photo&&!s.photos.includes(places[s.at].id));
 say(E.service(s,k));if(allowed&&servicesAnimation[k])animate(...servicesAnimation[k]);save();render();
}
function travelStart(direction){
 const to=s.at+direction;if(!places[to]||travel||cast)return;
 const plan=E.trip(s.at,to,s.mode);
 if(!E.canTravel(s,plan)){
  if(blocked!==String(to)){blocked=String(to);say('Chưa đủ no, nước, sức hoặc tiền nhiên liệu để tới '+places[to].name+'. Hãy tiếp tế trước.');}
  return;
 }
 blocked='';activity=null;travel={to,plan,d:0,direction,nextHazard:0,damage:0,roadMinutes:0,holdUntil:0,warned:false};
 selected=s.at;orbit=0;aside=0;
 say('Đang hướng tới '+places[to].name+'. Nhả phím để dừng.');render();
}
function finishTravel(){
 const t=travel;travel=null;aside=0;motion=false;needRelease=true;
 if(!E.arrive(s,t.to,t.plan,0,t.damage,t.roadMinutes)){say('Không thể hoàn thành chặng.');render();return;}
 selected=s.at;idleRoute=previewRoute();save();say('Đã tới '+places[s.at].name+(t.damage?' · −'+t.damage+' máu.':'.'));
 render();
}
function catchNow(){
 if(!cast)return;
 const age=performance.now()-cast.start;cast=null;animate('reel',1.05);say(E.catchFish(s,age));save();render();
}
let currentPhoto='';
function photo(p){
 const figure=$('photo'),img=$('image');
 figure.hidden=!p.photo;if(!p.photo){currentPhoto='';img.removeAttribute('src');return;}
 if(currentPhoto===p.id)return;
 currentPhoto=p.id;const f=p.photo;
 img.alt='Ảnh thật: '+p.name;img.hidden=false;img.onerror=()=>{img.hidden=true;};
 img.src=f.url;
 const link=dom('a',f.author+' · Ảnh gốc');link.href=f.file;link.target='_blank';link.rel='noopener noreferrer';
 const lic=dom('a',f.license);lic.href=f.licenseUrl;lic.target='_blank';lic.rel='noopener noreferrer';
 $('credit').replaceChildren(link,document.createTextNode(' · '),lic,document.createTextNode(' · Wikimedia Commons'));
}
function trailGuide(){
 const label=$('trail-label'),title=$('trail-title'),detail=$('trail-detail'),actions=$('trail-extra');
 const button=(text,fn)=>{const b=dom('button',text);b.type='button';b.addEventListener('click',fn);actions.append(b);};
 const t=travel, next=s.at===places.length-1?s.at-1:s.at+1;
 actions.replaceChildren();$('drive-controls').hidden=!in3d||Boolean(cast);
 if(cast){
  label.textContent='ĐANG CÂU CÁ';title.textContent='Canh phao chìm';detail.textContent='Khi nhật ký báo phao chìm, bấm Giật cần.';
  button('Giật cần',catchNow);return;
 }
 if(!in3d){
  label.textContent=geographic?'ĐỊA LÝ HÀ GIANG':'BẢN ĐỒ ĐỊNH VỊ';title.textContent=t?'Trên đường tới '+places[t.to].name:places[s.at].name;
  detail.textContent=geographic?'Mở Sơ đồ để xem tiến độ trong game.':'Ghim chỉ để xem địa điểm. Đổi về 3D để tự điều khiển.';
  if(scene)button('Về 3D',()=>setView(true));return;
 }
 label.textContent=t?'TRÊN ĐƯỜNG':s.at===places.length-1?'CUỐI TUYẾN':'CHẶNG TIẾP THEO';
 title.textContent=places[t?.to??next].name;
 detail.textContent=t?'W/S tiến hoặc lùi · A/D né sang hai bên · Nhả phím để dừng.':
  s.at===places.length-1?'Giữ S hoặc ▼ để đi về phía Chợ Đồng Văn.':'Giữ W hoặc ▲ để đi tiếp · A/D để lái · S hoặc ▼ để lùi.';
}
function render(){
 const p=places[selected],local=selected===s.at;
 meters(travel?E.condition(s,travel.plan,travel.d,travel.damage):s);
 $('mode').textContent=modes[s.mode].name;$('money').textContent=s.money+'k ₫';$('clock').textContent='N'+E.day(s)+' · '+E.time(s.clock);
 $('place-tag').textContent=p.kind+(local?' · ĐANG Ở':'');$('place').textContent=p.name;$('summary').textContent=p.description;photo(p);
 $('bag').textContent=`🍚 ${s.bag.meals} · 💧 ${s.bag.bottles} · 🐟 ${s.bag.fish} · ✚ ${s.bag.meds} · 🦴 ${s.bag.treats}`;
 const companions=Object.keys(s.pets).filter(k=>s.pets[k]===2).map(k=>k==='dog'?'🐕':'🐈').join(' ');
 $('mission').textContent=(s.photos.length===3?'Hoàn thành bộ ảnh Hà Giang!':'Bộ ảnh Hà Giang: '+s.photos.length+'/3')+(companions?' · Bạn đồng hành '+companions:'');
 $('message').textContent=showText;marker.textContent=companions||modes[s.mode].icon;marker.title=modes[s.mode].name;
 pinState();$('actions').replaceChildren();trailGuide();
 if(travel){route(travel.plan,travel.d);return;}
 position(...coords(places[s.at]));
 if(cast){route(null);action('Giật cần',catchNow);return;}
 if(!local){
  route(null);
  action('Xem điểm đang đứng',()=>select(s.at));
 }else{
  route(null);
  if(p.photo)action(s.photos.includes(p.id)?'✓ Đã check-in':'Check-in · Lưu ảnh',()=>service('photo'),s.photos.includes(p.id));
  if(p.services?.includes('fish'))action('Thả câu',()=>{cast={start:performance.now(),phase:0};say('Phao đang nổi. Canh lúc phao chìm rồi giật cần.');render();},!E.canFish(s));
  if(p.services?.includes('job'))action('Phụ quán · +38k',()=>service('job'),!E.canWork(s));
  if(p.services?.includes('sell'))action('Bán '+s.bag.fish+' cá · '+s.bag.fish*16+'k',()=>service('sell'),!s.bag.fish);
  if(p.pet&&s.pets[p.pet]<2)action(s.pets[p.pet]===0?'Ngồi yên làm quen':'Đặt đồ ăn rồi lùi lại',()=>service(s.pets[p.pet]===0?'waitPet':'befriend'),s.pets[p.pet]===1&&!s.bag.treats);
  if(p.services?.includes('shop')){
   action('Cơm · 18k',()=>service('buyMeal'),s.money<18);action('Nước · 8k',()=>service('buyWater'),s.money<8);
   action('Đồ ăn cho thú · 12k',()=>service('buyTreat'),s.money<12);action('Túi sơ cứu · 22k',()=>service('buyMed'),s.money<22);
  }
  if(p.services?.includes('garage'))Object.entries(modes).filter(([id])=>!s.owned.includes(id)).forEach(([id,v])=>action('Mua '+v.name.toLowerCase()+' · '+v.price+'k',()=>{if(E.buyVehicle(s,id)){say('Đã mua '+v.name+'.');save();render();}},s.money<v.price));
  if(p.services?.includes('rest'))action('Ngủ tại trạm · 15k',()=>service('camp'),s.money<15);
  if(p.services?.includes('help')&&E.needsHelp(s))action('Nhận suất hỗ trợ',()=>service('help'));
 }
 if(s.bag.meals)action('Ăn cơm',()=>service('meal'),s.food===100);
 if(s.bag.bottles)action('Uống nước',()=>service('drink'),s.water===100);
 if(s.bag.meds)action('Sơ cứu · +45 máu',()=>service('med'),s.health===100);
 action('Ngồi nghỉ · +32 sức',()=>service('nap'),s.energy>90);
 for(const id of s.owned)if(id!==s.mode)action('Đổi sang '+modes[id].name.toLowerCase(),()=>{E.setVehicle(s,id);save();render();});
 if(E.needsRescue(s))action('Gọi hỗ trợ đường xa',()=>{if(E.rescue(s)){say('Được tiếp tế đủ đi bộ tới trạm gần nhất. Mất hai giờ.');save();render();}});
}
function loop(ms){
 const dt=Math.min(.04,Math.max(0,(ms-(last||ms))/1000));last=ms;
 const drive=in3d&&!cast?Number(pressing('forward'))-Number(pressing('back')):0;
 motion=false;actualSpeed=0;
 if(!drive){needRelease=false;blocked='';}
 if(!travel&&drive&&!needRelease)travelStart(drive);
 const steering=travel&&in3d?Number(pressing('right'))-Number(pressing('left')):0;
 steerPose+=(steering-steerPose)*(1-Math.exp(-dt*13));
 const throttle=travel?drive*travel.direction:0;
 if(!throttle||throttle!==lastThrottle)throttleRamp=0;
 lastThrottle=throttle;
 if(travel&&in3d){
  const t=travel,prior=t.d;
  aside=Math.max(-5.6,Math.min(5.6,aside+steering*(3.5+3.2*Math.abs(steerPose))*dt));
  if(drive&&ms>=t.holdUntil){
   const qty=E.pace(t.plan,t.d,s,t.damage,throttle);speedPose=qty.speed/t.plan.speed;
   throttleRamp=Math.min(1,throttleRamp+dt/(s.mode==='walk'?.29:.49));
   const speed=qty.speed*.32*(.18+.82*throttleRamp*throttleRamp*(3-2*throttleRamp))*(throttle<0?.58:1)*(Math.abs(aside)>3.7?.76:1);
   t.d=Math.max(0,Math.min(t.plan.distance,t.d+throttle*speed*dt));
   motion=t.d!==prior;
   actualSpeed=dt?(t.d-prior)/dt:0;
   const next=t.plan.hazards[t.nextHazard];
   if(next&&!t.warned&&next.at-t.d<36){
    t.warned=true;say(next.name+' phía trước. Né hẳn sang trái hoặc phải bằng A/D.');
   }
   if(next&&prior<next.at&&t.d>=next.at){
    t.nextHazard++;
    if(Math.abs(aside)<(s.mode==='car'?3.35:2.4)){
     const damage=Math.min(t.plan.impact,Math.max(0,s.health-t.damage-1));
     t.damage+=damage;hit=performance.now()+700;t.holdUntil=ms+600;throttleRamp=0;
     say('Va chạm! −'+damage+' máu. Anh có thể đi tiếp sau khi đứng lại một nhịp.');
    }else say('Đã né được chướng ngại.');
   }
   t.roadMinutes+=t.plan.minutes*Math.abs(t.d-prior)/t.plan.distance*t.plan.speed/qty.speed;
   if(t.d>=t.plan.distance)finishTravel();
   else if(t.d===0&&throttle<0){
    s.health=Math.max(1,s.health-t.damage);s.clock+=Math.ceil(t.roadMinutes);travel=null;aside=0;needRelease=true;motion=false;
    save();say('Đã lùi về '+places[s.at].name+'.');render();
   }
  }
 }
 if(travel){const p=livePos();position(p.x,p.z);}
 if(cast){
  const age=performance.now()-cast.start;
  if(age>=2450){cast=null;say(E.catchFish(s,Infinity));save();render();}
  else if(age>=1250&&!cast.phase){cast.phase=1;say('● Phao chìm! Bấm Giật cần ngay.');}
 }
 if(ms-(lastStats||0)>90){updateStats();lastStats=ms;}
 drawScene(ms);
 requestAnimationFrame(loop);
}
$('reset').onclick=()=>{if(confirm('Bắt đầu lại và xóa tiến độ bản đồ?')){s=E.fresh();selected=0;travel=null;cast=null;activity=null;idleRoute=previewRoute();orbit=0;aside=0;clearDrive();needRelease=false;save();overview();say('Chuyến mới bắt đầu tại Hà Giang.');render();}};
buildTerrain();overview();initialized=true;setView(Boolean(scene));render();requestAnimationFrame(loop);
})();
