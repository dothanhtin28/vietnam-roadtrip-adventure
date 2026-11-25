const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const root = path.resolve(__dirname, '..', 'map');
const code = f => fs.readFileSync(path.join(root,f),'utf8');
const c = vm.createContext({});
vm.runInContext(code('data.js'),c);vm.runInContext(code('engine.js'),c);
const E=c.TripEngine, D=c.TripData, s=E.fresh();
assert.equal(D.places.filter(p=>p.photo).length,3);
assert.equal(E.buyVehicle(s,'moto'),false);
assert(E.buyVehicle(s,'bike'));assert.equal(s.money,5);
assert(E.setVehicle(s,'walk'));assert(!E.setVehicle(s,'car'));
const route=E.trip(0,7,'walk');
assert.equal(route.hazards.length,3);
for(let i=0;i<7;i++){
 const a=E.path(i,i+1),b=E.path(i+1,i);
 assert.equal(JSON.stringify(a),JSON.stringify([...b].reverse()));
}
assert(E.trip(0,4,'moto').minutes<E.trip(0,4,'bike').minutes);
assert(E.trip(0,4,'car').fuel>E.trip(0,4,'moto').fuel);
const go=(to,extra=0,damage=0)=>assert(E.arrive(s,to,E.trip(s.at,to,s.mode),extra,damage));
go(1);assert.match(E.catchFish(s,850),/tuột/);assert.match(E.catchFish(s,1550),/2 cá/);
go(2);assert.match(E.service(s,'waitPet'),/e dè/);assert.match(E.service(s,'befriend'),/đồng hành/);
go(3,28,10);assert.equal(s.health,90);E.service(s,'photo');E.service(s,'photo');assert.equal(s.photos.length,1);
go(4);assert.match(E.service(s,'job'),/38k/);assert(!E.canWork(s));
E.service(s,'buyMed');E.service(s,'med');assert.equal(s.health,100);
E.service(s,'meal');E.service(s,'drink');E.service(s,'buyTreat');
go(5);E.service(s,'waitPet');E.service(s,'befriend');assert.equal(s.pets.cat,2);
go(6);assert.match(E.service(s,'sell'),/32k/);assert.equal(s.bag.fish,0);
E.service(s,'photo');go(7,28);E.service(s,'photo');assert.equal(s.photos.length,3);
s.food=s.water=s.energy=0;assert(E.needsRescue(s));assert(E.rescue(s));assert(E.canTravel(s,E.trip(7,6,'walk')));
s.at=4;s.money=400;assert(E.buyVehicle(s,'moto'));assert(E.buyVehicle(s,'car'));
const cash=s.money,t=E.trip(4,5,'car');
assert(E.arrive(s,5,t,0,15));assert.equal(s.money,cash-t.fuel);assert.equal(s.health,85);assert(!E.buyVehicle(s,'moto'));
class Element {
 constructor(){this.children=[];this.props={};this.clientWidth=900;this.clientHeight=520;this.style={setProperty:(k,v)=>this.style[k]=v};this.classList={toggle(){}};}
 append(...e){this.children.push(...e);}
 replaceChildren(...e){this.children=[...e];}
 setAttribute(k,v){this[k]=v;}
 removeAttribute(k){delete this[k];}
 addEventListener(k,f){this.props[k]=f;}
 click(){assert(!this.disabled);(this.onclick||this.props.click)?.();}
 event(k,e={}){this.props[k]?.({target:this,preventDefault(){},...e});}
 getBoundingClientRect(){return {left:0,top:0};}
 closest(){return false;}
 setPointerCapture(){}
}
const nodes=new Map(),get=k=>{if(!nodes.has(k))nodes.set(k,new Element());return nodes.get(k);};
let now=0,frame;const saves=new Map();
Object.assign(c,{window:new Element(),localStorage:{getItem:k=>saves.get(k),setItem:(k,v)=>saves.set(k,v)},document:{getElementById:get,createElement:()=>new Element(),createTextNode:t=>t},performance:{now:()=>now},matchMedia:()=>({matches:false}),requestAnimationFrame:f=>frame=f,confirm:()=>true});
vm.runInContext(code('map.js'),c);
const act=(re)=>{const b=get('actions').children.find(b=>re.test(b.textContent));assert(b,String(re));b.click();};
const tick=n=>{for(let i=0;i<n;i++)frame(now+=16.67);};
const select=i=>get('pins').children[i].click();
const travel=i=>{select(i);act(/^Đi tới/);tick(900);};
const viewport=get('viewport'),z=get('zoom').textContent;
get('plus').click();assert.notEqual(get('zoom').textContent,z);
const before=get('world').style.transform;
viewport.event('pointerdown',{pointerId:1,clientX:220,clientY:180,pointerType:'touch'});
viewport.event('pointermove',{pointerId:1,clientX:240,clientY:160,pointerType:'touch'});
assert.notEqual(get('world').style.transform,before);
viewport.event('pointerdown',{pointerId:2,clientX:320,clientY:180,pointerType:'touch'});
const beforePinch=get('zoom').textContent;
viewport.event('pointermove',{pointerId:2,clientX:410,clientY:180,pointerType:'touch'});
assert.notEqual(get('zoom').textContent,beforePinch);
viewport.event('pointerup',{pointerId:1});viewport.event('pointerup',{pointerId:2});
travel(1);act(/^Thả câu/);tick(85);act(/^Giật/);assert.match(get('message').textContent,/2 cá/);
travel(2);act(/^Ngồi yên/);act(/^Đặt đồ ăn/);
travel(3);act(/^Đi nhanh/);tick(500);assert.equal(get('health').value,90);
act(/^Check-in/);assert.match(get('mission').textContent,/1\/3/);
assert(get('image').src.startsWith('https://upload.wikimedia.org/'));
travel(4);act(/^Túi sơ cứu/);act(/^Sơ cứu/);assert.equal(get('health').value,100);
assert.equal(JSON.parse(saves.get('wind-trip-map-v1')).at,4);
console.log('OK: map drag/zoom/pinch, animated routes, hazard choice, all photos, sales, fishing timing, jobs, pets, three vehicles, fuel, medical items, rescue and saves.');
