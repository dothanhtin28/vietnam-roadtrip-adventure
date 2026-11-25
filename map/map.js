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
let in3d=false, modePicked=false, orbit=0, lastDraw=0, cameraDrag=null;
const fullRoute=E.profile(0,places.length-1);
const previewRoute=()=>E.profile(s.at,s.at<places.length-1?s.at+1:s.at-1);
let idleRoute=previewRoute();
function livePos(){return travel?E.sample(travel.plan.profile,travel.d):idleRoute[0];}
function setView(on,manual=true){
 if(manual)modePicked=true;
 in3d=Boolean(on&&scene);if(on&&!scene)say('Thiết bị không mở được góc nhìn 3D. Bản đồ vẫn dùng được.');
 $('scene-panel').hidden=!in3d;vp.hidden=in3d;$('map-nav').hidden=in3d;$('map-caption').hidden=in3d;
 $('map-view').setAttribute('aria-pressed',String(!in3d));$('scene-view').setAttribute('aria-pressed',String(in3d));
 if(in3d){scene.reset();lastDraw=0;}else{const p=livePos();center([p.x,p.z]);}
}
$('map-view').onclick=()=>setView(false);$('scene-view').onclick=()=>setView(true);
$('mini').onclick=()=>setView(false);
const rotate=n=>{orbit=Math.atan2(Math.sin(orbit+n),Math.cos(orbit+n));};
$('orbit-left').onclick=()=>rotate(-.43);$('orbit-right').onclick=()=>rotate(.43);$('orbit-reset').onclick=()=>{orbit=0;};
function pauseTravel(){if(travel&&!travel.decision){travel.paused=!travel.paused;say(travel.paused?'Đang dừng ngắm cảnh.':'Đã đi tiếp.');render();}}
$('pause-travel').onclick=pauseTravel;
const canvas=$('canvas3d');
canvas.addEventListener('keydown',e=>{if(e.key==='ArrowLeft')rotate(-.32);else if(e.key==='ArrowRight')rotate(.32);else if(e.key===' ')pauseTravel();else return;e.preventDefault();});
canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;cameraDrag={id:e.pointerId,x:e.clientX};canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{if(cameraDrag?.id===e.pointerId){rotate((cameraDrag.x-e.clientX)*.009);cameraDrag.x=e.clientX;}});
['pointerup','pointercancel','lostpointercapture'].forEach(k=>canvas.addEventListener(k,e=>{if(cameraDrag?.id===e.pointerId)cameraDrag=null;}));
let lastStats=NaN;
function meters(v){['food','water','energy','health'].forEach(k=>{$(k).value=v[k];$(k).title=Math.round(v[k])+'/100';});}
function visuals(ms){
 const t=travel;
 if(t){
  const g=E.pace(t.plan,t.d,s,t.damage), pct=Math.round(g.speed/t.plan.speed*100), slope=Math.round(g.slope*100);
  $('pace-speed').textContent=t.decision?'Chướng ngại':t.paused?'Đang nghỉ':'Nhịp '+pct+'%';
  $('pace-grade').textContent=Math.abs(slope)<2?'Đường bằng':(slope>0?'Lên dốc +':'Xuống dốc ')+slope+'%';
  $('pace-shape').textContent='Thể trạng '+Math.round(g.needs*100)+'%';
  meters(E.condition(s,t.plan,t.d,t.damage));
 }else{$('pace-speed').textContent='Đang dừng';$('pace-grade').textContent='';$('pace-shape').textContent='';meters(s);}
 if(in3d&&ms-lastDraw>=32){
  lastDraw=ms;const route=t?t.plan.profile:idleRoute,d=t?t.d:0,p=E.sample(route,d);
  $('mini-route').innerHTML=svgLine(fullRoute.map(v=>[v.x,v.z]),'stroke="#739785" stroke-width="22"')+svgLine(route.map(v=>[v.x,v.z]),'stroke="#325f50" stroke-width="12"')+`<circle cx="${p.x}" cy="${p.z}" r="39" fill="#f0c476" stroke="#244b40" stroke-width="13"/>`;
  scene.render({route,d,mode:s.mode,moving:!!(t&&!t.decision&&!t.paused),seconds:ms/1000,orbit,hazard:t?.plan.hazards[t.nextHazard],damage:performance.now()<hit,pets:Object.keys(s.pets).filter(k=>s.pets[k]===2)});
 }
}
let showText='Chọn một ghim để xem hoạt động hoặc lên đường.';
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
 const all=E.path(0,places.length-1);
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
function service(k){say(E.service(s,k));save();render();}
function travelStart(to,plan){
 if(to===s.at||!E.canTravel(s,plan)||travel||cast)return;
 travel={to,plan,d:0,decision:false,nextHazard:0,extra:0,damage:0,roadMinutes:0,paused:false};
 orbit=0;if(!modePicked&&scene)setView(true,false);
 say('Đang đi tới '+places[to].name+'…');render();
}
function resolveHazard(avoid){
 if(!travel?.decision)return;
 if(!avoid&&s.health<=travel.damage+travel.plan.impact)return;
 travel.nextHazard++;travel.decision=false;
 if(avoid){travel.extra+=28;say('Anh dừng lại rồi vòng qua. Chuyến đi thêm 28 phút.');}
 else {travel.damage+=travel.plan.impact;hit=performance.now()+700;say('Va chạm! Mất '+travel.plan.impact+' máu khi kết thúc chặng.');}
 render();
}
function finishTravel(){
 const t=travel;travel=null;
 if(!E.arrive(s,t.to,t.plan,t.extra,t.damage,t.roadMinutes)){say('Không thể hoàn thành chặng.');render();return;}
 selected=s.at;idleRoute=previewRoute();save();say('Đã tới '+places[s.at].name+(t.damage?' · −'+t.damage+' máu.':'.'));
 render();
}
function catchNow(){
 if(!cast)return;
 const age=performance.now()-cast.start;cast=null;say(E.catchFish(s,age));save();render();
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
function render(){
 const p=places[selected],local=selected===s.at;
 meters(travel?E.condition(s,travel.plan,travel.d,travel.damage):s);
 $('pause-travel').disabled=!travel||travel.decision;$('pause-travel').textContent=travel?.paused?'Đi tiếp':'Tạm dừng';
 $('mode').textContent=modes[s.mode].name;$('money').textContent=s.money+'k ₫';$('clock').textContent='N'+E.day(s)+' · '+E.time(s.clock);
 $('place-tag').textContent=p.kind+(local?' · ĐANG Ở':'');$('place').textContent=p.name;$('summary').textContent=p.description;photo(p);
 $('bag').textContent=`🍚 ${s.bag.meals} · 💧 ${s.bag.bottles} · 🐟 ${s.bag.fish} · ✚ ${s.bag.meds} · 🦴 ${s.bag.treats}`;
 const companions=Object.keys(s.pets).filter(k=>s.pets[k]===2).map(k=>k==='dog'?'🐕':'🐈').join(' ');
 $('mission').textContent=(s.photos.length===3?'Hoàn thành bộ ảnh Hà Giang!':'Bộ ảnh Hà Giang: '+s.photos.length+'/3')+(companions?' · Bạn đồng hành '+companions:'');
 $('message').textContent=showText;marker.textContent=companions||modes[s.mode].icon;marker.title=modes[s.mode].name;
 pinState();$('actions').replaceChildren();
 if(travel){
  route(travel.plan,travel.d);
  if(travel.decision){
   const danger=dom('p',travel.plan.hazards[travel.nextHazard].name+'. Chọn cách đi tiếp.');danger.className='action-explain';$('actions').append(danger);
   action('Dừng và đi vòng · +28 phút',()=>resolveHazard(true));
   action('Đi nhanh · −'+travel.plan.impact+' máu',()=>resolveHazard(false),s.health<=travel.damage+travel.plan.impact);
  } else {
   action(travel.paused?'Đi tiếp':'Tạm dừng · Ngắm cảnh',pauseTravel);
   action('Hủy chặng',()=>{travel=null;say('Quay lại điểm xuất phát của chặng.');render();});
  }
  return;
 }
 position(...coords(places[s.at]));
 if(cast){route(null);action('Giật cần',catchNow);return;}
 if(!local){
  const plan=E.trip(s.at,selected,s.mode);route(plan);
  action('Đi tới đây · ~'+E.eta(plan,s)+' phút',()=>travelStart(selected,plan),!E.canTravel(s,plan));
  action('Về điểm hiện tại',()=>select(s.at));
  const cost=dom('p',`Cần ${plan.food} no bụng, ${plan.water} nước, ${plan.energy} sức${plan.fuel?', '+plan.fuel+'k nhiên liệu':''}.`);cost.className='action-explain';$('actions').append(cost);
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
 if(travel&&!travel.decision&&!travel.paused){
  const t=travel,prior=t.d, p=E.pace(t.plan,t.d,s,t.damage);t.d=Math.min(t.plan.distance,t.d+p.speed*(reduced?3:1)*dt);
  const next=t.plan.hazards[t.nextHazard];
  if(next&&t.d>=next.at){
   t.d=next.at;t.decision=true;say('Có chướng ngại ngay trước mặt.');render();
  }
  t.roadMinutes+=t.plan.minutes*(t.d-prior)/t.plan.distance*t.plan.speed/p.speed;
  if(t.d>=t.plan.distance)finishTravel();else {
   const [x,y]=E.pointAt(t.plan.points,t.d);position(x,y);
   const sx=tx+x*scale,sy=ty+y*scale;
   if(!fingers.size&&(sx<28||sy<32||sx>vp.clientWidth-28||sy>vp.clientHeight-34))center([x,y]);
  }
 }
 if(cast){
  const age=performance.now()-cast.start;
  if(age>=2450){cast=null;say(E.catchFish(s,Infinity));save();render();}
  else if(age>=1250&&!cast.phase){cast.phase=1;say('● Phao chìm! Bấm Giật cần ngay.');}
 }
 if(ms-(lastStats||0)>90||in3d){visuals(ms);lastStats=ms;}
 requestAnimationFrame(loop);
}
$('reset').onclick=()=>{if(confirm('Bắt đầu lại và xóa tiến độ bản đồ?')){s=E.fresh();selected=0;travel=null;cast=null;idleRoute=previewRoute();orbit=0;save();overview();say('Chuyến mới bắt đầu tại Hà Giang.');render();}};
buildTerrain();overview();initialized=true;render();requestAnimationFrame(loop);
})();
