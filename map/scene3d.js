'use strict';
globalThis.TripScene3D = (() => {
const E=TripEngine, D=TripData, full=E.profile(0,D.places.length-1);
const cap=(n,a,b)=>Math.min(b,Math.max(a,n)), mix=(a,b,t)=>a+(b-a)*t, TAU=2*Math.PI;
const rand=n=>((Math.sin(n*81.28+91.4)*43581.781)%1+1)%1;
const fog=[191,214,203], prairie=[111,143,79], rock=[113,128,109];
const add=(p,x,y,z)=>({x:p.x+x,h:p.h+y,z:p.z+z});
const pathV=(x,h,z)=>({x,h,z});
const trailStart=E.profile(0,7).at(-1).d,ridgeEnd=E.profile(0,8).at(-1).d;
const river=D.riverPath.map(([x,z])=>({x,z,h:18}));
const canyonBlend=x=>cap((x-1115)/67,0,1);
const smooth=t=>t*t*(3-2*t);
const roadEdge=d=>d>=trailStart?1.28+Math.sin(d*.16)*.10:3.48+Math.sin(d*.16)*.18+Math.sin(d*.49)*.07;
function riverPoint(x,z){
 let closest=Infinity,point=river[0];
 for(let i=1;i<river.length;i++){
  const a=river[i-1],b=river[i],dx=b.x-a.x,dz=b.z-a.z;
  const t=cap(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz),0,1);
  const q={x:a.x+t*dx,z:a.z+t*dz},distance=(x-q.x)**2+(z-q.z)**2;
  if(distance<closest){closest=distance;point=q;}
 }
 return {...point,distance:Math.sqrt(closest)};
}
function nearest(x,z){
 let best=Infinity,height=0,distance=0;
 for(let i=1;i<full.length;i++){
  const a=full[i-1],b=full[i],dx=b.x-a.x,dz=b.z-a.z;
  const t=cap(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz),0,1),d=(x-a.x-t*dx)**2+(z-a.z-t*dz)**2;
  if(d<best){best=d;height=mix(a.h,b.h,t);distance=mix(a.d,b.d,t);}
 }
 return {dist:Math.sqrt(best),height,distance};
}
function land(x,z){
 const p=nearest(x,z), beyond=Math.max(0,p.dist-7);
 const region=cap((765-z)/590,0,1);
 const folds=.52+.20*Math.sin(x*.018+z*.012)+.18*Math.cos(z*.03-x*.007)+.1*Math.sin(x*.056-z*.05);
 const sides=cap(beyond/125,0,1);
 const terrace=(z+x*.22+Math.sin(x*.034)*8)/10;
 const shelf=(Math.floor(terrace)+cap((terrace%1+1)%1*3-1.65,0,1)-terrace)*4.1;
 const rolling=p.height-.29+Math.sin(x*.048+z*.026)*sides*6+sides*sides*(folds*(47+region*122)-15)+shelf*sides*(1-region);
 const canyon=canyonBlend(x);
 if(canyon===0)return rolling;
 const water=riverPoint(x,z).distance;
 const ridge=p.distance>=trailStart&&p.distance<ridgeEnd;
 const wall=smooth(cap((water-10+(Math.sin(z*.09)+Math.cos(x*.18))*2.9)/53,0,1));
 const rockHeight=135+folds*43+Math.sin(z*.075-x*.12)*8;
 const valley=mix(12,rockHeight,wall);
 const shoulder=1-smooth(cap((p.dist-(ridge?1.25:4))/(ridge?11:18),0,1));
 const ridgeCut=ridge?Math.min(valley,p.height-8-Math.max(0,p.dist-2)*1.55):valley;
 return mix(rolling,mix(ridgeCut,p.height-.31,shoulder),canyon);
}
const STEP=17, samples=new Map();
function grid(x,z){
 const k=x+':'+z;if(!samples.has(k))samples.set(k,pathV(x,land(x,z),z));return samples.get(k);
}
const shoulders=[];
let routeOffset=0;
for(let i=0;i<D.roads.length;i++){
 const route=E.profile(i,i+1),len=route.at(-1).d,segments=Math.ceil(len/3);
 for(let step=0;step<=segments;step++){
  const d=len*step/segments;
  const p=E.sample(route,d),a=E.sample(route,d-3),b=E.sample(route,d+3);
  const n=Math.hypot(b.x-a.x,b.z-a.z)||1,nx=(b.z-a.z)/n,nz=(a.x-b.x)/n;
  shoulders.push({p,nx,nz,d:d+routeOffset});
 }
 routeOffset+=len;
}
const extend=(s,t)=>{
 return {p:add(s.p,-s.nz*t,0,s.nx*t),nx:s.nx,nz:s.nz,d:s.d+t};
};
shoulders.unshift(extend(shoulders[0],-18));
shoulders.push(extend(shoulders.at(-1),16));
for(const row of shoulders){
 if(row.p.x<=1145)continue;
 const edge=roadEdge(row.d);
 row.ledge=[-1,1].map(side=>{
  const point=(w,h)=>add(row.p,row.nx*w*side,h,row.nz*w*side);
  const top=point(edge+.52,.082),low=point(edge+3.4,-4);
  low.h=Math.min(low.h,land(low.x,low.z)-1.3);
  return {top,low};
 });
}
const waterRows=[];
for(let i=1;i<river.length;i++){
 const a=river[i-1],b=river[i],before=river[i-2]??a,after=river[i+1]??b;
 const n=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/5);
 for(let j=0;j<n;j++){
  const t=j/n;
  const interpolate=k=>.5*((2*a[k])+(-before[k]+b[k])*t+
   (2*before[k]-5*a[k]+4*b[k]-after[k])*t*t+(-before[k]+3*a[k]-3*b[k]+after[k])*t*t*t);
  waterRows.push({x:interpolate('x'),z:interpolate('z'),h:a.h});
 }
}
waterRows.push(river.at(-1));
const waterEdges=waterRows.map((p,i)=>{
 const a=waterRows[i-1]??p,b=waterRows[i+1]??p,n=Math.hypot(b.x-a.x,b.z-a.z)||1;
 const nx=(b.z-a.z)/n,nz=(a.x-b.x)/n,width=9+Math.sin(i*.24)*1.35;
 return [add(p,-nx*width,0,-nz*width),add(p,nx*width,0,nz*width)];
});
const plants=[];
for(let i=0;i<480;i++){
 const t=full.at(-1).d*rand(i*7+1),p=E.sample(full,t);
 const x=p.x+(rand(i*5+4)-.5)*230,z=p.z+(rand(i*5+6)-.5)*230;
 if(nearest(x,z).dist<10||D.places.some(v=>Math.hypot(x-v.x,z-v.y)<15))continue;
 plants.push({x,z,h:land(x,z),size:2.8+rand(i+7)*7,shade:i%4});
}
const verge=[];
for(let i=0;i<shoulders.length;i++){
 const {p,nx,nz}=shoulders[i];
 for(const side of [-1,1]){
  const width=side*(5.1+rand(i*19+side)*5.5);
  const x=p.x+nx*width,z=p.z+nz*width;
  if(nearest(x,z).dist<4.8)continue;
  const seed=i+side;
  verge.push({x,z,h:land(x,z),size:.42+rand(i*5+side)*.95,seed,stone:rand(seed*3)>.84});
 }
}
const houses=D.places.flatMap((p,i)=>{
 const village=p.services?.includes('shop')||p.id==='dog'||p.id==='cat';
 if(!village)return [];
 const route=E.profile(i, i<D.places.length-1?i+1:i-1),a=E.sample(route,10), b=route[0], len=Math.hypot(a.x-b.x,a.z-b.z)||1, nx=(a.z-b.z)/len,nz=(b.x-a.x)/len;
 const town=p.id==='start'||p.id==='yen'||p.id==='dong',count=town?6:3;
 return [-1,1].flatMap((sign,k)=>Array.from({length:count},(_,j)=>{
  const step=(j-(count-1)*.5)*(town?9:8);
  const x=p.x+sign*nx*(12+(j%2)*5)-nz*step,z=p.y+sign*nz*(12+(j%2)*5)+nx*step;
  if(nearest(x,z).dist<7)return null;
  const yaw=Math.atan2(nx*sign,nz*sign);
  return {x,z,h:land(x,z),w:(town?4.1:3.2)+rand(i+j+sign)*1.5,tint:(i+k+j)%3,yaw,shop:town&&j%3===1};
 }).filter(Boolean));
});
const residents=[
 [0,23,-8,'woman'],[0,36,9,'elder'],[0,39,11,'child'],[2,14,-8,'child'],
 [2,37,-11,'woman'],[4,12,9,'elder'],[4,22,10,'woman'],[4,35,-9,'child'],
 [6,9,10,'woman'],[6,17,8,'child'],[6,27,-9,'elder']
].map(([stop,d,offset,outfit])=>{
 const route=E.profile(stop,stop+1),p=E.sample(route,d),q=E.sample(route,d+2);
 const angle=Math.atan2(q.x-p.x,q.z-p.z),x=p.x+Math.cos(angle)*offset,z=p.z-Math.sin(angle)*offset;
 const size=outfit==='child'?.58:outfit==='elder'?.86:.94;
 return {x,z,angle,size,outfit,phase:d*.79,rig:WindHiker.create(d%5)};
});
const farms=[
 [0,40,1,'tea'],[0,82,-1,'rice'],[1,79,1,'tea'],[2,50,-1,'rice'],
 [3,88,1,'rice'],[4,62,-1,'tea'],[5,54,1,'rice']
].map(([stop,d,side,kind])=>{
 const route=E.profile(stop,stop+1),p=E.sample(route,d),q=E.sample(route,d+4);
 const length=Math.hypot(q.x-p.x,q.z-p.z)||1,ax=(q.x-p.x)/length,az=(q.z-p.z)/length;
 const surface=(along,across)=>{
  const curve=across+Math.sin(along*.095)*2.6+along*along*.006;
  const x=p.x+ax*along+az*side*curve,z=p.z+az*along-ax*side*curve;
  return {x,z,h:land(x,z)+.12};
 };
 const rows=[];
 for(let row=0;row<7;row++){
  const across=13+row*4.3;
  for(let j=0;j<12;j++){
   const t=(j-6)*4.7,a=surface(t,across),b=surface(t+4.7,across);
   const c=surface(t+4.7,across+3.5),d=surface(t,across+3.5);
   if([a,b,c,d].some(v=>nearest(v.x,v.z).dist<8))continue;
   const crop=surface(t+2.35,across+1.55);
   rows.push({a,b,c,d,crop,tint:(row+j)%4});
  }
 }
 return {x:p.x,z:p.z,kind,rows};
});
function attach(canvas){
 let ctx=null;
 try{ctx=canvas.getContext('2d',{alpha:false});}catch{}
 if(!ctx)return null;
 let angle=null,camera=null,lastFrame=null,actorYaw=null,actorPosition=null,zoom=1,wheelAngle=0,wet=null,rain=null,heat=null,dark=null;
 const actor=WindHiker.create(),follower=WindHiker.create(Math.PI*.63);
 const image=src=>{
  if(typeof Image==='undefined')return null;
  const bitmap=new Image();bitmap.src=src;return bitmap;
 };
 const panorama=image('assets/ha-giang-panorama.webp'),terraces=image('assets/rice-terraces.webp'),tree=image('assets/cypress.webp'),gorge=image('assets/nho-que-gorge.webp'),farmer=image('assets/field-worker.webp');
 const house=image('assets/village-house.webp');
 const localImages=Object.fromEntries(['woman','elder','child'].map(kind=>[kind,image('assets/resident-'+kind+'.webp')]));
 const grass=image('assets/ground-grass.webp'),dirt=image('assets/ground-trail.webp');
 const heroImages=Object.fromEntries(['shell','canvas','leather','cordura','backpack'].map(kind=>[kind,image('assets/hiker-'+kind+'.webp')]));
 const photoSurface=kind=>kind==='backpack';
 const heroPatterns={};
 let grassPattern,dirtPattern;
 const render=({route,d,mode='walk',moving=false,seconds=0,orbit=0,look=0,viewpoint=false,camping=false,pickup=null,hazard=null,damage=false,pets=[],companion,clothing,clothingPreview=false,offset=0,speed=0,actualSpeed=0,viewDirection=actualSpeed<0?-1:1,jump=null,action='',actionTime=0,steer=0,reduced=false,clock=450,weather=E.weather(clock)})=>{
  if(action||clothingPreview)mode='walk';
  const size=canvas.getBoundingClientRect(),density=cap(globalThis.devicePixelRatio||1,1,1.35);
  const W=cap(Math.round(size.width*density),280,1150),H=cap(Math.round(size.height*density),220,850);
  if(canvas.width!==W||canvas.height!==H){canvas.width=W;canvas.height=H;}
  const base=E.sample(route,d), a=E.sample(route,d-4),b=E.sample(route,d+9);
  const direction=Math.atan2(b.x-a.x,b.z-a.z);
  const pos=E.roadPoint(route,d,offset);
  if(Math.abs(offset)>3.5)pos.h=Math.max(base.h-.2,land(pos.x,pos.z));
  const dx=actorPosition?pos.x-actorPosition.x:0,dz=actorPosition?pos.z-actorPosition.z:0,distance=Math.hypot(dx,dz);
  actorPosition=pos;
  const dt=lastFrame===null?.033:cap(seconds-lastFrame,0,.08);lastFrame=seconds;
  const weatherMix=(current,next)=>current===null?next:mix(current,next,1-Math.exp(-dt*2.4));
  const minute=clock%1440,dusk=Math.max(1-cap((minute-300)/125,0,1),cap((minute-1020)/125,0,1));
  wet=weatherMix(wet,weather.mud);rain=weatherMix(rain,weather.kind==='rain'?1:0);
  heat=weatherMix(heat,weather.kind==='heat'?1:0);dark=weatherMix(dark,dusk);
  const gust=weather.kind==='wind'?1.85:.65+rain*.8;
  const angular=(old,want,alpha)=>old===null?want:old+Math.atan2(Math.sin(want-old),Math.cos(want-old))*alpha;
  const travelBearing=direction+(viewDirection<0?Math.PI:0);
  const target=travelBearing+orbit+(clothingPreview?0:mode==='walk'?.32:mode==='cart'?.24:0);
  angle=angular(angle,target,1-Math.exp(-dt*5.5));
  const facing=mode==='walk'&&moving&&distance>.001?Math.atan2(dx,dz):travelBearing;
  actorYaw=angular(actorYaw,facing+(mode==='walk'?0:steer*.31),1-Math.exp(-dt*10));
  const heading=actorYaw,fx=Math.sin(angle),fz=Math.cos(angle),rx=fz,rz=-fx;
  const follow=clothingPreview?4.9:viewpoint?-27:mode==='cart'?13:mode==='car'?10.1:mode==='walk'?8.65:8.6;
  const want={x:pos.x-fx*follow+rx*.29,h:pos.h+(clothingPreview?2.24:viewpoint?11:mode==='cart'?4.25:mode==='car'?3.65:3.28),z:pos.z-fz*follow+rz*.29};
  want.h=Math.max(want.h,land(want.x,want.z)+1.8);
  if(!camera||Math.hypot(want.x-camera.x,want.z-camera.z)>24)camera=want;
  else{const a=1-Math.exp(-dt*12);camera={x:mix(camera.x,want.x,a),h:mix(camera.h,want.h,a*.82),z:mix(camera.z,want.z,a)};}
  zoom=mix(zoom,reduced?1:1-cap(Math.abs(actualSpeed)/100,0,.5)*.14,1-Math.exp(-dt*3));
  wheelAngle+=actualSpeed*dt/.42;
  const cam=camera,pitch=.08-look,cp=Math.cos(pitch),sp=Math.sin(pitch),focal=Math.min(W*.91,H*1.07)*zoom,horizon=H*.43;
  const skyShift=look*focal*.94;
  const bg=ctx.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#5b9fae');bg.addColorStop(.38,'#b3d0c3');bg.addColorStop(.62,'#f3e8bb');bg.addColorStop(1,'#9eb389');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
  if(panorama?.naturalWidth){
   const plate=(bitmap,opacity,y)=>{
    const span=Math.max(W*1.52,H*1.9),height=span*bitmap.naturalHeight/bitmap.naturalWidth;
    const shift=(angle-2.25)*span/Math.PI+span*.23;
    for(let i=Math.floor(shift/span);i*span-shift<W;i++){
     const x=i*span-shift,mirrored=i%2!==0;
     ctx.save();ctx.globalAlpha=opacity;
     if(mirrored){ctx.translate(x+span,0);ctx.scale(-1,1);}
     ctx.drawImage(bitmap,mirrored?0:x,H*y-height*.48+skyShift,span+1,height);
     ctx.restore();
    }
   };
   plate(panorama,1,.15);
   if(terraces?.naturalWidth){
    const distance=Math.min(...farms.filter(f=>f.kind==='rice').map(f=>Math.hypot(pos.x-f.x,pos.z-f.z)));
    const opacity=cap((145-distance)/105,0,1);
    if(opacity>0)plate(terraces,opacity,.12);
   }
   if(gorge?.naturalWidth&&canyonBlend(base.x)>0)plate(gorge,canyonBlend(base.x),.25);
  }else{
   const sunX=W*(.74+.19*Math.sin(angle+.9)),sunY=H*.16,sunR=Math.min(W,H)*.045;
   for(let l=5;l>=0;l--){
    ctx.beginPath();ctx.arc(sunX,sunY,sunR*(1+l*.54),0,Math.PI*2);
    ctx.fillStyle=l?'rgba(255,237,178,.055)':'#fff1c5';ctx.fill();
   }
   for(let l=0;l<4;l++){
    ctx.beginPath();ctx.moveTo(-10,H*.75);
    for(let j=-1;j<53;j++){const x=j*W/50,u=(j/50-.5)*1.5+angle+l*.79;
     const ridge=Math.abs(Math.sin(u*3.8)*Math.cos(u*2.05)+.31*Math.sin(u*9.2)+.12*Math.sin(u*17.1));
     ctx.lineTo(x,H*(.40+l*.056-(.085+l*.012)*ridge));
    }ctx.lineTo(W+W/20,H*.82);ctx.closePath();ctx.fillStyle=['#b9d1ca','#a5c4be','#91b4ad','#7da297'][l];ctx.fill();
   }
  }
  if(dark>.15){
   ctx.save();ctx.globalAlpha=dark*.91;
   const night=ctx.createLinearGradient(0,0,0,Math.max(30,H*.85+skyShift));
   night.addColorStop(0,'#050d26');night.addColorStop(.53,'#17274b');night.addColorStop(1,'#41536d');
   ctx.fillStyle=night;ctx.fillRect(0,0,W,cap(H*.65+skyShift,0,H));
   if(ctx.createRadialGradient)for(let i=0;i<16;i++){
    const relative=(i-7.5)*.075,az=angle+relative;
    const x=W*.5+Math.tan(relative)*focal;
    const y=horizon-Math.tan(.47+.22*Math.sin(az+.55)+pitch)*focal,r=38+rand(i)*38;
    const haze=ctx.createRadialGradient(x,y,0,x,y,r);
    haze.addColorStop(0,'rgba(141,150,214,.14)');haze.addColorStop(1,'rgba(141,150,214,0)');
    ctx.fillStyle=haze;ctx.fillRect(x-r,y-r,r*2,r*2);
   }
   for(let i=0;i<1150;i++){
    const az=rand(i*11)*TAU,relative=Math.atan2(Math.sin(az-angle),Math.cos(az-angle));
    if(Math.abs(relative)>1.15)continue;
    const milky=i>=230,elevation=milky?.47+.22*Math.sin(az+.55)+(rand(i*17)+rand(i*43)-1)*.23:.12+rand(i*7)*1.08;
    if(elevation+pitch>1.43||elevation+pitch<-.52)continue;
    const x=W*.5+Math.tan(relative)*focal,y=horizon-Math.tan(elevation+pitch)*focal;
    if(x<0||x>W||y<0||y>H)continue;
    const radius=milky?.55+rand(i)*.83:.67+rand(i)*1.18;
    ctx.fillStyle=milky?'rgba(208,210,252,.66)':'#f4eed6';ctx.fillRect(x,y,radius,radius);
   }
   ctx.restore();
  }
  const tr=p=>{
   const x=p.x-cam.x,z=p.z-cam.z,y=p.h-cam.h,f=x*fx+z*fz;
   return [x*rx+z*rz,y*cp+f*sp,f*cp-y*sp];
  };
  const near=1.25, faces=[];let layer=0;
  if(!grassPattern&&grass?.naturalWidth)grassPattern=ctx.createPattern(grass,'repeat');
  if(!dirtPattern&&dirt?.naturalWidth)dirtPattern=ctx.createPattern(dirt,'repeat');
  for(const [kind,bitmap] of Object.entries(heroImages)){
   if(!heroPatterns[kind]&&bitmap?.naturalWidth)heroPatterns[kind]=ctx.createPattern(bitmap,photoSurface(kind)?'no-repeat':'repeat');
  }
  const towardCamera=(cam.x-pos.x)*Math.sin(heading)+(cam.z-pos.z)*Math.cos(heading);
  const view=cap(towardCamera/Math.max(1,Math.hypot(cam.x-pos.x,cam.z-pos.z)),-1,1);
  const actorOptions={clothing,materials:Boolean(heroPatterns.shell),closeup:clothingPreview,packPhoto:Boolean(heroPatterns.backpack)&&view<-.66};
  function face(points,c,shade=1,bias=0,pattern=null,material=null,coverage=1){
   const ps=points.map(tr);if(ps.every(v=>v[2]<near)||ps.every(v=>v[2]>385))return;
   if(pattern)ps.forEach((p,i)=>{
    const uv=material?.uv[i];
    p[3]=uv?uv[0]:points[i].x*52;p[4]=uv?uv[1]:points[i].z*52;
   });
   const clipped=[];
   for(let i=0;i<ps.length;i++){
    const a=ps[i],b=ps[(i+1)%ps.length],ain=a[2]>=near,bin=b[2]>=near;
    if(ain)clipped.push(a);
    if(ain!==bin){
     const t=(near-a[2])/(b[2]-a[2]),p=[mix(a[0],b[0],t),mix(a[1],b[1],t),near];
     if(pattern)p.push(mix(a[3],b[3],t),mix(a[4],b[4],t));
     clipped.push(p);
    }
   }
   if(clipped.length<3)return;
   const depth=clipped.reduce((n,p)=>n+p[2],0)/clipped.length, haze=cap((depth-35)/325,0,.86);
   const screen=clipped.map(([x,y,z])=>[W*.5+x*focal/z,horizon-y*focal/z]);
   if(screen.every(p=>p[0]<-4)||screen.every(p=>p[0]>W+4)||screen.every(p=>p[1]<-4)||screen.every(p=>p[1]>H+4))return;
   const opacity=layer===0&&panorama?.naturalWidth&&!viewpoint?coverage*(1-cap((depth-75)/175,0,.87)):coverage;
   faces.push({screen,color:'rgb('+c.map((n,i)=>Math.round(mix(n*shade,fog[i],haze))).join(',')+')',
    depth:depth+bias,layer,opacity,pattern,material:material?.kind,
    uv:pattern?clipped.map(p=>[p[3],p[4]]):null});
  }
  function heroFace(points,color,light,_bias,material){
   const kind=material?.kind,pattern=heroPatterns[kind];
   if(photoSurface(kind)){
    if(!pattern)return;
    const bitmap=heroImages[kind];
    material={kind,uv:material.uv.map(([x,y])=>[x*bitmap.naturalWidth,y*bitmap.naturalHeight])};
   }
   face(points,color,light,-1.8,pattern,material);
  }
  function billboard(bitmap,p,height,{sway=0,flip=false,opacity=1}={}){
   if(!bitmap?.naturalWidth)return false;
   const [x,y,depth]=tr(p);
   if(depth<=near||depth>165)return true;
   const h=height*focal/depth,w=h*bitmap.naturalWidth/bitmap.naturalHeight;
   const left=W*.5+x*focal/depth-w*.5,top=horizon-y*focal/depth-h;
   if(left<W&&left+w>0&&top<H&&top+h>0)faces.push({sprite:bitmap,left,top,width:w,height:h,flip,sway,opacity,layer,depth});
   return true;
  }
  const baseX=Math.floor(cam.x/STEP)*STEP,baseZ=Math.floor(cam.z/STEP)*STEP;
  for(let oz=-19;oz<=19;oz++)for(let ox=-19;ox<=19;ox++){
   const x=baseX+STEP*ox,z=baseZ+STEP*oz, cx=x+STEP/2-cam.x, cz=z+STEP/2-cam.z, forward=cx*fx+cz*fz;
   if(viewpoint?Math.hypot(cx,cz)>190:forward<-25||forward>320||Math.abs(cx*rx+cz*rz)>42+forward*1.12)continue;
   const q=[grid(x,z),grid(x+STEP,z),grid(x+STEP,z+STEP),grid(x,z+STEP)];
   const tint=cap((q[0].h-38)/165,0,.92),cliff=canyonBlend(x)*cap((Math.abs(q[1].h-q[0].h)+Math.abs(q[3].h-q[0].h))/29,.16,1);
   const color=prairie.map((n,j)=>mix(mix(n,rock[j],tint),[155,151,133][j],cliff));
   const light=cap(1+(q[1].h-q[0].h)*.013-(q[3].h-q[0].h)*.010,.79,1.19);
   const mottling=.95+rand(x*11+z)*.11;
   const nearTerrain=Math.hypot(cx,cz),segments=cliff>.22&&nearTerrain<135?2:grassPattern&&nearTerrain<32?3:1;
   if(segments>1){
    const step=STEP/segments,texture=cliff>.32||nearTerrain>=32?null:grassPattern;
    for(let a=0;a<segments;a++)for(let b=0;b<segments;b++){
     const gx=x+a*step,gz=z+b*step;
     const p=[grid(gx,gz),grid(gx+step,gz),grid(gx+step,gz+step),grid(gx,gz+step)];
     face([p[0],p[1],p[2]],color,light*mottling,0,texture);
     face([p[0],p[2],p[3]],color,light*mottling,0,texture);
    }
   }else{
    face([q[0],q[1],q[2]],color,light*mottling);
    face([q[0],q[2],q[3]],color,light*mottling);
   }
  }
  if(base.x>1110){
   for(let i=1;i<waterEdges.length;i++){
    const [left,right]=waterEdges[i-1],[nextLeft,nextRight]=waterEdges[i];
    face([left,right,nextRight,nextLeft],[52,139,128],.98+Math.sin(i*.19)*.022,-.15);
    if(i%3===0){
     const shift=.45+Math.sin(seconds*.65+i)*.09,p=waterRows[i-1];
     const edge=t=>add(left,(right.x-left.x)*t,.055,(right.z-left.z)*t);
     face([edge(shift-.13),edge(shift+.17),add(p,(right.x-left.x)*.11,.06,(right.z-left.z)*.11+.22)],[119,185,161],1,-.38);
    }
   }
  }
  layer=.65;
  for(const farm of farms){
   if(Math.hypot(farm.x-cam.x,farm.z-cam.z)>145)continue;
   const tea=farm.kind==='tea';
   for(const row of farm.rows){
   const {a,b,c,d,crop,tint}=row;
    const [side,,depth]=tr(crop);
    if(depth<-5||depth>142||Math.abs(side)>15+depth*1.22)continue;
    face([a,b,c,d],tea?[105,120,66]:[167,157,85],.92+tint*.029);
    if(depth<85)face([d,c,add(c,0,-.56,0),add(d,0,-.56,0)],[109,103,67],.89);
    if(tea){
     const top=add(crop,0,.78+tint*.05,0),r=1.3;
     const rim=[add(crop,-r,.28,0),add(crop,0,.32,r*.68),add(crop,r,.28,0),add(crop,0,.31,-r*.68)];
     for(let i=0;i<4;i++)face([rim[i],rim[(i+1)%4],top],i<2?[72,116,59]:[108,147,66],.96+tint*.037);
    }else{
     for(const side of depth<58?[-1,0,1]:[0]){
      const p=add(crop,side*.86,.015,side*.43);
      face([add(p,-.21,0,0),add(p,.21,0,.025),add(p,.12,.67+tint*.08,.1)],[179,167,73],1.02);
      face([add(p,-.13,.02,0),add(p,.26,.03,.1),add(p,-.12,.63,-.11)],[128,147,62],1.05);
     }
    }
   }
  }
  layer=1;
  const road=[175-67*wet,154-61*wet,112-39*wet],track=[181-83*wet,158-68*wet,115-46*wet];
  const strip=(s,w,h)=>add(s.p,s.nx*w,h,s.nz*w);
  const between=(a,b,t)=>add(a,(b.x-a.x)*t,(b.h-a.h)*t,(b.z-a.z)*t);
  function surface(a,b,c,d,color,light,bias,pattern,steps){
   for(let i=0;i<steps;i++){
    const t=i/steps,u=(i+1)/steps;
    const p=between(a,b,t),q=between(a,b,u),r=between(d,c,u),s=between(d,c,t);
    for(let j=0;j<steps;j++){
     const t=j/steps,u=(j+1)/steps;
     const a=between(p,s,t),b=between(q,r,t),c=between(q,r,u),d=between(p,s,u);
     face([a,b,c],color,light,bias,pattern);face([a,c,d],color,light,bias,pattern);
    }
   }
  }
  for(let i=1;i<shoulders.length;i++){
   const a=shoulders[i-1],b=shoulders[i];
   const distance=Math.hypot(a.p.x-cam.x,a.p.z-cam.z);
   if(distance>190)continue;
   const edgeA=roadEdge(a.d),edgeB=roadEdge(b.d);
   const pattern=distance<44?dirtPattern:null,shoulder=distance<38?grassPattern:null;
   for(const side of [-1,1]){
    if(a.ledge&&b.ledge){
     const index=(side+1)/2,{top:topA,low:lowA}=a.ledge[index],{top:topB,low:lowB}=b.ledge[index];
     const color=[132,130,113],light=.91+rand(i*7)*.14;
     layer=.96;
     face([topA,topB,lowB],color,light,-3.03);
     face([topA,lowB,lowA],color,light*.92,-3.03);
     layer=1;
    }
    surface(strip(a,side*(edgeA+.52),.09),strip(a,side*edgeA,.12),strip(b,side*edgeB,.12),strip(b,side*(edgeB+.52),.09),
     [128-25*wet,130-24*wet,80-12*wet],1,-3.09,shoulder,1);
   }
   surface(strip(a,-edgeA,.13),strip(a,edgeA,.13),strip(b,edgeB,.13),strip(b,-edgeB,.13),road,.98+rand(i)*.032,-3.14,pattern,pattern&&distance<22?3:1);
   if(a.d<trailStart&&(!pattern||wet>.18))for(const side of [-1,1]){
    const left=side*1.55-.4,right=side*1.55+.4;
    face([strip(a,left,.16),strip(a,right,.16),strip(b,right,.16),strip(b,left,.16)],track,.98+rand(i+side)*.045,-3.23);
   }
   if(a.d<trailStart&&wet>.18&&rand(i*11)>.72){
    const side=rand(i*41)>.5?1:-1,mid=side*(.78+rand(i)*1.48),width=(.22+rand(i*3)*.76)*wet;
    const puddle=[strip(a,mid-width*.57,.182),strip(a,mid+width*.40,.184),strip(b,mid+width,.183),
     strip(b,mid-width*.68,.182),strip(a,mid-width,.182)];
    face(puddle,[112,129,121],.93,-3.34);
   }
   if(a.d<trailStart&&a.p.x>1170&&a.p.z>200){
    const r=riverPoint(a.p.x,a.p.z),side=Math.sign((r.x-a.p.x)*a.nx+(r.z-a.p.z)*a.nz),w=side*(edgeA+.28);
    const u=side*(edgeB+.28);
    face([strip(a,w,.54),strip(b,u,.54),strip(b,u,.65),strip(a,w,.65)],[180,181,161],1,-.52);
    if(i%2===0)face([strip(a,w-.08,.12),strip(a,w+.08,.12),strip(a,w+.08,.74),strip(a,w-.08,.74)],[129,121,102],1,-.57);
   }
  }
  layer=2;
  function box(p,w,h,l,yaw,c,bottom=0,bias=0){
   const sn=Math.sin(yaw),cs=Math.cos(yaw),vertex=(x,y,z)=>add(p,x*cs+z*sn,y+bottom,z*cs-x*sn);
   const q=[vertex(-w/2,0,-l/2),vertex(w/2,0,-l/2),vertex(w/2,0,l/2),vertex(-w/2,0,l/2)];
   const top=q.map(v=>add(v,0,h,0));face(top,c,1.13,bias);
   for(let i=0;i<4;i++){const j=(i+1)%4;face([q[i],q[j],top[j],top[i]],c,[.79,.93,.70,.88][i],bias);}
  }
  for(const p of verge){
   const dx=p.x-cam.x,dz=p.z-cam.z,depth=dx*fx+dz*fz;
   if(depth<0||depth>63||Math.abs(dx*rx+dz*rz)>depth*.9+5)continue;
   if(p.stone){
    const r=p.size*.83,top=add(p,r*.19,r*.61,r*.12);
    const rim=Array.from({length:5},(_,i)=>add(p,Math.sin(i*Math.PI*2/5)*r,.03,Math.cos(i*Math.PI*2/5)*r*.83));
    for(let i=0;i<rim.length;i++)face([rim[i],rim[(i+1)%rim.length],top],[123,124,107],.79+i*.095);
    continue;
   }
   const breeze=reduced?0:Math.sin(seconds*2.7+p.seed*.54)*.21*gust;
   const count=depth<25?7:4;
   for(let i=0;i<count;i++){
    const phi=i*2.4+p.seed,h=p.size*(.41+rand(p.seed+i)*.58),x=Math.cos(phi),z=Math.sin(phi);
    const color=p.seed%5===0&&i%3===0?[190,163,90]:[[79,107,55],[114,139,72],[131,150,78]][i%3];
    const root=add(p,x*.12,0,z*.12),bend=add(p,x*.22+breeze*.5,h*.58,z*.22),tip=add(p,x*.47+breeze,h,z*.47);
    face([add(root,-z*.045,0,x*.045),add(root,z*.04,0,-x*.04),add(bend,z*.027,0,-x*.027),add(bend,-z*.027,0,x*.027)],color);
    face([add(bend,-z*.027,0,x*.027),add(bend,z*.027,0,-x*.027),tip],color,1.08);
   }
  }
  for(const p of plants){
   const dx=p.x-cam.x,dz=p.z-cam.z, ahead=dx*fx+dz*fz;
   if(ahead<0||ahead>242||Math.abs(dx*rx+dz*rz)>32+ahead*.97)continue;
   if(tree?.naturalWidth){
    const [x,y,depth]=tr(p);
    if(depth<near+2||depth>160)continue;
    const height=p.size*1.33*focal/depth,width=height*(.63+p.shade*.098);
    const left=W*.5+x*focal/depth-width*.5,top=horizon-y*focal/depth-height;
    if(left>W||left+width<0||top>H)continue;
    const sway=reduced?0:Math.sin(seconds*2+p.x+p.z)*.018*gust;
    faces.push({sprite:tree,left,top,width,height,sway,flip:p.shade%2===1,opacity:1-cap((depth-62)/98,0,1),layer,depth});
    continue;
   }
   const t=p.size;box(p,t*.094,t*.64,t*.094,0,[109,85,60]);
   const canopy=[[64,105,63],[81,117,63],[94,129,70],[58,102,78]][p.shade];
   const broad=p.shade===1||p.shade===2;
   for(let level=0;level<2;level++){
    const h=t*(.29+level*.28),radius=t*(broad?.44-level*.069:.35-level*.085);
    const peak=add(p,t*.055,h+t*(broad?.34:.51),-t*.04);
    const q=Array.from({length:6},(_,i)=>add(p,Math.sin(i*Math.PI/3)*radius,h+(rand(i+p.x)-.5)*t*.17,Math.cos(i*Math.PI/3)*radius));
    for(let i=0;i<6;i++)face([q[i],q[(i+1)%6],peak],canopy,.82+(i%4)*.12+level*.06);
   }
  }
  for(const p of houses){
   if(Math.hypot(p.x-cam.x,p.z-cam.z)>180)continue;
   if(billboard(house,p,p.w*1.06,{flip:p.tint===1,opacity:1-cap((Math.hypot(p.x-cam.x,p.z-cam.z)-88)/142,0,.62)}))continue;
   const w=p.w,yaw=p.yaw;
   const wall=[[224,194,146],[202,181,146],[187,163,135]][p.tint];
   box(p,w,w*.68,w*1.3,yaw,wall);
   const turn=(x,y,z)=>add(p,x*Math.cos(yaw)+z*Math.sin(yaw),y,z*Math.cos(yaw)-x*Math.sin(yaw));
   const r=[turn(-w*.60,w*.68,-w*.73),turn(w*.60,w*.68,-w*.73),turn(w*.60,w*.68,w*.73),turn(-w*.60,w*.68,w*.73),turn(0,w*1.06,-w*.73),turn(0,w*1.06,w*.73)];
   const roof=[[138,88,66],[94,101,90],[128,105,83]][p.tint];
   face([r[0],r[3],r[5],r[4]],roof,1.12);face([r[1],r[2],r[5],r[4]],roof,.86);face([r[0],r[1],r[4]],roof,.77);face([r[2],r[3],r[5]],roof,.8);
   for(const side of [-1,1]){
    const z=side*w*.656;
    face([turn(-w*.13,0,z),turn(w*.13,0,z),turn(w*.13,w*.49,z),turn(-w*.13,w*.49,z)],[89,67,50],.96,-.15);
    for(const x of [-w*.31,w*.31]){
     const y=w*.38,half=w*.066;
     const glass=dark>.5?[241,186,96]:[70,99,94];
     face([turn(x-half,y-half,z),turn(x+half,y-half,z),turn(x+half,y+half,z),turn(x-half,y+half,z)],glass,1,-.15);
    }
   }
   if(p.shop){
    face([turn(-w*.55,w*.58,-w*.67),turn(w*.55,w*.58,-w*.67),turn(w*.61,w*.43,-w*.99),turn(-w*.61,w*.43,-w*.99)],
     [[172,108,74],[101,141,111],[146,85,79]][p.tint],1.02,-.23);
    for(const side of [-1,1])box(turn(side*w*.54,0,-w*.94),.10,w*.43,.10,yaw,[112,87,65],0,-.24);
   }
  }
  if(hazard&&hazard.at>=d-5&&hazard.at<d+165){
   const p=E.sample(route,hazard.at);
   const h=hazard.height??.82;
   if(hazard.kind==='mud')box(p,3.0,.07,1.65,direction,[97,81,55],.16,-1.35);
   else if(hazard.kind==='branch')box(p,3.0,h-.13,.72,direction+.14,[99,72,45],.13,-1.35);
   else{
    const rim=Array.from({length:7},(_,i)=>add(p,Math.cos(i*TAU/7)*(1.15+rand(i)*.4),.14,Math.sin(i*TAU/7)*.84));
    const crown=add(p,.26,h,.17);
    for(let i=0;i<rim.length;i++)face([rim[i],rim[(i+1)%rim.length],crown],[116,111,97],.79+rand(i*9)*.4,-1.35);
   }
  }
  if(pickup&&Math.abs(pickup.at-d)<54){
   const p=E.sample(route,pickup.at),q=E.sample(route,pickup.at+1),heading=Math.atan2(q.x-p.x,q.z-p.z);
   const mark={...pickup.position};
   mark.h=land(mark.x,mark.z)+.07;
   const color=pickup.kind==='corn'?[233,185,82]:pickup.kind==='fruit'?[213,119,71]:[201,154,111];
   for(const x of [-.27,0,.29])box(add(mark,x,0,x*.32),.25,.24,.28,heading,color,.12,-.8);
   const [x,y,z]=tr(add(mark,0,1.1,0));
   if(z>near&&z<34&&ctx.fillText)faces.push({icon:D.forage[pickup.kind].icon,x:W*.5+x*focal/z,y:horizon-y*focal/z,size:cap(focal*.62/z,13,28),layer:2,depth:z-.5});
  }
  const shift=(p,x,y,z)=>add(p,x*Math.cos(heading)+z*Math.sin(heading),y,z*Math.cos(heading)-x*Math.sin(heading));
  if(camping){
   const tent=shift(base,-3.9,0,5.2);
   tent.h=land(tent.x,tent.z)+.17;
   const point=(x,y,z)=>shift(tent,x,y,z);
   const a=point(-1.8,0,-1.5),b=point(1.8,0,-1.5),c=point(1.8,0,1.5),d=point(-1.8,0,1.5);
   const front=point(0,2.6,-1.5),back=point(0,2.6,1.5);
   face([a,d,back,front],[137,137,76],1.08,-.40);
   face([b,c,back,front],[115,125,73],.95,-.40);
   face([a,b,front],[157,148,99],.88,-.43);
   face([c,d,back],[122,126,76],.92,-.42);
   face([point(-.85,0,-1.51),point(.85,0,-1.51),point(0,1.81,-1.51)],[51,61,47],1,-.47);
   const fire=shift(base,-2.8,0,3.2);
   fire.h=land(fire.x,fire.z)+.18;
   for(let i=0;i<8;i++){
    const a=i*TAU/8;
    box(add(fire,Math.cos(a)*.65,0,Math.sin(a)*.65),.31,.18,.30,a,[117,109,91]);
   }
   for(let i=0;i<5;i++){
    const ember=add(fire,(i-2)*.12,0,Math.sin(i)*.29),rise=.40+.44*rand(i+Math.floor(seconds*8));
    face([add(ember,-.23,0,-.13),add(ember,.20,0,.11),add(ember,.10,rise,0)],[242,123+i*16,45],1.16,-.7);
   }
  }
  const ink=[52,70,65];
  // Terrain-aligned ellipses soften the rim individually; never cast a box.
  const shadowWidth=mode==='car'?1.72:mode==='walk'?.76:.86,length=mode==='car'?2.42:mode==='walk'?.66:1.60;
  layer=1.5;
  for(let l=0;l<7;l++){
   const fade=1-l*.102;
   const shape=Array.from({length:24},(_,i)=>{
    const a=i*Math.PI/12;
    return shift(pos,Math.cos(a)*shadowWidth*fade+.12,.19+(.004*l),Math.sin(a)*length*fade-.08);
   });
   face(shape,[41,37,28],1,-l*.03,null,null,(.037+.008*l)*(1-.42*E.jumpHeight(jump)));
  }
  layer=2;
  function wheel(p,r,w,yaw){
   const C=t=>Math.cos(t),S=t=>Math.sin(t),sn=S(yaw),cs=C(yaw);
   const at=(x,y,z)=>add(p,x*cs+z*sn,y,z*cs-x*sn);
   const ring=(x,r)=>Array.from({length:12},(_,i)=>at(x,r*C(i*Math.PI/6),r*S(i*Math.PI/6)));
   for(const side of [-1,1]){
    const a=ring(side*w/2,r),b=ring(side*w/2,r*.71),o=ring(-side*w/2,r);
    for(let i=0;i<12;i++){const j=(i+1)%12;face([a[i],a[j],b[j],b[i]],ink,.83+i%3*.065,-1.5);if(side>0)face([a[i],o[i],o[j],a[j]],ink,.75+i%3*.075,-1.5);}
    for(let i=0;i<6;i++){
     const theta=i*Math.PI/3+wheelAngle,tip=at(side*w/2,r*.76*C(theta),r*.76*S(theta)),rim=at(side*w/2,r*.76*C(theta+.035),r*.76*S(theta+.035));
     face([at(side*w/2,0,0),tip,rim],[177,170,145],.83,-1.5);
    }
   }
  }
  if(mode==='car'){
   for(const x of [-1.21,1.21])for(const z of [-1.29,1.29])wheel(shift(pos,x,.40,z),.43,.24,heading);
   box(pos,2.55,1.0,4.1,heading,[107,136,124],.32,-1.3);
   box(shift(pos,0,0,-.2),2.15,.7,2.1,heading,[115,160,165],1.25,-1.4);
   box(shift(pos,0,0,-.2),2.2,.14,2.18,heading,[126,149,139],1.95,-1.5);
   for(const x of [-.9,.9])box(shift(pos,x,0,-2.02),.31,.24,.18,heading,[199,94,66],.91,-1.65);
  }else if(mode==='cart'){
   const timber=[128,91,55],hide=[144,113,78],horn=[216,194,151];
   for(const x of [-1.19,1.19])wheel(shift(pos,x,.74,-.32),.74,.18,heading);
   box(pos,2.22,.18,2.35,heading,timber,.69,-1.4);
   for(const x of [-1.03,1.03])box(shift(pos,x,0,0),.13,.45,2.45,heading,timber,.83,-1.42);
   box(shift(pos,0,0,-1.12),2.1,.46,.13,heading,timber,.80,-1.43);
   for(const x of [-.57,.57])box(shift(pos,x,0,1.93),.11,.13,2.25,heading,timber,.82,-1.4);
   const cow=shift(pos,0,0,3.77);
   box(cow,1,.88,2.14,heading,hide,.63,-1);
   box(shift(cow,0,0,1.04),.59,.65,.61,heading,hide,1.07,-1.1);
   box(shift(cow,0,0,1.38),.58,.30,.59,heading,[119,90,66],.98,-1.16);
   for(const side of [-1,1]){
    const base=shift(cow,side*.21,1.61,1.16),tip=shift(cow,side*.52,1.86,1.19);
    face([base,shift(cow,side*.31,1.55,1.20),tip],horn,1.05,-1.2);
    for(const end of [-1,1]){
     const step=moving?Math.sin(seconds*6+side*end*1.57)*.19:0;
     box(shift(cow,side*.31,0,end*.70+step),.21,.79,.23,heading,hide,Math.max(0,step*.30),-.8);
    }
   }
   const seat=actor.pose({mode:'bike',seconds,dt,reduced});
   WindHiker.draw(heroFace,([x,y,z])=>shift(pos,x*.83,y*.83+.59,z*.83-.46),seat,'bike',false,undefined,actorOptions);
  }else{
   if(mode!=='walk'){
    const isBike=mode==='bike',bikeColor=isBike?[192,147,66]:[94,128,108];
    for(const z of [-1.0,1.11])wheel(shift(pos,0,.39,z),.40,isBike?.12:.22,heading);
    box(pos,isBike?.20:.57,.24,isBike?1.38:1.69,heading,bikeColor,.55,-1.4);
    box(shift(pos,0,0,-.25),.33,.105,.44,heading,[58,63,51],.96,-1.5);
    box(shift(pos,0,0,.79),.69,.077,.074,heading,[75,81,65],1.11,-1.5);
   }
   const scale=mode==='walk'?1.20:1;
   const pose=actor.pose({moving,mode,speed,actualSpeed,distance,scale,jump,seconds,dt,action,actionTime,turn:steer,reduced,trekking:true});
   const grade=E.grade(route,d)*Math.cos(direction-heading);
   const footing=mode==='walk'?.14:0;
   const lift=E.jumpHeight(jump);
   WindHiker.draw(heroFace,([x,y,z])=>shift(pos,x*scale,(y+z*grade)*scale+footing+lift,z*scale),pose,mode,damage,undefined,actorOptions);
  }
  if(companion&&mode==='walk'){
   const trail=E.sample(route,d-viewDirection*3.4);
   const companionPos=shift(trail,-2.1,.14,d<3.4?-1.6:0);
   const pose=follower.pose({moving,speed,actualSpeed,seconds,dt,turn:steer*.4,reduced});
   WindHiker.draw((p,c,light)=>face(p,c,light,-1.05),([x,y,z])=>shift(companionPos,x*.93,y*.93,z*.93),pose,'walk',false,companion);
  }
  for(const resident of residents){
   const {x,z,angle,size,phase,rig,outfit}=resident;
   const [lateral,,depth]=tr({x,z,h:cam.h});
   if(depth<near||depth>60||Math.abs(lateral)>10+depth*.85)continue;
   const speed=outfit==='child'?1.8:outfit==='elder'?.35:.63;
   const step=phase+(reduced?0:seconds*speed*.35),stride=Math.cos(step),wave=Math.sin(step);
   const walking=!reduced&&Math.abs(stride)*speed>.13;
   const range=outfit==='child'?4:outfit==='elder'?2.1:3.5;
   const dx=Math.sin(angle)*wave*range,dz=Math.cos(angle)*wave*range;
   const p={x:x+dx,z:z+dz,h:land(x+dx,z+dz)+.15};
   const facing=angle+(stride<0?Math.PI:0);
   if(billboard(localImages[outfit],p,2.46*size,{
    flip:Math.sin(facing-Math.atan2(p.x-cam.x,p.z-cam.z))>0,
    sway:walking?Math.sin(seconds*speed*6+phase)*.032:0
   }))continue;
   const cos=Math.cos(facing),sin=Math.sin(facing);
   const pose=rig.pose({moving:walking,speed:.86,actualSpeed:speed*7*Math.abs(stride),seconds:seconds+phase,dt,reduced});
   WindHiker.draw((points,color,light)=>face(points,color,light,-.55),([u,v,w])=>{
    const lean=outfit==='elder'?.08*Math.max(0,v-.8):0;
    return add(p,(u*cos+(w+lean)*sin)*size,v*size,((w+lean)*cos-u*sin)*size);
   },pose,'walk',false,outfit);
  }
  for(const farm of farms){
   if(Math.hypot(farm.x-cam.x,farm.z-cam.z)>61||!farm.rows.length)continue;
   const crop=farm.rows[Math.floor(farm.rows.length*.34)].crop;
   billboard(farmer,crop,2.19,{sway:reduced?0:Math.sin(seconds*1.8+farm.x)*.057,flip:farm.kind==='tea'});
  }
  if(dark<.62&&rain<.48){
   for(let i=0;i<6;i++){
    const flight=seconds*(reduced?.05:.14)+i*.35;
    const x=base.x+Math.sin(flight)*27+14,z=base.z+Math.cos(flight)*34+5,h=base.h+18+(i%3)*3;
    const p={x,z,h},flap=reduced?.24:Math.sin(seconds*5+i)*.47;
    face([add(p,-.91,flap,-.15),p,add(p,0,-.04,-.48)],[72,74,63],1);
    face([p,add(p,.91,flap,-.15),add(p,0,-.04,-.48)],[81,78,65],1);
   }
   if(!reduced)for(let i=0;i<4;i++){
    const phase=seconds*2+i,p=add(base,Math.cos(phase*.43+i)*5,.9+Math.sin(phase+i)*.55,7+i*2.7+Math.sin(phase*.5)*3);
    const c=i%2?[241,172,69]:[202,226,152],wing=Math.cos(seconds*12+i)*.16;
    face([p,add(p,-.21,wing,.047),add(p,-.12,wing,-.115)],c,1.13);
    face([p,add(p,.21,wing,.047),add(p,.12,wing,-.115)],c,1.13);
   }
  }
  pets.forEach((name,i)=>{
   const dog=name==='dog',size=dog?1:.72,p=shift(pos,i%2?2.0:-2.0,0,-2.1-i*1.6);
   const color=dog?[163,117,77]:[195,170,135];
   const part=(x,y,z,w,h,l,c)=>box(shift(p,x*size,y*size,z*size),w*size,h*size,l*size,heading,c,0,-3.9);
   part(0,.26,0,.41,.34,.77,color);
   part(0,.44,.43,.36,.31,.40,color);
   part(0,.43,.66,.22,.17,.23,dog?[106,77,55]:[132,110,88]);
   for(const side of [-1,1]){
    part(side*.128,.70,.39,.108,dog?.15:.20,.16,color);
    for(const end of [-1,1]){
     const stride=moving?Math.sin(seconds*12+i+side*end*1.6)*.095:0;
     part(side*.134,Math.max(0,stride*.42),end*.25+stride,.1,.31,.13,color);
    }
   }
   const tail=shift(p,0,.43*size,-.35*size),tip=shift(p,Math.sin(seconds*4)*.12,.77*size,-.72*size);
   face([add(tail,-.06,0,0),add(tail,.06,.045,0),add(tip,.036,0,0),add(tip,-.036,0,0)],color,.9,-3.9);
  });
  function drawMaterial(f){
   const [[u0,v0],[u1,v1],[u2,v2]]=f.uv;
   const [[x0,y0],[x1,y1],[x2,y2]]=f.screen;
   const du1=u1-u0,dv1=v1-v0,du2=u2-u0,dv2=v2-v0;
   const determinant=du1*dv2-du2*dv1;
   if(Math.abs(determinant)<.01)return;
   const screenArea=Math.abs((x1-x0)*(y2-y0)-(x2-x0)*(y1-y0));
   if(f.material&&!photoSurface(f.material)&&screenArea<(clothingPreview?22:57))return;
   const ax=((x1-x0)*dv2-(x2-x0)*dv1)/determinant;
   const ay=((y1-y0)*dv2-(y2-y0)*dv1)/determinant;
   const bx=(du1*(x2-x0)-du2*(x1-x0))/determinant;
   const by=(du1*(y2-y0)-du2*(y1-y0))/determinant;
   ctx.save();
   if(photoSurface(f.material))ctx.globalAlpha=1;
   else if(f.material)ctx.globalAlpha=.8;
   else ctx.globalAlpha=cap((48-f.depth)/22,0,.82)*(f.layer===1?1-wet*.60:1);
   ctx.transform(ax,ay,bx,by,x0-ax*u0-bx*v0,y0-ay*u0-by*v0);
   ctx.fillStyle=f.pattern;ctx.fill();
   ctx.restore();
  }
  faces.sort((a,b)=>a.layer-b.layer||b.depth-a.depth);
  for(const f of faces){
   if(f.icon){ctx.font=f.size+'px system-ui';ctx.textAlign='center';ctx.fillText(f.icon,f.x,f.y);continue;}
   if(f.sprite){
    ctx.save();ctx.globalAlpha=f.opacity;
    ctx.translate(f.left+f.width*.5,f.top+f.height);
    ctx.rotate(f.sway);
    if(f.flip)ctx.scale(-1,1);
    ctx.drawImage(f.sprite,-f.width*.5,-f.height,f.width,f.height);
    ctx.restore();continue;
   }
   ctx.beginPath();ctx.moveTo(...f.screen[0]);
   for(let i=1;i<f.screen.length;i++)ctx.lineTo(...f.screen[i]);
   ctx.closePath();ctx.fillStyle=f.color;
   if(photoSurface(f.material)){drawMaterial(f);continue;}
   if(f.opacity<1){
    ctx.globalAlpha=f.opacity;ctx.fill();ctx.globalAlpha=1;
   }else{
    ctx.fill();
    if(f.layer<=1.5){ctx.strokeStyle=f.color;ctx.lineWidth=.53;ctx.stroke();}
   }
   if(f.pattern)drawMaterial(f);
  }
  if(heat>.02){
   ctx.fillStyle='rgba(248,195,101,'+heat*.13+')';ctx.fillRect(0,0,W,H);
  }
  if(dark>.02){
   ctx.fillStyle='rgba(22,36,72,'+dark*.56+')';ctx.fillRect(0,0,W,H);
  }
  if(rain>.03){
   ctx.fillStyle='rgba(63,86,103,'+rain*.29+')';ctx.fillRect(0,0,W,H);
   if(!reduced){
    ctx.beginPath();
    for(let i=0;i<112;i++){
     const t=seconds*(.65+rand(i+8)*.53),v=(rand(i*7)+t)%1,u=(rand(i*13)+t*.16)%1;
     const x=u*W,y=v*H,len=9+rand(i*11)*25;
     ctx.moveTo(x,y);ctx.lineTo(x-len*.31,y-len);
    }
    ctx.lineWidth=1;ctx.strokeStyle='rgba(226,240,242,'+rain*.55+')';ctx.stroke();
   }
  }
 };
 return {render,reset:()=>{angle=null;camera=null;actorYaw=null;actorPosition=null;lastFrame=null;wet=null;rain=null;heat=null;dark=null;zoom=1;wheelAngle=0;actor.reset();follower.reset();}};
}
return {attach,land};
})();
