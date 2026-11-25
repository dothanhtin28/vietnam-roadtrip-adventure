'use strict';
globalThis.TripScene3D = (() => {
const E=TripEngine, D=TripData, full=E.profile(0,D.places.length-1);
const cap=(n,a,b)=>Math.min(b,Math.max(a,n)), mix=(a,b,t)=>a+(b-a)*t;
const rand=n=>((Math.sin(n*81.28+91.4)*43581.781)%1+1)%1;
const fog=[192,213,196], sky=[150,191,188], prairie=[118,149,89], rock=[111,132,112];
const add=(p,x,y,z)=>({x:p.x+x,h:p.h+y,z:p.z+z});
const pathV=(x,h,z)=>({x,h,z});
function nearest(x,z){
 let best=Infinity, height=0;
 for(let i=1;i<full.length;i++){
  const a=full[i-1],b=full[i],dx=b.x-a.x,dz=b.z-a.z;
  const t=cap(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz),0,1),d=(x-a.x-t*dx)**2+(z-a.z-t*dz)**2;
  if(d<best){best=d;height=mix(a.h,b.h,t);}
 }
 return {dist:Math.sqrt(best),height};
}
function land(x,z){
 const p=nearest(x,z), beyond=Math.max(0,p.dist-7);
 const region=cap((765-z)/590,0,1);
 const folds=.52+.20*Math.sin(x*.018+z*.012)+.18*Math.cos(z*.03-x*.007)+.1*Math.sin(x*.056-z*.05);
 const sides=cap(beyond/125,0,1);
 return p.height-.22+(beyond<12?0:Math.sin(x*.048+z*.026)*sides*5)+sides*sides*(folds*(44+region*112)-13);
}
const STEP=17, samples=new Map();
function grid(x,z){
 const k=x+':'+z;if(!samples.has(k))samples.set(k,pathV(x,land(x,z),z));return samples.get(k);
}
const shoulders=[];
for(let d=0;d<=full.at(-1).d+8;d+=5){
 const p=E.sample(full,d),a=E.sample(full,d-3),b=E.sample(full,d+3);
 const n=Math.hypot(b.x-a.x,b.z-a.z)||1,nx=(b.z-a.z)/n,nz=(a.x-b.x)/n;
 shoulders.push({p,nx,nz,d});
}
const extend=(s,t)=>{
 return {p:add(s.p,-s.nz*t,0,s.nx*t),nx:s.nx,nz:s.nz,d:s.d+t};
};
shoulders.unshift(extend(shoulders[0],-18));
shoulders.push(extend(shoulders.at(-1),16));
const plants=[];
for(let i=0;i<480;i++){
 const t=full.at(-1).d*rand(i*7+1),p=E.sample(full,t);
 const x=p.x+(rand(i*5+4)-.5)*230,z=p.z+(rand(i*5+6)-.5)*230;
 if(nearest(x,z).dist<10||D.places.some(v=>Math.hypot(x-v.x,z-v.y)<15))continue;
 plants.push({x,z,h:land(x,z),size:2.8+rand(i+7)*6,shade:i%4});
}
const houses=D.places.flatMap((p,i)=>{
 if(!p.services?.includes('shop'))return [];
 const route=E.profile(i, i<D.places.length-1?i+1:i-1),a=E.sample(route,10), b=route[0], len=Math.hypot(a.x-b.x,a.z-b.z)||1, nx=(a.z-b.z)/len,nz=(b.x-a.x)/len;
 return [-1,1].flatMap((sign,k)=>[0,1,2].map((j)=>{
  const x=p.x+sign*nx*(15+j*8)+(j-1)*3,z=p.y+sign*nz*(15+j*8)+(j-1)*6;
  return {x,z,h:land(x,z),w:3+j*.7,tint:(i+k)%2};
 }));
});
function attach(canvas){
 let ctx=null;
 try{ctx=canvas.getContext('2d',{alpha:false});}catch{}
 if(!ctx)return null;
 let angle=null;
 const render=({route,d,mode='walk',moving=false,seconds=0,orbit=0,hazard=null,damage=false,pets=[]})=>{
  const size=canvas.getBoundingClientRect(), W=cap(Math.round(size.width),320,1000),H=cap(Math.round(size.height),240,740);
  if(canvas.width!==W||canvas.height!==H){canvas.width=W;canvas.height=H;}
  const pos=E.sample(route,d), a=E.sample(route,d-8),b=E.sample(route,d+20);
  const heading=Math.atan2(b.x-a.x,b.z-a.z);
  const target=heading+orbit;angle=angle===null?target:angle+Math.atan2(Math.sin(target-angle),Math.cos(target-angle))*.13;
  const fx=Math.sin(angle),fz=Math.cos(angle),rx=fz,rz=-fx;
  const cam={x:pos.x-fx*12,h:pos.h+6.1,z:pos.z-fz*12};
  const pitch=.22, cp=Math.cos(pitch), sp=Math.sin(pitch), focal=Math.min(W*.84,H*.99), horizon=H*.48;
  const bg=ctx.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#7aaea9');bg.addColorStop(.57,'#d9dfbb');bg.addColorStop(1,'#a5ba91');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
  const sunX=W*(.73+.16*Math.sin(angle+.9)), sunY=H*.19;
  ctx.beginPath();ctx.arc(sunX,sunY,Math.min(W,H)*.056,0,Math.PI*2);ctx.fillStyle='#fff0b5';ctx.fill();
  for(let l=0;l<3;l++){
   ctx.beginPath();ctx.moveTo(-10,H*.75);
   for(let j=-1;j<22;j++){const x=j*W/20, u=j*.42+angle+l*.64;
    ctx.lineTo(x,H*(.44+l*.036-(.06+l*.009)*Math.abs(Math.sin(u)*Math.cos(u*.55)+.36*Math.sin(u*2.28))));
   }ctx.lineTo(W+W/20,H*.82);ctx.closePath();ctx.fillStyle=['#a6c3b5','#94b5a5','#7f9e90'][l];ctx.fill();
  }
  const tr=p=>{
   const x=p.x-cam.x,z=p.z-cam.z,y=p.h-cam.h,f=x*fx+z*fz;
   return [x*rx+z*rz,y*cp+f*sp,f*cp-y*sp];
  };
  const near=1.25, faces=[];let layer=0;
  function face(points,c,shade=1,bias=0){
   const ps=points.map(tr);if(ps.every(v=>v[2]<near)||ps.every(v=>v[2]>385))return;
   const clipped=[];
   for(let i=0;i<ps.length;i++){
    const a=ps[i],b=ps[(i+1)%ps.length],ain=a[2]>=near,bin=b[2]>=near;
    if(ain)clipped.push(a);
    if(ain!==bin){const t=(near-a[2])/(b[2]-a[2]);clipped.push([mix(a[0],b[0],t),mix(a[1],b[1],t),near]);}
   }
   if(clipped.length<3)return;
   const depth=clipped.reduce((n,p)=>n+p[2],0)/clipped.length, haze=cap((depth-35)/325,0,.86);
   const screen=clipped.map(([x,y,z])=>[W*.5+x*focal/z,horizon-y*focal/z]);
   if(screen.every(p=>p[0]<-4)||screen.every(p=>p[0]>W+4)||screen.every(p=>p[1]<-4)||screen.every(p=>p[1]>H+4))return;
   faces.push({screen,color:'rgb('+c.map((n,i)=>Math.round(mix(n*shade,fog[i],haze))).join(',')+')',depth:depth+bias,layer});
  }
  const baseX=Math.floor(cam.x/STEP)*STEP,baseZ=Math.floor(cam.z/STEP)*STEP;
  for(let oz=-19;oz<=19;oz++)for(let ox=-19;ox<=19;ox++){
   const x=baseX+STEP*ox,z=baseZ+STEP*oz, cx=x+STEP/2-cam.x, cz=z+STEP/2-cam.z, forward=cx*fx+cz*fz;
   if(forward<-25||forward>320||Math.abs(cx*rx+cz*rz)>42+forward*1.12)continue;
   const q=[grid(x,z),grid(x+STEP,z),grid(x+STEP,z+STEP),grid(x,z+STEP)];
   const tint=cap((q[0].h-40)/160,0,.85),color=prairie.map((n,j)=>mix(n,rock[j],tint));
   face([q[0],q[1],q[2]],color,.90+rand(x*11+z)*.19,0);
   face([q[0],q[2],q[3]],color,.93+rand(x*7+z)*.13,0);
  }
  layer=1;
  const strip=(s,w,h)=>add(s.p,s.nx*w,h,s.nz*w);
  for(let i=1;i<shoulders.length;i++){
   const a=shoulders[i-1],b=shoulders[i];
   if(Math.hypot(a.p.x-cam.x,a.p.z-cam.z)>205)continue;
   face([strip(a,-4.7,.17),strip(a,4.7,.17),strip(b,4.7,.17),strip(b,-4.7,.17)],[126,131,94],1,-3);
   face([strip(a,-3.55,.25),strip(a,3.55,.25),strip(b,3.55,.25),strip(b,-3.55,.25)],[205,175,125],i%2?.985:1.016,-3.14);
   if(i%3!==0)face([strip(a,-.12,.28),strip(a,.12,.28),strip(b,.12,.28),strip(b,-.12,.28)],[237,222,166],1,-3.23);
  }
  layer=2;
  function box(p,w,h,l,yaw,c,bottom=0,bias=0){
   const sn=Math.sin(yaw),cs=Math.cos(yaw),vertex=(x,y,z)=>add(p,x*cs+z*sn,y+bottom,z*cs-x*sn);
   const q=[vertex(-w/2,0,-l/2),vertex(w/2,0,-l/2),vertex(w/2,0,l/2),vertex(-w/2,0,l/2)];
   const top=q.map(v=>add(v,0,h,0));face(top,c,1.13,bias);
   for(let i=0;i<4;i++){const j=(i+1)%4;face([q[i],q[j],top[j],top[i]],c,[.79,.93,.70,.88][i],bias);}
  }
  for(const p of plants){
   const dx=p.x-cam.x,dz=p.z-cam.z, ahead=dx*fx+dz*fz;
   if(ahead<0||ahead>242||Math.abs(dx*rx+dz*rz)>32+ahead*.97)continue;
   const t=p.size;box(p,t*.105,t*.64,t*.105,0,[105,86,65]);
   for(let level=0;level<2;level++){
    const h=t*(.29+level*.29), radius=t*(.33-level*.08), peak=add(p,0,h+t*.55,0);
    const q=Array.from({length:5},(_,i)=>add(p,Math.sin(i*1.257)*radius,h,Math.cos(i*1.257)*radius));
    for(let i=0;i<5;i++)face([q[i],q[(i+1)%5],peak],p.shade%2?[65,110,78]:[85,125,78],.83+i*.057);
   }
  }
  for(const p of houses){
   if(Math.hypot(p.x-cam.x,p.z-cam.z)>180)continue;
   const w=p.w,yaw=.45;
   box(p,w,w*.68,w*1.3,yaw,[223,195,145]);
   const turn=(x,y,z)=>add(p,x*Math.cos(yaw)+z*Math.sin(yaw),y,z*Math.cos(yaw)-x*Math.sin(yaw));
   const r=[turn(-w*.60,w*.68,-w*.73),turn(w*.60,w*.68,-w*.73),turn(w*.60,w*.68,w*.73),turn(-w*.60,w*.68,w*.73),turn(0,w*1.06,-w*.73),turn(0,w*1.06,w*.73)];
   const roof=p.tint?[123,94,72]:[159,111,72];face([r[0],r[3],r[5],r[4]],roof,1.12);face([r[1],r[2],r[5],r[4]],roof,.86);face([r[0],r[1],r[4]],roof,.77);face([r[2],r[3],r[5]],roof,.8);
  }
  if(hazard&&hazard.at>=d-5&&hazard.at<d+165){
   const p=E.sample(route,hazard.at);
   box(p,3,1.05,2.4,heading+.6,[116,106,87],0,-1.35);box(add(p,.75,0,.45),1.35,1.45,1.75,heading+.1,[151,130,104],0,-1.35);
  }
  const shift=(p,x,y,z)=>add(p,x*Math.cos(heading)+z*Math.sin(heading),y,z*Math.cos(heading)-x*Math.sin(heading));
  const ink=[52,70,65], copper=damage?[223,98,77]:[203,130,69], cream=[237,203,154], pants=[61,82,93];
  face([-1,1,1,-1].map((x,i)=>shift(pos,x*(mode==='car'?1.6:.85),.38,i<2?-1.65:1.65)),[113,112,78],.85,-3.4);
  function wheels(p,wide,long,r){
   for(const x of [-wide,wide])for(const z of [-long,long])box(shift(p,x,r*.04,z),r*.58,r,r*1.35,heading,ink,0,-3.7);
  }
  if(mode==='car'){
   wheels(pos,1.25,1.28,.77);box(pos,2.55,1.0,4.1,heading,[107,136,124],.32,-3.75);
   box(shift(pos,0,0,-.2),2.15,.7,2.1,heading,[115,160,165],1.25,-3.85);
   box(shift(pos,0,0,-.2),2.2,.14,2.18,heading,[126,149,139],1.95,-3.9);
   for(const x of [-.9,.9])box(shift(pos,x,0,-2.02),.31,.24,.18,heading,[199,94,66],.91,-3.9);
  }else {
   const rolling=mode!=='walk', cycle=mode==='bike', stride=moving?Math.sin(seconds*(rolling?9.1:7.8)):0;
   for(const x of [-.25,.25])box(shift(pos,x,0,(x<0?1:-1)*stride*(rolling?.24:.36)),.27,rolling?.61:.88,.29,heading,pants,rolling?.54:.08,-3.75);
   if(rolling){const lc=cycle?2.4:2.95;wheels(pos,.17,lc*.40,.67);box(pos,.68,.47,lc,heading,cycle?[201,154,69]:[91,139,129],.60,-3.64);}
   const bob=moving?Math.abs(stride)*.10:0, base=rolling?1.19:.87;
   box(shift(pos,0,bob,rolling?.17:0),.86,.77,.56,heading,copper,base,-4);
   box(shift(pos,0,bob,-.35),.68,.61,.38,heading,[139,109,67],base+.08,-4.13);
   box(shift(pos,0,bob,rolling?.24:.02),.55,.53,.52,heading,cream,base+.75,-4);
   box(shift(pos,0,bob,rolling?.24:.02),.67,.17,.65,heading,ink,base+1.20,-4.11);
   for(const x of [-.52,.52])box(shift(pos,x,bob,rolling?.34:(x<0?-1:1)*stride*.23),.22,.65,.27,heading,copper,base+.05,-4.02);
  }
  pets.forEach((name,i)=>{
   const p=shift(pos,i%2?2.2:-2.2,0,-2.1-i*1.6),c=name==='dog'?[154,113,73]:[185,165,124];
   box(p,.48,.37,.98,heading,c,.19,-4.1);box(shift(p,0,0,.50),.43,.43,.42,heading,c,.25,-4.15);
  });
  faces.sort((a,b)=>a.layer-b.layer||b.depth-a.depth);
  for(const f of faces){
   ctx.beginPath();ctx.moveTo(...f.screen[0]);
   for(let i=1;i<f.screen.length;i++)ctx.lineTo(...f.screen[i]);
   ctx.closePath();ctx.fillStyle=f.color;ctx.fill();ctx.strokeStyle=f.color;ctx.lineWidth=.53;ctx.stroke();
  }
 };
 return {render,reset:()=>{angle=null;}};
}
return {attach,land};
})();
