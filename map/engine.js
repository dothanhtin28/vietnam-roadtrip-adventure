'use strict';
globalThis.TripEngine = (() => {
const {places,roads,modes}=TripData;
const fresh=()=>({at:0,food:84,water:88,energy:91,health:100,money:45,clock:450,mode:'walk',owned:['walk'],bag:{meals:1,bottles:1,treats:1,fish:0,meds:0},photos:[],pets:{dog:0,cat:0},jobs:{},casts:0});
const clamp=(v)=>Math.max(0,Math.min(v,100));
const time=mins=>String(Math.floor(mins/60)%24).padStart(2,'0')+':'+String(mins%60).padStart(2,'0');
const day=s=>Math.floor(s.clock/1440)+1;
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
const elevations=[12,17,38,66,82,119,138,114];
const bound=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const routeProfile=[];
for(let i=0;i<roads.length;i++){
 const points=path(i,i+1), dist=length(points);let d=0;
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
 for(let i=1;i<profile.length;i++){
  const a=profile[i-1],b=profile[i];
  if(d<=b.d){const t=(d-a.d)/(b.d-a.d);return {x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,h:a.h+(b.h-a.h)*t,d};}
 }
 return {...profile.at(-1)};
}
function grade(profile,d){
 const a=sample(profile,d-8),b=sample(profile,d+8);
 return b.d>a.d?(b.h-a.h)/(b.d-a.d):0;
}
function condition(s,plan,d,damage=0){
 const f=plan.distance?bound(d/plan.distance,0,1):0;
 return {food:Math.max(0,s.food-plan.food*f),water:Math.max(0,s.water-plan.water*f),energy:Math.max(0,s.energy-plan.energy*f),health:Math.max(0,s.health-damage)};
}
function pace(plan,d,s,damage=0){
 const slope=grade(plan.profile,d),v=condition(s,plan,d,damage);
 const loss=(n,threshold,weight)=>bound((threshold-n)/threshold,0,1)*weight;
 const needs=1-loss(v.health,95,.32)-loss(v.food,72,.23)-loss(v.water,80,.28)-loss(v.energy,85,.16);
 const motor=(plan.mode==='car'||plan.mode==='moto');
 const gradeFactor=bound(slope>0?1/(1+slope*(motor?1.65:plan.mode==='bike'?5.2:3.6)):1-slope*(motor?.7:1.55),.40,1.24);
 return {slope,gradeFactor,needs:Math.max(.26,needs),speed:plan.speed*gradeFactor*Math.max(.26,needs)};
}
function eta(plan,s){
 if(!plan.distance)return 0;
 const samples=Math.max(4,Math.ceil(plan.distance/18));let duration=0;
 for(let i=0;i<samples;i++)duration+=plan.minutes/samples*plan.speed/pace(plan,(i+.5)*plan.distance/samples,s).speed;
 return Math.ceil(duration);
}
function trip(from,to,mode){
 const points=path(from,to), distance=length(points);
 let weighted=0, after=0;const hazards=[];
 const dir=Math.sign(to-from);
 for(let i=from;i!==to;i+=dir){
  const leg=roads[Math.min(i,i+dir)], len=length(path(i,i+dir));
  if(leg.hazard)hazards.push({name:leg.hazard,at:after+len*.55});
  after+=len;weighted+=len*leg.slope;
 }
 const v=modes[mode]||modes.walk, motor=v.fuel>0;
 return {points,profile:profile(from,to),mode,distance,food:Math.ceil(weighted/(motor?72:mode==='bike'?48:40)),water:Math.ceil(weighted/(motor?58:mode==='bike'?35:31)),energy:Math.ceil(weighted/v.energy),fuel:motor?Math.ceil(weighted/280)*v.fuel:0,minutes:Math.ceil(weighted/v.time),speed:v.speed,hazards,impact:v.impact};
}
function apply(s,{food=0,water=0,energy=0,health=0,minutes=0}){
 s.food=clamp(s.food+food);s.water=clamp(s.water+water);s.energy=clamp(s.energy+energy);s.health=clamp(s.health+health);s.clock+=minutes;
}
const canTravel=(s,t)=>s.food>=t.food&&s.water>=t.water&&s.energy>=t.energy&&s.money>=t.fuel&&s.health>0;
function arrive(s,to,t,extra=0,damage=0,roadMinutes=t.minutes){
 if(!canTravel(s,t)||damage>=s.health)return false;
 apply(s,{food:-t.food,water:-t.water,energy:-t.energy,health:-damage,minutes:Math.ceil(roadMinutes)+extra});s.money-=t.fuel;s.at=to;return true;
}
function buyVehicle(s,id){
 const v=modes[id];
 if(!v||!places[s.at].services?.includes('garage')||s.owned.includes(id)||s.money<v.price)return false;
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
function service(s,a){
 const place=places[s.at], at=k=>place.services?.includes(k), buy=(item,price)=>{if(s.money<price)return 'Không đủ tiền.';s.money-=price;s.bag[item]++;return 'Đã cất vào túi.';};
 switch(a){
 case 'meal': if(s.bag.meals){s.bag.meals--;apply(s,{food:42});return 'Ăn cơm: +42 no bụng.';}return 'Trong túi không có cơm.';
 case 'drink': if(s.bag.bottles){s.bag.bottles--;apply(s,{water:48});return 'Uống nước: +48 đủ nước.';}return 'Trong túi không có nước.';
 case 'buyMeal': return at('shop')?buy('meals',18):'Cần đến quán.';
 case 'buyWater': return at('shop')?buy('bottles',8):'Cần đến quán.';
 case 'buyMed': return at('shop')?buy('meds',22):'Cần đến quán.';
 case 'med': if(s.bag.meds&&s.health<100){s.bag.meds--;apply(s,{health:45});return 'Đã sơ cứu: +45 máu.';}return 'Không cần sơ cứu hoặc chưa có túi sơ cứu.';
 case 'buyTreat': return at('shop')?buy('treats',12):'Cần đến quán.';
 case 'nap': apply(s,{energy:32,food:-3,water:-4,minutes:40});return 'Ngồi nghỉ: +32 thể lực.';
 case 'camp': if(at('rest')&&s.money>=15){s.money-=15;apply(s,{energy:100,food:-4,water:-5,minutes:480});return 'Ngủ một giấc, hồi đầy thể lực.';}return 'Cần 15k và một trạm nghỉ.';
 case 'help': {
  if(!at('help')||!needsHelp(s))return 'Chưa cần dùng phần tiếp tế khẩn cấp.';
  s.food=Math.max(s.food,28);s.water=Math.max(s.water,30);s.energy=Math.max(s.energy,35);return 'Nhận suất hỗ trợ để tới điểm tiếp tế tiếp theo.';
 }
 case 'job':{
  if(!at('job'))return 'Chỗ này không có việc làm.';
  if(!canWork(s))return 'Hôm nay đã làm ở quán này hoặc anh cần ăn, uống, nghỉ trước.';
  s.jobs[place.id]=day(s);s.money+=38;apply(s,{food:-10,water:-12,energy:-18,minutes:90});return 'Phụ quán xong: +38k.';
 }
 case 'sell': if(at('sell')&&s.bag.fish){const n=s.bag.fish;s.bag.fish=0;s.money+=n*16;return 'Bán '+n+' cá: +'+n*16+'k.';}return 'Cần có cá và tới Chợ Đồng Văn.';
 case 'photo': if(place.photo&&!s.photos.includes(place.id)){s.photos.push(place.id);return 'Đã lưu ảnh '+place.name+' · '+s.photos.length+'/3.';}return 'Điểm này đã lưu hoặc không có ảnh.';
 case 'waitPet': if(place.pet&&s.pets[place.pet]===0){s.pets[place.pet]=1;apply(s,{minutes:12});return 'Nó đã bớt e dè. Lần sau thử đặt đồ ăn xuống rồi lùi ra.';}return 'Chưa có bạn thú nào cần làm quen ở đây.';
 case 'befriend': if(place.pet&&s.pets[place.pet]===1&&s.bag.treats){s.bag.treats--;s.pets[place.pet]=2;return 'Thêm một bạn đồng hành. Nó tự chọn đi theo anh.';}return 'Cần làm quen trước và có một món ăn cho thú trong túi.';
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
return {fresh,time,day,path,length,pointAt,profile,sample,grade,condition,pace,eta,trip,canTravel,arrive,service,canWork,needsHelp,canFish,catchFish,buyVehicle,setVehicle,needsRescue,rescue};
})();
