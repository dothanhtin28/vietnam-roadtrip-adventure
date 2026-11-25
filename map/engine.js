'use strict';
globalThis.TripEngine = (() => {
const {places,roads,modes,geoAnchors,legKilometers,companions,petPrices,cartFare,energyDrinkPrice,forage}=TripData;
const fresh=()=>({at:0,food:84,water:88,energy:91,health:100,money:45,clock:450,mode:'walk',owned:['walk'],bag:{meals:1,bottles:1,treats:1,fish:0,meds:0,energyDrinks:0,mushrooms:0,corn:0,fruit:0},foraged:{},boostUntil:0,campAt:null,photos:[],pets:{dog:0,cat:0},jobs:{},casts:0,meetings:{},companion:null});
const campingStops=new Set(['start','river','yen','dong','nho-que']);
const canCamp=s=>campingStops.has(places[s.at].id);
const clamp=(v)=>Math.max(0,Math.min(v,100));
const time=mins=>String(Math.floor(mins/60)%24).padStart(2,'0')+':'+String(mins%60).padStart(2,'0');
const day=s=>Math.floor(s.clock/1440)+1;
const weatherStates={
 clear:{kind:'clear',label:'Trời quang',mud:0,speed:1},
 heat:{kind:'heat',label:'Nắng gắt',mud:0,speed:.85},
 rain:{kind:'rain',label:'Mưa rào',mud:1,speed:.73},
 wind:{kind:'wind',label:'Gió mạnh',mud:.52,speed:.88},
 night:{kind:'night',label:'Trời tối',mud:0,speed:.93}
};
function weather(clock){
 const minute=clock%1440,shift=(Math.floor(clock/1440)%3)*35;
 if(minute<330||minute>=1110)return weatherStates.night;
 if(minute>=910+shift)return weatherStates.wind;
 if(minute>=740+shift)return weatherStates.rain;
 if(minute>=570+shift)return weatherStates.heat;
 return weatherStates.clear;
}
function path(from,to){
 const dir=Math.sign(to-from), out=[[places[from].x,places[from].y]];
 for(let i=from; i!==to; i+=dir){
  const leg=roads[Math.min(i,i+dir)], bends=dir>0?leg.bends:[...leg.bends].reverse();
  const p=places[i+dir];out.push(...bends,[p.x,p.y]);
 }
 return out;
}
const length=ps=>ps.reduce((n,p,i)=>i?n+Math.hypot(p[0]-ps[i-1][0],p[1]-ps[i-1][1]):n,0);
function pointAt(path,d){
 for(let i=1;i<path.length;i++){
  const a=path[i-1],b=path[i],len=Math.hypot(b[0]-a[0],b[1]-a[1]);
  if(d<=len){const t=len?Math.max(0,d)/len:0;return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];}d-=len;
 }
 return path.at(-1);
}
// Elevations are game-world units, not surveyed terrain. Compute one profile so
// the road mesh, speed simulation and grade indicator agree, in both directions.
const elevations=[12,17,38,66,82,119,138,140,148,127];
const bound=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const jumpHeight=phase=>phase===null||phase<=0||phase>=1?0:4*1.27*phase*(1-phase);
const obstacleHeight={rock:.82,mud:.22,branch:.58};
function geoPosition(from,to=from,fraction=0){
 const progress=bound(fraction,0,1);
 if(from!==to&&Math.abs(from-to)===1&&Math.min(from,to)>=6){
  const route=profile(from,to),p=sample(route,route.at(-1).d*progress);
  return TripData.toGeo(p.x,p.z);
 }
 return geoAnchors[from].map((coordinate,i)=>coordinate+(geoAnchors[to][i]-coordinate)*progress);
}
const routeProfile=[];
function roundBends(points){
 const out=[points[0]];
 for(let i=1;i<points.length-1;i++){
  const a=points[i-1],b=points[i],c=points[i+1];
  const inLength=length([a,b]),outLength=length([b,c]);
  const radius=Math.min(13,inLength*.28,outLength*.28);
  const start=b.map((v,j)=>v+(a[j]-v)*radius/inLength);
  const end=b.map((v,j)=>v+(c[j]-v)*radius/outLength);
  for(let step=0;step<=6;step++){
   const t=step/6,u=1-t;
   out.push(b.map((v,j)=>u*u*start[j]+2*u*t*v+t*t*end[j]));
  }
 }
 out.push(points.at(-1));
 return out;
}
for(let i=0;i<roads.length;i++){
 const points=roundBends(path(i,i+1)), dist=length(points);let d=0;
 routeProfile.push(points.map(([x,z],k)=>{
  if(k)d+=Math.hypot(x-points[k-1][0],z-points[k-1][1]);
  const t=d/dist,h=elevations[i]+(elevations[i+1]-elevations[i])*t+(i%2?3.3:2.3)*Math.sin(2*Math.PI*t);
  return {x,z,h};
 }));
}
function profile(from,to){
 const dir=Math.sign(to-from), out=[];
 for(let i=from;i!==to;i+=dir){
  const row=routeProfile[Math.min(i,i+dir)], oriented=dir>0?row:[...row].reverse();
  out.push(...(out.length?oriented.slice(1):oriented));
 }
 if(!out.length){const {x,y:z}=places[from];out.push({x,z,h:elevations[from]});}
 let d=0;
 return out.map((p,i)=>{if(i)d+=Math.hypot(p.x-out[i-1].x,p.z-out[i-1].z);return {...p,d};});
}
function sample(profile,d){
 if(d<=0)return {...profile[0]};
 if(d>=profile.at(-1).d)return {...profile.at(-1)};
 let lo=0,hi=profile.length-1;
 while(hi-lo>1){const mid=(hi+lo)>>1;if(profile[mid].d<d)lo=mid;else hi=mid;}
 const a=profile[lo],b=profile[hi],t=(d-a.d)/(b.d-a.d);
 return {x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,h:a.h+(b.h-a.h)*t,d};
}
function grade(profile,d){
 const a=sample(profile,d-8),b=sample(profile,d+8);
 return b.d>a.d?(b.h-a.h)/(b.d-a.d):0;
}
function condition(s,plan,d,damage=0){
 const f=plan.distance?bound(d/plan.distance,0,1):0;
 return {food:clamp(s.food-plan.food*f),water:clamp(s.water-plan.water*f),energy:clamp(s.energy-plan.energy*f),health:clamp(s.health-damage)};
}
function pace(plan,d,s,damage=0,direction=1,clock=s.clock){
 const slope=grade(plan.profile,d)*direction,v=condition(s,plan,d,damage);
 const loss=(n,threshold,weight)=>bound((threshold-n)/threshold,0,1)*weight;
 const needs=1-loss(v.health,95,.32)-loss(v.food,72,.23)-loss(v.water,80,.28)-loss(v.energy,85,.16);
 const motor=(plan.mode==='car'||plan.mode==='moto'),cart=plan.mode==='cart';
 const gradeFactor=bound(slope>0?1/(1+slope*(motor?1.8:plan.mode==='bike'?5.2:3.2)):1-slope*(motor?.55:1.25),.40,motor?1.08:1.12);
 const conditions=weather(clock),weatherFactor=conditions.speed+(motor?(1-conditions.speed)*.38:0);
 const traction=1-conditions.mud*(plan.mode==='bike'?.15:motor?.07:cart?.11:.05);
 const boost=plan.mode==='walk'&&clock<s.boostUntil?1.24:1;
 return {slope,gradeFactor,needs:Math.max(.26,needs),speed:plan.speed*gradeFactor*(cart?1:Math.max(.26,needs))*weatherFactor*traction*boost};
}
function eta(plan,s){
 if(!plan.distance)return 0;
 const samples=Math.max(4,Math.ceil(plan.distance/18));let duration=0;
 for(let i=0;i<samples;i++)duration+=plan.minutes/samples*plan.speed/pace(plan,(i+.5)*plan.distance/samples,s).speed;
 return Math.ceil(duration);
}
function trip(from,to,mode){
 const course=profile(from,to), points=course.map(p=>[p.x,p.z]), distance=course.at(-1).d;
 let weighted=0, after=0,km=0,footOnly=false;const hazards=[];
 const dir=Math.sign(to-from);
 for(let i=from;i!==to;i+=dir){
  const leg=roads[Math.min(i,i+dir)], len=profile(i,i+dir).at(-1).d;
  footOnly||=Boolean(leg.footOnly);
  if(leg.hazard)hazards.push({name:leg.hazard,kind:leg.obstacle,height:obstacleHeight[leg.obstacle],at:after+len*.55});
  after+=len;weighted+=length(path(i,i+dir))*leg.slope;km+=legKilometers[Math.min(i,i+dir)];
 }
 const v=modes[mode]||modes.walk, motor=v.fuel>0,cart=mode==='cart';
 const hireAvailable=cart&&Math.abs(from-to)===1&&places[from].services?.includes('garage')&&!footOnly;
 return {points,profile:course,mode,footOnly,hireAvailable,distance,km,food:Math.ceil(weighted/(motor||cart?72:mode==='bike'?48:40)),water:Math.ceil(weighted/(motor||cart?58:mode==='bike'?35:31)),energy:Math.ceil(weighted/v.energy),fuel:cart?cartFare:motor?Math.ceil(weighted/280)*v.fuel:0,minutes:Math.ceil(km*60/v.kmh),speed:v.kmh,hazards,impact:v.impact};
}
function apply(s,{food=0,water=0,energy=0,health=0,minutes=0}){
 s.food=clamp(s.food+food);s.water=clamp(s.water+water);s.energy=clamp(s.energy+energy);s.health=clamp(s.health+health);s.clock+=minutes;
}
const canTravel=(s,t)=>(!t.footOnly||t.mode==='walk')&&(t.mode!=='cart'||t.hireAvailable)&&s.food>=t.food&&s.water>=t.water&&s.energy>=t.energy&&s.money>=t.fuel&&s.health>0;
function arrive(s,to,t,extra=0,damage=0,roadMinutes=t.minutes){
 if(!canTravel(s,t)||damage>=s.health)return false;
 apply(s,{food:-t.food,water:-t.water,energy:-t.energy,health:-damage,minutes:Math.ceil(roadMinutes)+extra});s.money-=t.fuel;s.at=to;return true;
}
function buyVehicle(s,id){
 const v=modes[id];
 if(!Number.isFinite(v?.price)||!places[s.at].services?.includes('garage')||s.owned.includes(id)||s.money<v.price)return false;
 s.money-=v.price;s.owned.push(id);s.mode=id;return true;
}
function setVehicle(s,id){if(!s.owned.includes(id)||!modes[id])return false;s.mode=id;return true;}
const depots=places.flatMap((p,i)=>p.services?.includes('help')?[i]:[]);
function needsRescue(s){return !depots.some(i=>i!==s.at&&canTravel(s,trip(s.at,i,'walk')));}
function rescue(s){
 if(!needsRescue(s))return false;
 const goal=depots.filter(i=>i!==s.at).sort((a,b)=>length(path(s.at,a))-length(path(s.at,b)))[0], leg=trip(s.at,goal,'walk');
 s.food=Math.max(s.food,leg.food+8);s.water=Math.max(s.water,leg.water+8);s.energy=Math.max(s.energy,leg.energy+8);s.health=Math.max(s.health,15);s.clock+=120;return true;
}
const candidateWeights=Object.entries(companions).map(([id,person])=>[id,person.weight??1]);
const candidateTotal=candidateWeights.reduce((sum,[,w])=>sum+w,0);
function pickCompanion(random){
 let choice=random()*candidateTotal;
 for(const [id,weight] of candidateWeights){choice-=weight;if(choice<0)return id;}
 return candidateWeights.at(-1)[0];
}
function meet(s,random=Math.random){
 const stop=places[s.at],today=day(s);
 if(s.meetings[stop.id]?.day===today)return;
 const person=s.companion||s.at===0||random()>=.58?null:pickCompanion(random);
 const strays=Object.keys(petPrices).filter(kind=>s.pets[kind]!==2);
 const stray=stop.pet??(strays.length&&random()<.24?strays[Math.floor(random()*strays.length)]:null);
 s.meetings[stop.id]={day:today,person,stray,invited:false};
}
const encounter=s=>s.meetings[places[s.at].id]?.day===day(s)?s.meetings[places[s.at].id]:null;
const localPet=s=>places[s.at].pet??encounter(s)?.stray;
function petProgress(s){
 const pet=localPet(s);
 if(!pet||s.pets[pet]===2)return 2;
 return places[s.at].pet?s.pets[pet]:Number(Boolean(encounter(s)?.petTrust));
}
function invite(s,random=Math.random){
 const meeting=encounter(s),person=companions[meeting?.person];
 if(s.companion||!person||meeting.invited)return '';
 meeting.invited=true;
 if(random()>=person.chance)return person.name+' muốn đi riêng chặng này.';
 s.companion=meeting.person;
 return person.name+' đã đồng ý đồng hành.';
}
function sellPet(s,kind){
 if(!Object.hasOwn(petPrices,kind)||places[s.at].id!=='dong'||s.pets[kind]!==2)return '';
 s.pets[kind]=0;
 s.money+=petPrices[kind];
 if(encounter(s)?.stray===kind)encounter(s).stray=null;
 return 'Đã bán '+(kind==='dog'?'chó':'mèo')+' cho người nhận nuôi tại chợ. +'+petPrices[kind]+'k.';
}
const forageKinds=Object.keys(forage);
function forageSpot(s,from,to,distance){
 const key=Math.min(from,to),today=day(s),seed=(today*307+key*173+47)%997;
 if(s.foraged[key]===today||seed%100>=68)return null;
 const fraction=.22+(seed%37)*.015;
 return {key,day:today,kind:forageKinds[Math.floor(seed/7)%forageKinds.length],at:distance*(from<to?fraction:1-fraction)};
}
function collectForage(s,spot){
 s.foraged[spot.key]=spot.day;
 s.bag[spot.kind]=(s.bag[spot.kind]??0)+1;
 return 'Nhặt được '+forage[spot.kind].name.toLowerCase()+' ven đường.';
}
function service(s,a,clock=s.clock){
 const place=places[s.at], at=k=>place.services?.includes(k), buy=(item,price)=>{if(s.money<price)return 'Không đủ tiền.';s.money-=price;s.bag[item]=(s.bag[item]??0)+1;return 'Đã cất vào túi.';};
 if(Object.hasOwn(forage,a)){
  if(!s.bag[a])return 'Trong túi không còn món này.';
  s.bag[a]--;apply(s,{food:forage[a].food,water:forage[a].water});
  return 'Đã ăn '+forage[a].name.toLowerCase()+'.';
 }
 switch(a){
 case 'meal': if(s.bag.meals){s.bag.meals--;apply(s,{food:42});return 'Ăn cơm: +42 no bụng.';}return 'Trong túi không có cơm.';
 case 'drink': if(s.bag.bottles){s.bag.bottles--;apply(s,{water:48});return 'Uống nước: +48 đủ nước.';}return 'Trong túi không có nước.';
 case 'buyMeal': return at('shop')?buy('meals',18):'Cần đến quán.';
 case 'buyWater': return at('shop')?buy('bottles',8):'Cần đến quán.';
 case 'buyEnergyDrink': return at('shop')?buy('energyDrinks',energyDrinkPrice):'Cần đến quán.';
 case 'energyDrink':
  if(clock<s.boostUntil)return 'Nước tăng lực vẫn còn tác dụng.';
  if(!s.bag.energyDrinks)return 'Trong túi không có nước tăng lực.';
  s.bag.energyDrinks--;s.boostUntil=clock+140;apply(s,{energy:18});
  return 'Uống nước tăng lực: +18 sức, đi bộ nhanh hơn 24% trong 2 giờ 20 phút của game.';
 case 'buyMed': return at('shop')?buy('meds',22):'Cần đến quán.';
 case 'med': if(s.bag.meds&&s.health<100){s.bag.meds--;apply(s,{health:45});return 'Đã sơ cứu: +45 máu.';}return 'Không cần sơ cứu hoặc chưa có túi sơ cứu.';
 case 'buyTreat': return at('shop')?buy('treats',12):'Cần đến quán.';
 case 'nap': apply(s,{energy:32,food:-3,water:-4,minutes:40});return 'Ngồi nghỉ: +32 thể lực.';
 case 'camp': if(at('rest')&&s.money>=15){s.money-=15;apply(s,{energy:100,food:-4,water:-5,minutes:480});return 'Ngủ một giấc, hồi đầy thể lực.';}return 'Cần 15k và một trạm nghỉ.';
 case 'pitchTent':
  if(!canCamp(s)||s.campAt===s.at)return 'Chọn một điểm nghỉ có chỗ dựng lều.';
  s.campAt=s.at;apply(s,{minutes:15});return 'Đã dựng lều. Có thể ngắm trời hoặc ngủ đến sáng.';
 case 'sleepTent': {
  if(s.campAt!==s.at)return 'Dựng lều trước khi ngủ.';
  const today=Math.floor(s.clock/1440)*1440;
  const wake=today+360+(s.clock>=today+360?1440:0);
  apply(s,{energy:100,food:-7,water:-9,minutes:wake-s.clock});
  return 'Thức dậy lúc 06:00. Thể lực đã hồi đầy.';
 }
 case 'waitStars': {
  if(s.campAt!==s.at)return 'Dựng lều trước khi chờ tối.';
  const minute=s.clock%1440;
  if(minute>=1170||minute<300)return 'Trời đã tối. Hãy ngước nhìn bầu trời.';
  apply(s,{food:-3,water:-4,minutes:1260-minute});return 'Đã 21:00. Hãy ngước nhìn bầu trời.';
 }
 case 'packTent':
  if(s.campAt!==s.at)return 'Chưa có lều ở đây.';
  s.campAt=null;apply(s,{minutes:8});return 'Đã thu lều, có thể tiếp tục hành trình.';
 case 'help': {
  if(!at('help')||!needsHelp(s))return 'Chưa cần dùng phần tiếp tế khẩn cấp.';
  s.food=Math.max(s.food,28);s.water=Math.max(s.water,30);s.energy=Math.max(s.energy,35);return 'Nhận suất hỗ trợ để tới điểm tiếp tế tiếp theo.';
 }
 case 'job':{
  if(!at('job'))return 'Chỗ này không có việc làm.';
  if(!canWork(s))return 'Hôm nay đã làm ở quán này hoặc anh cần ăn, uống, nghỉ trước.';
  s.money+=38;apply(s,{food:-10,water:-12,energy:-18,minutes:90});s.jobs[place.id]=day(s);return 'Phụ quán xong: +38k.';
 }
 case 'sell': if(at('sell')&&s.bag.fish){const n=s.bag.fish;s.bag.fish=0;s.money+=n*16;return 'Bán '+n+' cá: +'+n*16+'k.';}return 'Cần có cá và tới Chợ Đồng Văn.';
 case 'sellForage': {
  if(!at('shop'))return 'Ghé quán hoặc nhà dân để bán.';
  const total=forageKinds.reduce((sum,k)=>sum+(s.bag[k]??0)*forage[k].price,0);
  if(!total)return 'Trong túi chưa có món nào nhặt được.';
  for(const k of forageKinds)s.bag[k]=0;
  s.money+=total;return 'Đã bán đồ nhặt ven đường: +'+total+'k.';
 }
 case 'photo': if(place.photo&&!s.photos.includes(place.id)){s.photos.push(place.id);return 'Đã lưu ảnh '+place.name+' · '+s.photos.length+'/3.';}return 'Điểm này đã lưu hoặc không có ảnh.';
 case 'waitPet': {
  const pet=localPet(s);
  if(pet&&petProgress(s)===0){
   const meeting=encounter(s);
   if(place.pet)s.pets[pet]=1;else meeting.petTrust=true;
   apply(s,{minutes:12});
   if(meeting?.stray===pet)meeting.day=day(s);
   return 'Nó đã bớt e dè. Thử đặt đồ ăn xuống rồi lùi ra.';
  }
  return 'Chưa có bạn thú nào cần làm quen ở đây.';
 }
 case 'befriend': {
  const pet=localPet(s);
  if(pet&&petProgress(s)===1&&s.bag.treats){
   s.bag.treats--;s.pets[pet]=2;
   if(encounter(s)?.stray===pet)encounter(s).stray=null;
   return 'Thêm một bạn đồng hành. Nó sẽ đi theo anh như thú cưng.';
  }
  return 'Cần làm quen trước và có một món ăn cho thú trong túi.';
 }
 default:return '';
 }
}
const canWork=s=>s.food>=10&&s.water>=12&&s.energy>=18&&s.jobs[places[s.at].id]!==day(s);
const needsHelp=s=>s.food<25||s.water<25||s.energy<20;
const canFish=s=>places[s.at].services?.includes('fish')&&s.energy>=6&&s.water>=5&&s.food>=4;
function catchFish(s,elapsed){
 if(!canFish(s))return 'Không đủ sức hoặc không ở bến câu.';
 s.casts++;apply(s,{energy:-6,water:-5,food:-4,minutes:22});
 if(elapsed>=1250&&elapsed<=2450){s.bag.fish+=2;return 'Câu được 2 cá. Mang ra chợ bán được 32k.';}
 return 'Cá tuột mất. Thử giật khi phao vừa chìm.';
}
return {fresh,time,day,weather,path,length,pointAt,profile,sample,grade,condition,pace,eta,trip,canTravel,arrive,service,canWork,needsHelp,canFish,catchFish,buyVehicle,setVehicle,needsRescue,rescue,geoPosition,meet,encounter,localPet,petProgress,invite,sellPet,jumpHeight,canCamp,forageSpot,collectForage};
})();
