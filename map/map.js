(() => {
'use strict';
const {places,roads,modes,companions,petPrices,riverPath,cartFare,energyDrinkPrice,forage,clothing}=TripData,E=TripEngine,S=TripSocial,key='wind-trip-map-v1';
const $=id=>document.getElementById(id),vp=$('viewport'),world=$('world'),marker=$('marker');
const dom=(tag,text='')=>{const e=document.createElement(tag);e.textContent=text;return e;};
function newState(){return {...E.fresh(),social:S.restore()};}
function load(){
 try{
  const s=JSON.parse(localStorage.getItem(key));
  if(s&&Number.isInteger(s.at)&&places[s.at]&&Object.hasOwn(modes,s.mode)&&['food','water','energy','health','money','clock','casts'].every(k=>Number.isFinite(s[k])&&s[k]>=0)&&Array.isArray(s.photos)&&Array.isArray(s.owned)&&s.owned.includes(s.mode)&&s.pets&&s.jobs&&s.bag&&['meals','bottles','treats','fish','meds'].every(k=>Number.isInteger(s.bag[k])&&s.bag[k]>=0)){
   s.meetings=s.meetings&&typeof s.meetings==='object'&&!Array.isArray(s.meetings)?s.meetings:{};
   s.companion=Object.hasOwn(companions,s.companion)?s.companion:null;
   for(const item of ['energyDrinks',...Object.keys(forage)])s.bag[item]=Number.isSafeInteger(s.bag[item])&&s.bag[item]>=0?s.bag[item]:0;
   s.foraged=s.foraged&&typeof s.foraged==='object'&&!Array.isArray(s.foraged)?s.foraged:{};
   s.boostUntil=Number.isFinite(s.boostUntil)?s.boostUntil:0;
   s.wardrobe=E.wardrobe(s.wardrobe);
   s.clean=Number.isFinite(s.clean)?Math.max(0,Math.min(100,s.clean)):82;
   s.social=S.restore(s.social);
   s.campAt=s.campAt===s.at&&E.canCamp(s)?s.at:null;
   return s;
  }
 }catch{}
 return newState();
}
let s=load(),selected=s.at, travel=null, cast=null, last=0, hit=0, scale=1, tx=0,ty=0, initialized=false;
$('wardrobe').open=s.at===0;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const scene=globalThis.TripScene3D?.attach($('canvas3d'))??null;
let in3d=false,geographic=false,orbit=0,look=0,viewpoint=false,lastDraw=0,cameraDrag=null,aside=0,needRelease=false,blocked='',motion=false,steerPose=0,speedPose=0,activity=null;
let throttleRamp=0,lastThrottle=0,actualSpeed=0,speedKmh=0,jump=null,jumpRequested=false;
let walkVelocity=0;
let openHost=null,auto=false;
let socialGuest=null,socialScene=null,socialResponse='',shoreVisitors=[];
let clothingPreview=false;
const jumpDuration=.86;
const worldUnitsPerKmh=.44;
const keys=new Set(),buttons=new Map(),inputs={w:'forward',ArrowUp:'forward',s:'back',ArrowDown:'back',a:'left',ArrowLeft:'left',d:'right',ArrowRight:'right'};
const pressing=dir=>[...keys].some(k=>inputs[k]===dir)||[...buttons.values()].includes(dir);
function setAuto(on){
 auto=on;const button=$('auto-walk');
 button.setAttribute('aria-pressed',String(on));button.textContent=on?'Dừng tự đi':'Tự đi';
}
function clearDrive(){keys.clear();buttons.clear();for(const dir of ['left','forward','back','right'])$('drive-'+dir).setAttribute('aria-pressed','false');motion=false;walkVelocity=0;steerPose=0;jump=null;jumpRequested=false;setAuto(false);}
const fullRoute=E.profile(0,places.length-1);
const previewRoute=()=>E.profile(s.at,s.at<places.length-1?s.at+1:s.at-1);
let idleRoute=previewRoute();
const gameClock=()=>s.clock+(travel?.roadMinutes??0);
const activeMode=()=>travel?.plan.mode??s.mode;
const vitals=['food','water','energy','health'];
const currentCondition=()=>travel?E.condition(s,travel.plan,travel.d,travel.damage):s;
function belowAutoThreshold(){
 const current=currentCondition();
 return vitals.some(k=>current[k]<30);
}
$('auto-walk').onclick=()=>{
 if(!in3d||cast)return;
 if(!auto&&s.social.detained){say('Giải quyết ở trạm trước khi đi tiếp.');return;}
 if(!auto&&s.campAt===s.at){say('Thu lều trước khi lên đường.');return;}
 if(!auto&&belowAutoThreshold()){say('Tiếp tế để các chỉ số đạt ít nhất 30% rồi bật Tự đi.');return;}
 setAuto(!auto);
};
function livePos(){return travel?E.roadPoint(travel.plan.profile,travel.d,aside):idleRoute[0];}
function pickupDistance(){
 if(!travel?.pickup)return Infinity;
 const p=livePos(),item=travel.pickup.position;
 return Math.hypot(p.x-item.x,p.z-item.z);
}
function pickupNearby(radius=3.5){
 if(!in3d||jump||pickupDistance()>radius)return false;
 const item=travel.pickup;
 travel.pickup=null;
 say(E.collectForage(s,item));render();return true;
}
function tryPickup(){
 if(!pickupNearby())say('Tiến lại gần vật phẩm rồi bấm E để nhặt.');
}
function turnAround(){
 if(!in3d||!travel||jump)return;
 setAuto(false);
 walkVelocity=0;steerPose=0;
 travel.heading=-travel.facing;
 travel.facing=travel.heading;
 orbit=0;viewpoint=false;look=0;
 say('Đã quay đầu về phía '+places[travel.heading<0?s.at:travel.to].name+'. Giữ W hoặc ▲ để đi tiếp.');
 trailGuide();
}
$('pickup-item').onclick=tryPickup;
$('turn-around').onclick=turnAround;
function locateOnGeoMap(stop=null){
 const [lat,lon]=stop!==null?E.geoPosition(stop):travel?E.geoPosition(s.at,travel.to,travel.d/travel.plan.distance):E.geoPosition(s.at);
 const coordinate=[lat,lon].map(n=>n.toFixed(5)).join(',');
 const isGorge=(stop??s.at)>=6,span=isGorge?.022:.055;
 const bounds=[lon-span,lat-span*.73,lon+span,lat+span*.73].map(n=>n.toFixed(5)).join(',');
 const frame=$('geo-frame');
 frame.src='https://www.openstreetmap.org/export/embed.html?layer=mapnik&bbox='+encodeURIComponent(bounds)+'&marker='+encodeURIComponent(coordinate);
 const reference=stop!==null?places[stop].name:travel?places[s.at].name+' → '+places[travel.to].name:places[s.at].name;
 $('geo-position').textContent=reference+' · '+coordinate.replace(',',', ')+' · Vị trí ước tính';
 $('geo-google').href='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(coordinate);
 $('geo-gorge').hidden=!isGorge;
 if(isGorge){
  const p=stop===null?livePos():{x:places[stop].x,z:places[stop].y};
  const track=(a,b)=>E.profile(a,b).map(v=>[v.x,v.z]);
  $('geo-trace').innerHTML=svgLine(riverPath,'stroke="#398e9a" stroke-width="12"')
   +svgLine(track(6,7),'stroke="#9f663c" stroke-width="7"')
   +svgLine(track(7,9),'stroke="#526b41" stroke-width="5" stroke-dasharray="9 6"')
   +places.slice(7).map(v=>`<circle cx="${v.x}" cy="${v.y}" r="7" fill="#f8efd1" stroke="#395643" stroke-width="3"/>`).join('')
   +`<circle cx="${p.x}" cy="${p.z}" r="8" fill="#edb34b" stroke="#173b2f" stroke-width="3"/>`;
 }
}
function setView(on,geo=false,stop=null){
 clearDrive();needRelease=false;
 if(!on)clothingPreview=false;
 geographic=geo;
 in3d=Boolean(on&&scene);if(on&&!scene)say('Thiết bị không mở được góc nhìn 3D. Bản đồ vẫn dùng được.');
 $('scene-panel').hidden=!in3d;vp.hidden=in3d||geo;$('map-nav').hidden=vp.hidden;$('map-caption').hidden=vp.hidden;
 $('geo-panel').hidden=!geo;$('pace').hidden=geo;
 $('map-view').setAttribute('aria-pressed',String(!vp.hidden));$('scene-view').setAttribute('aria-pressed',String(in3d));$('geo-view').setAttribute('aria-pressed',String(geo));
 if(in3d){scene.reset();lastDraw=0;}
 else if(geo)locateOnGeoMap(stop);
 else if(!geo){const p=livePos();center([p.x,p.z]);}
 trailGuide();
}
$('map-view').onclick=()=>setView(false);$('scene-view').onclick=()=>setView(true);
$('geo-view').onclick=()=>setView(false,true);
$('geo-locate').onclick=()=>locateOnGeoMap();
$('mini').onclick=()=>setView(false);
for(const place of places.slice(7)){
 const link=dom('a',place.name+' ↗');
 link.href='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(place.name+', Hà Giang');
 link.target='_blank';link.rel='noopener noreferrer';$('geo-links').append(link);
}
const fullscreen=$('fullscreen');
let nativeFullscreen=false;
const music=$('music');
music.onclick=async()=>{
 music.disabled=true;
 try{
  const playing=await globalThis.TripMusic.toggle();
  music.textContent=playing?'Tắt nhạc nền':'Bật nhạc nền';
  music.setAttribute('aria-pressed',String(playing));
 }catch{say('Trình duyệt chưa mở được nhạc nền.');}
 finally{music.disabled=false;}
};
function syncFullscreen(){
 if(document.fullscreenElement)nativeFullscreen=true;
 else if(nativeFullscreen){
  nativeFullscreen=false;
  document.body.classList.remove('wide-game');
 }
 const active=Boolean(document.fullscreenElement||document.body.classList.contains('wide-game'));
 fullscreen.textContent=active?'Thoát toàn màn hình':'Toàn màn hình';
 fullscreen.setAttribute('aria-pressed',String(active));
}
document.addEventListener?.('fullscreenchange',syncFullscreen);
fullscreen.onclick=async()=>{
 if(document.fullscreenElement){await document.exitFullscreen();syncFullscreen();return;}
 const expanding=document.body.classList.toggle('wide-game');
 syncFullscreen();
 if(expanding&&document.fullscreenEnabled&&document.documentElement.requestFullscreen){
  try{await document.documentElement.requestFullscreen();syncFullscreen();}catch{}
 }
};
const rotate=n=>{orbit=Math.atan2(Math.sin(orbit+n),Math.cos(orbit+n));};
const tilt=n=>{look=Math.max(-1.43,Math.min(1.03,look+n));};
$('preview-clothing').onclick=()=>{
 if(travel||cast)return;
 if(!in3d)setView(true);
 clothingPreview=!clothingPreview;
 orbit=clothingPreview?Math.PI:0;look=0;viewpoint=false;
 renderWardrobe(selected===s.at);
};
$('orbit-left').onclick=()=>rotate(-.43);$('orbit-right').onclick=()=>rotate(.43);$('orbit-reset').onclick=()=>{
 orbit=0;look=0;viewpoint=false;
 if(clothingPreview){clothingPreview=false;renderWardrobe(selected===s.at);}
};
$('look-up').onclick=()=>tilt(.20);$('look-down').onclick=()=>tilt(-.20);
function lookAtRiver(){
 if(!in3d)setView(true);
 const start=idleRoute[0],ahead=E.sample(idleRoute,9);
 const nearest=riverPath.reduce((a,b)=>Math.hypot(a[0]-start.x,a[1]-start.z)<Math.hypot(b[0]-start.x,b[1]-start.z)?a:b);
 const aim=Math.atan2(nearest[0]-start.x,nearest[1]-start.z);
 orbit=aim-Math.atan2(ahead.x-start.x,ahead.z-start.z)-(s.mode==='walk'?.32:0);
 const distance=Math.max(12,Math.hypot(nearest[0]-start.x,nearest[1]-start.z)-27);
 look=.08-Math.atan2(start.h-7,distance);viewpoint=true;
}
const canvas=$('canvas3d');
function drivingKey(e){return inputs[e.key.length===1?e.key.toLowerCase():e.key];}
window.addEventListener('keydown',e=>{
 if($('phone-dialog').open||e.ctrlKey||e.metaKey||e.altKey||e.target?.closest?.('input,textarea,select,[contenteditable]'))return;
 const key=e.key.toLowerCase();
 if(key==='p'&&!e.repeat){e.preventDefault();openPhone();return;}
 if(!in3d)return;
 if(key==='e'||key==='q'){
  e.preventDefault();
  if(!e.repeat){if(key==='e')tryPickup();else turnAround();}
  return;
 }
 if(e.key===' '&&!e.target?.closest?.('button,a')){
  e.preventDefault();if(!e.repeat)jumpRequested=true;return;
 }
 if(!drivingKey(e))return;
 e.preventDefault();keys.add(e.key.length===1?e.key.toLowerCase():e.key);
});
$('jump').onclick=()=>{jumpRequested=true;};
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
canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;cameraDrag={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{
 if(cameraDrag?.id!==e.pointerId)return;
 rotate((cameraDrag.x-e.clientX)*.009);tilt((e.clientY-cameraDrag.y)*.007);
 cameraDrag.x=e.clientX;cameraDrag.y=e.clientY;
});
['pointerup','pointercancel','lostpointercapture'].forEach(k=>canvas.addEventListener(k,e=>{if(cameraDrag?.id===e.pointerId)cameraDrag=null;}));
let lastStats=NaN;
function meters(v){['food','water','energy','health','clean'].forEach(k=>{$(k).value=v[k];$(k).title=Math.round(v[k])+'/100';});}
function animate(kind,seconds,guest=null){const at=performance.now();activity={kind,at,until:at+seconds*1000,guest};}
function updateStats(){
 const t=travel,clock=Math.floor(gameClock()),weather=E.weather(clock);
 const pickupButton=$('pickup-item'),nearby=in3d&&!jump&&pickupDistance()<=3.5;
 pickupButton.hidden=!nearby;
 if(nearby)pickupButton.textContent='Nhặt '+forage[t.pickup.kind].name.toLowerCase()+' · E';
 $('clock').textContent='N'+E.day({clock})+' · '+E.time(clock);
 $('pace-weather').textContent=weather.label+(weather.mud?' · Đường lầy':'');
 const remaining=t&&t.plan.hazards[t.nextHazard]?t.plan.hazards[t.nextHazard].at-t.d:Infinity;
 $('pace-obstacle').textContent=activeMode()==='walk'&&remaining>=0&&remaining<=4?(remaining<=2.55?'Nhảy · Space':'Chuẩn bị nhảy'):'';
 $('pace-boost').textContent=clock<s.boostUntil?'Tăng lực · '+Math.ceil(s.boostUntil-clock)+' phút':'';
 if(t){
  const g=E.pace(t.plan,t.d,s,t.damage,t.throttle,clock),slope=Math.round(g.slope*100);
  const km=t.plan.km*(t.d/t.plan.distance);
  $('pace-speed').textContent=jump?'Đang nhảy':speedKmh>.05?speedKmh.toFixed(1).replace('.',',')+' km/h':'Đang dừng';
  $('pace-distance').textContent=km.toFixed(1).replace('.',',')+' / '+t.plan.km+' km';
  $('pace-grade').textContent=Math.abs(slope)<2?'Đường bằng':(slope>0?'Lên dốc +':'Xuống dốc ')+slope+'%';
  $('pace-shape').textContent='Thể trạng '+Math.round(g.needs*100)+'%';
  meters(E.condition(s,t.plan,t.d,t.damage));
 }else{$('pace-speed').textContent=jump?'Đang nhảy':'Đang dừng';$('pace-grade').textContent='';$('pace-shape').textContent='';$('pace-distance').textContent='';meters(s);}
}
let miniCourse=null;
let travelerMinute=-1,roadGuests=[];
function drawScene(ms){
 if(!in3d||ms-lastDraw<(reduced?30:14))return;
 lastDraw=ms;
 const t=travel,route=t?t.plan.profile:idleRoute,d=t?t.d:0,p=livePos();
 if(miniCourse!==route){
  miniCourse=route;
  $('mini-route').innerHTML=svgLine(fullRoute.map(v=>[v.x,v.z]),'stroke="#739785" stroke-width="22"')+svgLine(route.map(v=>[v.x,v.z]),'stroke="#325f50" stroke-width="12"')+'<circle id="mini-marker" r="28" fill="#f0c476" stroke="#244b40" stroke-width="9"/>';
 }
 const dot=$('mini-marker');dot.setAttribute('cx',p.x);dot.setAttribute('cy',p.z);
 const clock=gameClock(),minute=Math.floor(clock);
 if(minute!==travelerMinute){travelerMinute=minute;roadGuests=S.travelAt(minute);}
 scene.render({route,d,mode:activeMode(),moving:motion,clothing:s.wardrobe.active,clothingPreview,socialGuests:socialScene,roadGuests,shoreVisitors,detained:Boolean(s.social.detained),bathSite:t?null:places[s.at].bath,offset:aside,speed:speedPose,actualSpeed,viewDirection:t?.facing,jump:jump?.phase??null,steer:steerPose,seconds:ms/1000,orbit,look,viewpoint,camping:s.campAt===s.at,pickup:t?.pickup,reduced,clock,weather:E.weather(clock),
  action:cast?'fish':activity&&ms<activity.until?activity.kind:'',actionTime:cast?(ms-cast.start)/1000:activity?(ms-activity.at)/1000:0,actionDuration:activity?(activity.until-activity.at)/1000:0,romanceGuest:ms<(activity?.until??0)?activity.guest:null,hazard:t?.plan.hazards[t.nextHazard],damage:ms<hit,pets:Object.keys(s.pets).filter(k=>s.pets[k]===2),companion:companions[s.companion]?.outfit});
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
 const nho='M'+riverPath.map(p=>p.join(',')).join('L');
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
const servicesAnimation={meal:['meal',2.5],drink:['drink',2],energyDrink:['drink',2],nap:['rest',3.2],camp:['rest',3.2],photo:['photo',1.7],shower:['shower',7.5],bathe:['bath',8]};
const bathNames={lake:'Tắm hồ',stream:'Tắm suối',pond:'Tắm ao'};
function animateSupply(kind){
 if(Object.hasOwn(forage,kind))animate('snack',2);
 else if(servicesAnimation[kind])animate(...servicesAnimation[kind]);
}
function service(k){
 const place=places[s.at];
 const allowed=(k==='meal'&&s.bag.meals)||(k==='drink'&&s.bag.bottles)||(k==='energyDrink'&&s.bag.energyDrinks&&s.clock>=s.boostUntil)||k==='nap'||(k==='camp'&&s.money>=15)||(k==='photo'&&place.photo&&!s.photos.includes(place.id))||(k==='shower'&&place.services?.includes('rest'))||(k==='bathe'&&place.bath)||(Object.hasOwn(forage,k)&&s.bag[k]);
 say(E.service(s,k));
 if(allowed){
  if((k==='shower'||k==='bathe')&&!in3d&&scene)setView(true);
  if(k==='shower'||k==='bathe'){clearDrive();clothingPreview=false;viewpoint=false;orbit=0;look=0;}
  animateSupply(k);
 }
 save();render();
}
function useSupply(kind){
 if(!travel){service(kind);return;}
 const before=currentCondition(),after={...s,...before};
 const bagKey={meal:'meals',drink:'bottles',energyDrink:'energyDrinks'}[kind]??kind;
 const previous=s.bag[bagKey];
 say(E.service(after,kind,gameClock()));
 for(const stat of vitals)s[stat]+=after[stat]-before[stat];
 s.boostUntil=after.boostUntil;
 if(s.bag[bagKey]<previous&&kind!=='med'){
  clearDrive();animateSupply(kind);
 }
 render();
}
function supplyActions(){
 const v=currentCondition();
 if(s.bag.meals)action('Ăn cơm',()=>useSupply('meal'),!travel&&v.food===100);
 if(s.bag.bottles)action('Uống nước',()=>useSupply('drink'),!travel&&v.water===100);
 if(s.bag.energyDrinks)action('Uống nước tăng lực',()=>useSupply('energyDrink'),!travel&&s.clock<s.boostUntil);
 if(s.bag.meds)action('Sơ cứu · +45 máu',()=>useSupply('med'),!travel&&v.health===100);
 for(const [kind,item] of Object.entries(forage)){
  if(s.bag[kind])action('Ăn '+item.name.toLowerCase()+' · +'+item.food+' no',()=>useSupply(kind),!travel&&v.food===100&&(!item.water||v.water===100));
 }
}
function travelStart(direction,mode=s.mode){
 const to=s.at+direction;if(!places[to]||travel||cast)return;
 if(s.social.detained){
  setAuto(false);
  if(blocked!=='detained'){blocked='detained';say('Giải quyết ở trạm trước khi đi tiếp.');}
  return;
 }
 if(s.campAt===s.at){if(!blocked){blocked='camp';say('Thu lều trước khi lên đường.');}return;}
 const plan=E.trip(s.at,to,mode);
 if(!E.canTravel(s,plan)){
  setAuto(false);
  if(blocked!==String(to)){
   blocked=String(to);
   say(plan.footOnly&&mode!=='walk'?'Đường mòn chỉ đi bộ. Hãy đổi sang đi bộ trước khi lên đường.':'Chưa đủ no, nước, sức hoặc tiền cho chặng này. Hãy tiếp tế trước.');
  }
  return;
 }
 const pickup=E.forageSpot(s,s.at,to,plan.distance);
 if(pickup)pickup.position=E.roadPoint(plan.profile,pickup.at,plan.footOnly?.85:2.4);
 blocked='';activity=null;openHost=null;socialResponse='';travel={to,plan,d:0,direction,heading:1,facing:1,throttle:1,nextHazard:0,damage:0,roadMinutes:0,holdUntil:0,warned:false,pickup};
 selected=s.at;orbit=0;look=0;viewpoint=false;clothingPreview=false;aside=0;
 say(mode==='cart'?'Xe bò đã sẵn sàng. Giữ W hoặc ▲ để đi, trả tiền khi tới nơi.':'Đang hướng tới '+places[to].name+'. Nhả phím để dừng.');render();
}
function finishTravel(){
 const t=travel;travel=null;aside=0;motion=false;needRelease=true;walkVelocity=0;steerPose=0;
 setAuto(false);
 if(!E.arrive(s,t.to,t.plan,0,t.damage,t.roadMinutes)){say('Không thể hoàn thành chặng.');render();return;}
 selected=s.at;idleRoute=previewRoute();E.meet(s);save();
 const person=companions[E.encounter(s)?.person];
 say('Đã tới '+places[s.at].name+(t.damage?' · −'+t.damage+' máu.':'.')+(person?' Gặp '+person.name+' ở điểm dừng.':''));
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
 $('jump').hidden=activeMode()!=='walk';
 $('turn-around').hidden=!t;
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
 const destination=t?.to??next,kilometers=t?.plan.km??TripData.legKilometers[Math.min(s.at,destination)];
 title.textContent=t?.heading===-1?'Quay về '+places[s.at].name:places[destination].name+' · khoảng '+kilometers+' km';
 const footOnly=t?.plan.footOnly??roads[Math.min(s.at,destination)].footOnly;
 detail.textContent=s.at===places.length-1&&!t?'Giữ S hoặc ▼ để trở về Sống lưng Khủng long.':
  footOnly?'Đường mòn chỉ đi bộ · W/S đi, Q quay đầu, E nhặt đồ.':
  activeMode()==='walk'?'W/S tiến hoặc lùi · A/D né · Q quay đầu · E nhặt đồ · Space nhảy.':'W/S tiến hoặc lùi · A/D né · Q quay đầu · E nhặt đồ.';
}
function renderWardrobe(local){
 const panel=$('wardrobe'),options=$('clothing-options');
 panel.hidden=!local||Boolean(travel||cast);
 if(panel.hidden)return;
 $('current-clothing').textContent=clothing[s.wardrobe.active].name;
 const preview=$('preview-clothing');
 preview.hidden=!scene;
 preview.textContent=clothingPreview?'Về góc nhìn đi đường':'Xem nhân vật gần hơn';
 preview.setAttribute('aria-pressed',String(clothingPreview));
 options.replaceChildren();
 for(const [id,outfit] of Object.entries(clothing)){
  const owned=s.wardrobe.owned.includes(id),active=s.wardrobe.active===id;
  if(!owned&&!E.sellsClothing(s))continue;
  const row=dom('div'),swatch=dom('span'),button=dom('button',active?'Đang mặc':owned?'Mặc':'Mua & mặc · '+outfit.price+'k');
  row.className='clothing-option';swatch.style.backgroundColor=outfit.accent;swatch.setAttribute('aria-hidden','true');
  button.type='button';button.disabled=active||(!owned&&s.money<outfit.price);
  button.setAttribute('aria-pressed',String(active));
  button.setAttribute('aria-label',button.textContent+' · '+outfit.name);
  button.onclick=()=>{
   if(travel||cast||selected!==s.at)return;
   if(owned?E.equipClothing(s,id):E.buyClothing(s,id)){
    say((owned?'Đã mặc ':'Đã mua và mặc ')+outfit.name+'.');save();render();
   }
  };
  row.append(swatch,dom('strong',outfit.name),button);options.append(row);
 }
}
function socialButton(text,click,disabled=false){
 const button=dom('button',text);button.type='button';button.disabled=disabled;button.onclick=click;
 return button;
}
const relationshipNames={dating:'Đang yêu',engaged:'Đã đính hôn',married:'Đã kết hôn'};
function renderSocial(local){
 const panel=$('social-panel'),spot=S.venue(s),content=$('social-content');
 const atStop=!travel&&!cast&&!s.social.detained;
 socialScene=atStop&&spot?.guests.length?spot.guests:null;
 shoreVisitors=atStop?S.bathing(s):[];
 panel.hidden=(!local&&!s.social.detained)||!spot||Boolean(travel||cast);
 if(panel.hidden)return;
 $('social-venue').textContent=s.social.detained?'Trạm cảnh sát':spot.name;
 $('social-stats').textContent='Uy tín '+s.social.reputation+' · '+s.social.followers.toLocaleString('vi-VN')+' theo dõi · '+s.social.clips+' clip';
 $('social-banter').textContent=s.social.detained?'Chuyến đi tạm dừng để giải quyết vụ xô xát ở '+spot.name+'.':S.banter(s,spot);
 const response=$('social-response');
 response.hidden=!socialResponse;response.textContent=socialResponse;
 content.replaceChildren();
 function finish(message,animation,duration=2.4,guest=null){
  if(!message)return;
  if(animation==='private'){
   clearDrive();if(!in3d&&scene)setView(true);
   $('private-scene').hidden=false;
  }
  socialResponse=message;say(message);if(animation)animate(animation,duration,guest);save();render();
 }
 if(s.social.detained){
  panel.open=true;
  content.append(socialButton('Giải quyết ở trạm',()=>finish(S.settle(s))));
  return;
 }
 if(!spot.guests.length)return;
 if(!spot.guests.includes(socialGuest))socialGuest=spot.guests[0];
 const selector=dom('div');selector.className='social-guests';
 for(const id of spot.guests){
  const button=socialButton(S.creators[id].name,()=>{socialGuest=id;socialResponse='';renderSocial(true);});
  button.setAttribute('aria-pressed',String(id===socialGuest));selector.append(button);
 }
 const id=socialGuest,creator=S.creators[id],person=S.contact(s,id);
 const profile=dom('div'),portrait=dom('img'),description=dom('div');
 profile.className='social-profile';portrait.src='assets/creator-'+(creator.asset??id)+'.webp';portrait.alt=creator.name;portrait.loading='lazy';
 if(creator.colorShift)portrait.style.filter='hue-rotate('+creator.colorShift+'deg)';
 const familiarity=person.bond?'Thân thiết '+person.bond+'/100':'Chưa làm quen';
 description.append(dom('strong',creator.name+' · '+creator.role),dom('p',[creator.handle,familiarity].filter(Boolean).join(' · ')),dom('p',creator.bio));
 if(creator.romance&&person.bond){
  const status=relationshipNames[person.relationship]??(person.dates?'Đang tìm hiểu':'');
  const detail=['Cảm tình '+person.affection+'/100',person.dates?person.dates+' buổi hẹn':'',status,person.open?'Đồng ý hẹn hò mở':''].filter(Boolean).join(' · ');
  const relationship=dom('p',detail);relationship.className='social-relationship';description.append(relationship);
 }
 profile.append(portrait,description);
 const actions=dom('div');actions.className='social-actions';
 for(const [key,details] of Object.entries(S.actions)){
  if(!S.visible(s,id,key))continue;
  const label=key==='outing'?spot.outing+' · '+details.cost+'k':key==='breakup'&&person.relationship==='married'?'Ly hôn':details.label;
  const romance=['flirt','date','confess','proposal','wedding'].includes(key);
  const animation=key==='private'?'private':romance?'romance':key==='clip'?'photo':key==='meal'?'meal':null;
  const button=socialButton(label,()=>finish(S.interact(s,id,key),animation,key==='private'?3.9:romance?3.5:2.4,romance?id:null),!S.available(s,id,key,spot));
  button.title=S.requirements(s,id,key);
  actions.append(button);
 }
 content.append(selector,profile);
 if(S.visible(s,id,'private'))content.append(dom('p',creator.name+' muốn dành thời gian riêng tư cùng anh. Anh muốn ở lại không?'));
 else if(person.planFamily)content.append(dom('p','Hai người đang mong có em bé.'));
 content.append(actions);
 if(S.conflict(s,spot)){
  const incident=dom('div'),choices=dom('div');incident.className='social-incident';choices.className='social-actions';
  incident.append(dom('p','Hai khách cãi nhau vì chen hàng. Anh muốn xử lý thế nào?'));
  choices.append(socialButton('Can ngăn',()=>finish(S.resolve(s,'calm'))),
   socialButton('Gây gổ',()=>{setAuto(false);finish(S.resolve(s,'fight'),'scuffle',1.35);}));
  incident.append(choices);content.append(incident);
 }
}
function renderContacts(){
 const book=$('contacts-book'),entries=Object.entries(s.social.contacts).filter(([,person])=>person.bond>0);
 book.hidden=entries.length===0;
 if(!entries.length)return;
 $('contacts-title').textContent='Sổ liên lạc · '+entries.length;
 const list=$('contacts-list');list.replaceChildren();
 entries.sort(([a,first],[b,second])=>Number(Boolean(second.relationship))-Number(Boolean(first.relationship))||S.creators[a].name.localeCompare(S.creators[b].name,'vi'));
 for(const [id,person] of entries){
  const row=dom('li'),status=relationshipNames[person.relationship];
  row.append(dom('strong',S.creators[id].name+(status?' · '+status:'')),dom('span',S.appearance(s,id)));
  list.append(row);
 }
}
const phone=$('phone-dialog');
const searchable=value=>value.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().replaceAll('đ','d');
const phonePeople=Object.entries(S.creators).sort(([,a],[,b])=>a.name.localeCompare(b.name,'vi')).map(([id,person])=>({id,person,search:searchable([person.name,person.role,person.handle].filter(Boolean).join(' '))}));
let phonePerson='an',phoneKnown=false,phoneStage='';
function timeLabel(clock){return 'Ngày '+E.day({clock})+' · '+E.time(Math.floor(clock));}
function renderPhoneList(){
 const query=searchable($('phone-search').value??'').trim(),list=$('phone-people');
 const matches=phonePeople.filter(({id,search})=>(!phoneKnown||S.contact(s,id).bond>0)&&search.includes(query));
 if(!matches.some(({id})=>id===phonePerson))phonePerson=matches[0]?.id??null;
 $('phone-count').textContent=matches.length?matches.length+' người':phoneKnown&&!query?'Anh chưa làm quen với ai.':'Không tìm thấy người phù hợp.';
 list.replaceChildren();
 for(const {id,person} of matches){
  const row=dom('li'),button=socialButton(person.name,()=>{
   phonePerson=id;for(const item of list.children)item.firstElementChild.setAttribute('aria-pressed',String(item.firstElementChild===button));
   renderPhoneProfile(true);
  });
  button.setAttribute('aria-pressed',String(id===phonePerson));row.append(button);list.append(row);
 }
 renderPhoneProfile(true);
}
function renderPhoneProfile(force=false){
 const clock=Math.floor(gameClock()),profile=$('phone-profile');
 $('phone-time').textContent=timeLabel(clock);
 if(!phonePerson){profile.replaceChildren();return;}
 const person=S.creators[phonePerson],stage=S.life(phonePerson,clock),key=phonePerson+' '+Math.floor(clock/15)+' '+stage.start;
 if(!force&&phoneStage===key)return;
 phoneStage=key;
 const life=S.lifeProfile(phonePerson,clock),connection=S.contact(s,phonePerson);
 const head=dom('div'),portrait=dom('img'),info=dom('div');
 head.className='phone-person';portrait.src='assets/creator-'+(person.asset??phonePerson)+'.webp';portrait.alt='';
 if(person.colorShift)portrait.style.filter='hue-rotate('+person.colorShift+'deg)';
 info.append(dom('h3',person.name),dom('p',[person.role,person.handle,relationshipNames[connection.relationship]].filter(Boolean).join(' · ')),dom('p',person.bio));
 head.append(portrait,info);
 const current=dom('div');current.className='phone-now';
 current.append(dom('strong',life.current.label),dom('p',life.place));
 if(life.nearby.length)current.append(dom('p','Có mặt cùng '+life.nearby.map(id=>S.creators[id].name).join(', ')));
 const stop=life.current.at??life.current.to;
 current.append(socialButton('Xem điểm dừng trên sơ đồ',()=>{
  phone.close();setView(false);select(stop);center(coords(places[stop]));
 }));
 profile.replaceChildren(head,current);
 const timeline=(title,rows,description,when)=>{
  if(!rows.length)return;
  const section=dom('section'),list=dom('ul');section.className='phone-timeline';section.append(dom('h4',title),list);
  for(const part of rows){const row=dom('li');row.append(dom('time',timeLabel(when(part))),dom('span',description(part)));list.append(row);}
  profile.append(section);
 };
 const entry=part=>part.label+' · '+S.stagePlace(part);
 timeline('Sắp tới',life.next,entry,part=>part.start);
 timeline('Đã gặp gỡ',life.meetings,part=>part.label+' với '+part.with.map(id=>S.creators[id].name).join(', ')+' · '+places[part.at].name,part=>part.time);
 timeline('Nhật ký gần đây',life.recent,entry,part=>part.start);
}
function openPhone(){
 if(phone.open)return;
 clearDrive();renderPhoneList();phone.showModal();$('close-phone').focus();
}
$('open-phone').onclick=openPhone;
$('close-phone').onclick=()=>phone.close();
phone.addEventListener('close',()=>$('open-phone').focus());
$('phone-search').addEventListener('input',renderPhoneList);
for(const [id,known] of [['phone-all',false],['phone-known',true]])$(id).onclick=()=>{
 phoneKnown=known;$('phone-all').setAttribute('aria-pressed',String(!known));$('phone-known').setAttribute('aria-pressed',String(known));renderPhoneList();
};
function renderFamily(){
 const family=S.familyStatus(s),panel=$('family-panel');
 panel.hidden=!family;
 if(!family)return;
 $('family-state').textContent=family.days?'Anh và '+family.name+' đang chờ đón em bé. Còn '+family.days+' ngày đến ngày dự sinh.':'Em bé của anh và '+family.name+' đã chào đời.';
 const actions=$('family-actions');actions.replaceChildren();
 if(travel||cast||s.social.detained||!places[s.at].services?.includes('rest'))return;
 const key=family.days?'wait':'care',label=family.days?'Nghỉ đến ngày dự sinh':family.cared?'Đã chăm bé hôm nay':'Chăm em bé';
 actions.append(socialButton(label,()=>{
  const message=S.familyAction(s,key);if(message){say(message);save();render();}
 },family.cared));
}
let idleElapsed=0,lastSocietyMinute=-1,lastSocialView='';
function advanceSociety(elapsed){
 idleElapsed+=elapsed;
 const minutes=Math.floor(idleElapsed/2.4);
 if(minutes){
  idleElapsed-=minutes*2.4;
  if(travel)travel.roadMinutes+=minutes;
  else{s.clock+=minutes;save();}
 }
 const minute=Math.floor(gameClock());
 if(minute===lastSocietyMinute)return;
 lastSocietyMinute=minute;
 if(phone.open)renderPhoneProfile();
 if(travel||cast)return;
 const spot=S.venue(s),day=E.day(s),swimmers=S.bathing(s);
 const view=[s.at,day,s.social.detained,spot?.guests.join(','),swimmers.join(','),Math.floor(minute/16)].join('/');
 if(view!==lastSocialView){lastSocialView=view;renderSocial(selected===s.at);renderContacts();renderFamily();}
}
function render(){
 const p=places[selected],local=selected===s.at;
 $('mode').textContent=modes[activeMode()].name;$('money').textContent=s.money+'k ₫';updateStats();
 $('place-tag').textContent=p.kind+(local?' · ĐANG Ở':'');$('place').textContent=p.name;$('summary').textContent=p.description;photo(p);
 const gathered=Object.entries(forage).filter(([k])=>s.bag[k]).map(([k,item])=>item.icon+' '+s.bag[k]);
 $('bag').textContent=[`🍚 ${s.bag.meals} · 💧 ${s.bag.bottles} · ⚡ ${s.bag.energyDrinks} · 🐟 ${s.bag.fish} · ✚ ${s.bag.meds} · 🦴 ${s.bag.treats}`,...gathered].join(' · ');
 const pets=Object.keys(s.pets).filter(k=>s.pets[k]===2),petIcons=pets.map(k=>k==='dog'?'🐕':'🐈').join(' ');
 const party=[companions[s.companion]?.name,...pets.map(k=>k==='dog'?'🐕 Chó':'🐈 Mèo')].filter(Boolean);
 $('mission').textContent=s.photos.length===3?'Hoàn thành bộ ảnh Hà Giang!':'Bộ ảnh Hà Giang: '+s.photos.length+'/3';
 $('party').hidden=!party.length;$('party').textContent=party.length?'Đi cùng '+party.join(' · '):'';
 $('message').textContent=showText;marker.textContent=petIcons||modes[activeMode()].icon;marker.title=modes[activeMode()].name;
 pinState();$('actions').replaceChildren();trailGuide();renderWardrobe(local);renderSocial(local);renderFamily();renderContacts();
 if(travel){route(travel.plan,travel.d);supplyActions();return;}
 position(...coords(places[s.at]));
 if(s.social.detained){route(null);return;}
 if(cast){route(null);action('Giật cần',catchNow);return;}
 if(selected>=7)action('Đối chiếu trên bản đồ thật',()=>setView(false,true,selected));
 if(!local){
  route(null);
  action('Xem điểm đang đứng',()=>select(s.at));
 }else{
  route(null);
  if(selected>=7&&scene)action('Ngắm sông từ vách đá',lookAtRiver);
  if(p.photo)action(s.photos.includes(p.id)?'✓ Đã check-in':'Check-in · Lưu ảnh',()=>service('photo'),s.photos.includes(p.id));
  if(p.services?.includes('fish'))action('Thả câu',()=>{cast={start:performance.now(),phase:0};say('Phao đang nổi. Canh lúc phao chìm rồi giật cần.');render();},!E.canFish(s));
  if(p.services?.includes('job'))action('Phụ quán · +38k',()=>service('job'),!E.canWork(s));
  if(p.services?.includes('sell'))action('Bán '+s.bag.fish+' cá · '+s.bag.fish*16+'k',()=>service('sell'),!s.bag.fish);
  const encounter=E.encounter(s),person=companions[encounter?.person],pet=E.localPet(s);
  if(person&&!s.companion&&!encounter.invited){
   const description=dom('p',person.name+' · '+person.bio);
   const card=dom('div');card.className='encounter';
   if(person.portrait){
    const portrait=dom('img');portrait.src=person.portrait;portrait.alt='Chân dung '+person.name;portrait.width=68;portrait.height=68;
    card.append(portrait);
   }
   card.append(description);$('actions').append(card);
   action('Rủ '+person.name+' đi cùng',()=>{say(E.invite(s));save();render();});
  }
  if(s.companion)action('Chia tay '+companions[s.companion].name,()=>{say(companions[s.companion].name+' đã tách đoàn.');s.companion=null;save();render();});
  const trust=E.petProgress(s);
  if(pet&&trust<2){
   const animal=pet==='dog'?'chó':'mèo';
   action(trust===0?'Ngồi yên làm quen với '+animal+' hoang':'Đặt đồ ăn rồi lùi lại · Nhận nuôi '+animal,()=>service(trust===0?'waitPet':'befriend'),trust===1&&!s.bag.treats);
  }
  if(p.id==='dong')for(const kind of pets)action('Bán '+(kind==='dog'?'chó':'mèo')+' · +'+petPrices[kind]+'k',()=>{say(E.sellPet(s,kind));save();render();});
  if(p.host){
   action(openHost===p.id?'Chào ra về':'Gõ cửa nhà '+p.host.name,()=>{
    const leaving=openHost===p.id;openHost=leaving?null:p.id;
    say(leaving?'Chào chủ nhà rồi tiếp tục lên đường.':p.host.greeting);render();
   });
  }
  if(p.services?.includes('shop')&&(!p.host||openHost===p.id)){
   action('Cơm · 18k',()=>service('buyMeal'),s.money<18);action('Nước · 8k',()=>service('buyWater'),s.money<8);
   action('Đồ ăn cho thú · 12k',()=>service('buyTreat'),s.money<12);action('Túi sơ cứu · 22k',()=>service('buyMed'),s.money<22);
   action('Nước tăng lực · '+energyDrinkPrice+'k',()=>service('buyEnergyDrink'),s.money<energyDrinkPrice);
   const value=Object.entries(forage).reduce((sum,[k,v])=>sum+s.bag[k]*v.price,0);
   if(value)action('Bán đồ nhặt được · +'+value+'k',()=>service('sellForage'));
  }
  if(p.services?.includes('garage')){
   Object.entries(modes).filter(([id,v])=>Number.isFinite(v.price)&&!s.owned.includes(id)).forEach(([id,v])=>action('Mua '+v.name.toLowerCase()+' · '+v.price+'k',()=>{if(E.buyVehicle(s,id)){say('Đã mua '+v.name+'.');save();render();}},s.money<v.price));
   if(scene&&places[s.at+1]&&!roads[s.at].footOnly){
    action('Thuê xe bò chặng tới · '+cartFare+'k',()=>{
     if(!in3d)setView(true);travelStart(1,'cart');
    },!E.canTravel(s,E.trip(s.at,s.at+1,'cart')));
   }
  }
  if(p.services?.includes('rest')){
   action('Tắm ở trạm',()=>service('shower'));
   action('Ngủ tại trạm · 15k',()=>service('camp'),s.money<15);
  }
  if(p.bath)action(bathNames[p.bath],()=>service('bathe'));
  if(E.canCamp(s)){
   if(s.campAt===s.at){
    action('Chờ tối ngắm sao',()=>{service('waitStars');if(!in3d)setView(true);look=.58;});
    action('Ngủ trong lều đến sáng',()=>{service('sleepTent');look=0;});
    action('Thu lều',()=>service('packTent'));
   }else action('Tự dựng lều',()=>service('pitchTent'));
  }
  if(p.services?.includes('help')&&E.needsHelp(s))action('Nhận suất hỗ trợ',()=>service('help'));
 }
 supplyActions();
 action('Ngồi nghỉ · +32 sức',()=>service('nap'),s.energy>90);
 for(const id of s.owned)if(id!==s.mode)action('Đổi sang '+modes[id].name.toLowerCase(),()=>{E.setVehicle(s,id);save();render();});
 if(E.needsRescue(s))action('Gọi hỗ trợ đường xa',()=>{if(E.rescue(s)){say('Được tiếp tế đủ đi bộ tới trạm gần nhất. Mất hai giờ.');save();render();}});
}
function loop(ms){
 const elapsed=Math.max(0,(ms-(last||ms))/1000),dt=Math.min(.075,elapsed);last=ms;
 if(auto&&belowAutoThreshold()){setAuto(false);walkVelocity=0;steerPose=0;say('Đã dừng tự đi: có chỉ số dưới 30%. Dùng đồ tiếp tế trong túi.');}
 const manual=Number(pressing('forward'))-Number(pressing('back'));
 const privateScene=ms<(activity?.until??0)&&activity.kind==='private';
 const busy=privateScene||ms<(activity?.until??0)&&(activity.kind==='bath'||activity.kind==='shower');
 if($('private-scene').hidden===privateScene)$('private-scene').hidden=!privateScene;
 const drive=in3d&&!cast&&!busy&&!phone.open?(manual||(auto?(travel?.direction??(s.at===places.length-1?-1:1)):0)):0;
 motion=false;actualSpeed=0;speedKmh=0;
 if(!drive){needRelease=false;blocked='';}
 if(!travel&&drive&&!needRelease)travelStart(drive);
 const nextObstacle=travel?.plan.hazards[travel.nextHazard],mode=activeMode();
 const obstacleDistance=nextObstacle?nextObstacle.at-travel.d:Infinity;
 const input=travel?drive*travel.direction*travel.heading:0;
 let steering=travel&&in3d?Number(pressing('right'))-Number(pressing('left')):0;
 if(travel)steering*=travel.facing;
 if(auto&&travel&&!steering&&mode!=='walk'){
  const target=input>0&&obstacleDistance>0&&obstacleDistance<40?4.2:0;
  if(Math.abs(aside-target)>.18)steering=Math.sign(target-aside);
 }
 steerPose+=(steering-steerPose)*(1-Math.exp(-dt*13));
 if(auto&&input>0&&mode==='walk'&&obstacleDistance>1.6&&obstacleDistance<=2.2)jumpRequested=true;
 if(jumpRequested&&in3d&&!cast&&mode==='walk'&&!jump&&(!activity||ms>=activity.until)&&(!travel||ms>=travel.holdUntil)){
  jump={phase:-.075/jumpDuration,direction:input};
 }
 jumpRequested=false;
 const oldJump=jump?.phase??null;
 if(jump){jump.phase+=dt/jumpDuration;if(jump.phase>=1)jump=null;}
 const throttle=jump?jump.direction:input;
 if(!throttle||throttle!==lastThrottle)throttleRamp=0;
 lastThrottle=throttle;
 if(travel&&in3d){
  const t=travel,prior=t.d,clock=gameClock(),weather=E.weather(clock);
  const oldOffset=aside;
  const lateral=mode==='walk'?1.95:3.5+3.2*Math.abs(steerPose);
  const limit=t.plan.footOnly?1:5.6;
  const lateralInput=mode==='walk'?Math.abs(steerPose)>.025?steerPose:0:steering;
  aside=Math.max(-limit,Math.min(limit,aside+lateralInput*lateral*(1-.18*weather.mud)*(jump?.22:1)*dt));
  motion=aside!==oldOffset;
  const walk=mode==='walk';
  const direction=throttle||(walk?Math.sign(walkVelocity):0);
  if(direction&&ms>=t.holdUntil){
   const qty=E.pace(t.plan,t.d,s,t.damage,direction,clock);
   const strideSpeed=qty.speed*worldUnitsPerKmh;
   const groundedSpeed=strideSpeed*(direction!==t.heading?.58:1)*(Math.abs(aside)>3.7?.76:1);
   let velocity;
   if(walk){
    const airborne=jump&&jump.phase>=0;
    const target=throttle*(airborne?Math.max(groundedSpeed,5.15*(1-weather.mud*.15)):groundedSpeed*(jump?.8:1));
    const rate=airborne?26:!throttle||Math.sign(walkVelocity)===-throttle?14:9;
    walkVelocity+=Math.max(-rate*dt,Math.min(rate*dt,target-walkVelocity));
    velocity=walkVelocity;
   }else{
    throttleRamp=Math.min(1,throttleRamp+dt/.49);
    velocity=throttle*groundedSpeed*(.18+.82*throttleRamp*throttleRamp*(3-2*throttleRamp));
   }
   if(velocity!==0){t.facing=Math.sign(velocity);t.throttle=t.facing;}
   t.d=Math.max(0,Math.min(t.plan.distance,t.d+velocity*dt));
   motion=motion||t.d!==prior;
   actualSpeed=dt?(t.d-prior)/dt:0;
   speedKmh=Math.abs(actualSpeed)/worldUnitsPerKmh;
   speedPose=speedKmh/t.plan.speed;
   const next=t.plan.hazards[t.nextHazard];
   if(next&&!t.warned&&next.at-t.d<(mode==='walk'?10:36)){
    t.warned=true;say(next.name+' phía trước. '+(mode==='walk'?'Nhảy khi hiện nhắc Space, hoặc né bằng A/D.':'Né hẳn sang trái hoặc phải bằng A/D.'));
   }
   if(next&&prior<next.at&&t.d>=next.at){
    t.nextHazard++;
    const crossing=(next.at-prior)/(t.d-prior);
    const height=oldJump===null?0:E.jumpHeight(oldJump+crossing*dt/jumpDuration);
    if(Math.abs(aside)>=(mode==='car'||mode==='cart'?3.35:2.4))say('Đã né được chướng ngại.');
    else if(height>=next.height)say('Đã nhảy qua chướng ngại.');
    else{
     const damage=Math.min(t.plan.impact,Math.max(0,s.health-t.damage-1));
     t.damage+=damage;hit=performance.now()+700;t.holdUntil=ms+600;throttleRamp=0;walkVelocity=0;jump=null;
     say('Va chạm! −'+damage+' máu. Anh có thể đi tiếp sau khi đứng lại một nhịp.');
    }
   }
   if(speedKmh>0)t.roadMinutes+=60*t.plan.km*Math.abs(t.d-prior)/(t.plan.distance*Math.min(speedKmh,qty.speed));
   if(t.d!==prior)pickupNearby(2.6);
   if(t.d>=t.plan.distance)finishTravel();
   else if(t.d===0&&velocity<0){
    for(const stat of ['food','water','energy'])s[stat]=Math.min(100,s[stat]);
    s.health=Math.max(1,Math.min(100,s.health-t.damage));s.clock+=Math.ceil(t.roadMinutes);travel=null;aside=0;needRelease=true;motion=false;walkVelocity=0;steerPose=0;setAuto(false);
    save();say('Đã quay về '+places[s.at].name+'.');render();
   }
  }
 }
 if(travel){if(motion&&!actualSpeed)pickupNearby(2.6);const p=livePos();position(p.x,p.z);}
 if(cast){
  const age=performance.now()-cast.start;
  if(age>=2450){cast=null;say(E.catchFish(s,Infinity));save();render();}
  else if(age>=1250&&!cast.phase){cast.phase=1;say('● Phao chìm! Bấm Giật cần ngay.');}
 }
 advanceSociety(actualSpeed?elapsed-dt:elapsed);
 if(ms-(lastStats||0)>90){updateStats();lastStats=ms;}
 drawScene(ms);
 requestAnimationFrame(loop);
}
$('reset').onclick=()=>{if(confirm('Bắt đầu lại và xóa tiến độ bản đồ?')){s=newState();$('wardrobe').open=true;selected=0;travel=null;cast=null;activity=null;openHost=null;socialGuest=null;socialResponse='';idleRoute=previewRoute();orbit=0;look=0;viewpoint=false;clothingPreview=false;aside=0;clearDrive();needRelease=false;save();overview();say('Chuyến mới bắt đầu tại Hà Giang.');render();}};
if(s.at!==0&&!E.encounter(s)){E.meet(s);save();}
buildTerrain();overview();initialized=true;setView(Boolean(scene));render();requestAnimationFrame(loop);
})();
