const assert=require('node:assert/strict'), fs=require('node:fs'), path=require('node:path'), vm=require('node:vm');
const root=path.join(__dirname,'..','map');
const c=vm.createContext({});
for(const f of ['data.js','engine.js','hiker3d.js','scene3d.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),c);
const E=c.TripEngine, S=c.TripScene3D, fresh=E.fresh;
const up=E.trip(2,3,'walk'),down=E.trip(3,2,'walk'),mid=up.distance/2;
assert(Math.abs(up.distance-down.distance)<1e-6);
assert(E.grade(up.profile,mid)>.04 && E.grade(down.profile,mid)<-.04);
const good={...fresh(),food:100,water:100,health:100,energy:100}, baseline=E.pace(up,mid,good);
assert(baseline.speed<E.pace(down,mid,good).speed);
assert.deepEqual([450,600,800,970,1200].map(clock=>E.weather(clock).kind),['clear','heat','rain','wind','night']);
assert(E.pace(up,mid,good,0,1,600).speed<baseline.speed);
assert(E.pace(up,mid,good,0,1,800).speed<E.pace(up,mid,good,0,1,600).speed);
assert(E.weather(970).mud>0,'The road stays muddy after the rain');
for(const k of ['food','water','health','energy']){
 const low={...good,[k]:25};
 assert(E.pace(up,mid,low).speed<baseline.speed,k+' must slow movement');
 assert(E.eta(up,low)>E.eta(up,good),k+' must affect ETA');
}
assert(E.pace(up,mid,good,35).speed<baseline.speed);
const st=fresh(),end=E.trip(0,1,'bike'),mins=E.eta(end,st),start=st.clock;
assert(E.arrive(st,1,end,28,10,mins));assert.equal(st.clock,start+mins+28);assert.equal(st.health,90);
let polygons=0,keyframes=[];
const check=(...coords)=>assert(coords.every(Number.isFinite));
const ctx={beginPath(){},closePath(){},fill(){polygons++;},
 stroke(){},arc:check,moveTo:check,lineTo:check,fillRect:check,createLinearGradient(){return {addColorStop(){}};},
 set fillStyle(v){keyframes.push(v);},set strokeStyle(v){},set lineWidth(v){}};
const canvas={getContext:()=>ctx,getBoundingClientRect:()=>({width:880,height:540})};
const scene=S.attach(canvas);assert(scene&&S.attach({getContext:()=>null})===null);
for(const [idx,mode] of ['walk','bike','moto','car'].entries()){
 const plan=E.trip(0,7,mode);
 scene.reset();polygons=0;keyframes=[];
 for(const fraction of [0,.28,.52,.92,1])scene.render({route:plan.profile,d:plan.distance*fraction,mode,moving:true,seconds:idx+.7,orbit:fraction-.35,hazard:plan.hazards[0],pets:['dog','cat'],companion:'fern',clock:fraction<.52?800:970});
 assert(polygons>3000,mode+' should render all parts of the route');
 assert(keyframes.some(k=>typeof k==='string'&&k.startsWith('rgb(')));
}
assert(Number.isFinite(S.land(580,420)));
const Rig=c.WindHiker, rig=Rig.create();
const gait=Array.from({length:100},()=>rig.pose({moving:true,speed:.98,actualSpeed:21,dt:1/60}));
assert(gait.some(p=>p.feet[0]>.12),'Walking should land heel-first');
assert(gait.some(p=>p.feet[0]<-.25),'Walking should push off from the toes');
assert(gait.some(p=>p.legs[0][2][1]>p.legs[1][2][1]+.10),'One foot should lift while the other supports the body');
assert(rig.pose({trekking:true}).poles);
assert(!rig.pose({trekking:true,mode:'bike'}).poles);
rig.reset();
const tank=rig.pose({seconds:1}), rest=Array.from({length:30},(_,i)=>rig.pose({action:'rest',actionTime:i/30,seconds:2+i/30})).at(-1);
assert(rest.legs[0][0][1]<tank.legs[0][0][1]-.4);
for(const action of ['fish','reel','meal','drink','rest','photo']){
 rig.reset();
 const p=Array.from({length:28},(_,i)=>rig.pose({action,actionTime:i/30,seconds:2+i/30})).at(-1);
 let faces=0;Rig.draw((vertices)=>{check(...vertices.flat());faces++},v=>v,p,'walk');
 assert(faces>650);assert.equal(p.action,action);assert(p.activity>.85);
}

console.log('OK: 3D geometry and all vehicle modes; uphill/downhill, hunger, thirst, energy, health, damage and ETA.');
