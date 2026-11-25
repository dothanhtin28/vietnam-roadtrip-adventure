const assert=require('node:assert/strict'), fs=require('node:fs'), path=require('node:path'), vm=require('node:vm');
const root=path.join(__dirname,'..','map');
const c=vm.createContext({});
for(const f of ['data.js','engine.js','scene3d.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),c);
const E=c.TripEngine, S=c.TripScene3D, fresh=E.fresh;
const up=E.trip(2,3,'walk'),down=E.trip(3,2,'walk'),mid=up.distance/2;
assert(Math.abs(up.distance-down.distance)<1e-6);
assert(E.grade(up.profile,mid)>.04 && E.grade(down.profile,mid)<-.04);
const good={...fresh(),food:100,water:100,health:100,energy:100}, baseline=E.pace(up,mid,good);
assert(baseline.speed<E.pace(down,mid,good).speed);
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
 for(const fraction of [0,.28,.52,.92,1])scene.render({route:plan.profile,d:plan.distance*fraction,mode,moving:true,seconds:idx+.7,orbit:fraction-.35,hazard:plan.hazards[0],pets:['dog','cat']});
 assert(polygons>3000,mode+' should render all parts of the route');
 assert(keyframes.some(k=>typeof k==='string'&&k.startsWith('rgb(')));
}
assert(Number.isFinite(S.land(580,420)));
console.log('OK: 3D geometry and all vehicle modes; uphill/downhill, hunger, thirst, energy, health, damage and ETA.');
