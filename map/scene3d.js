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
 let angle=null, camera=null, lastFrame=null, actorYaw=null;const actor=WindHiker.create();
 const render=({route,d,mode='walk',moving=false,seconds=0,orbit=0,hazard=null,damage=false,pets=[],offset=0,speed=0,action='',actionTime=0,steer=0})=>{
  if(action)mode='walk';
  const size=canvas.getBoundingClientRect(), W=cap(Math.round(size.width),320,1000),H=cap(Math.round(size.height),240,740);
  if(canvas.width!==W||canvas.height!==H){canvas.width=W;canvas.height=H;}
  const base=E.sample(route,d), a=E.sample(route,d-4),b=E.sample(route,d+9);
  const direction=Math.atan2(b.x-a.x,b.z-a.z);
  const pos=add(base,Math.cos(direction)*offset,0,-Math.sin(direction)*offset);
  if(Math.abs(offset)>3.5)pos.h=Math.max(base.h-.2,land(pos.x,pos.z));
  const dt=lastFrame===null?.033:cap(seconds-lastFrame,0,.08);lastFrame=seconds;
  const angular=(old,want,alpha)=>old===null?want:old+Math.atan2(Math.sin(want-old),Math.cos(want-old))*alpha;
  const target=direction+orbit+.11;
  angle=angular(angle,target,1-Math.exp(-dt*7));
  actorYaw=angular(actorYaw,direction+steer*.21,1-Math.exp(-dt*9));
  const heading=actorYaw,fx=Math.sin(angle),fz=Math.cos(angle),rx=fz,rz=-fx;
  const want={x:pos.x-fx*8.7,h:pos.h+3.42,z:pos.z-fz*8.7};
  if(!camera||Math.hypot(want.x-camera.x,want.z-camera.z)>24)camera=want;
  else{const a=1-Math.exp(-dt*12);camera={x:mix(camera.x,want.x,a),h:mix(camera.h,want.h,a*.82),z:mix(camera.z,want.z,a)};}
  const cam=camera,pitch=.105,cp=Math.cos(pitch),sp=Math.sin(pitch),focal=Math.min(W*.84,H*.99),horizon=H*.47;
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
  const ink=[52,70,65];
  // Terrain-aligned ellipses soften the rim individually; never cast a box.
  const shadowWidth=mode==='car'?1.72:mode==='walk'?.76:.86,length=mode==='car'?2.42:mode==='walk'?.66:1.60;
  layer=1.5;
  for(let l=0;l<7;l++){
   const fade=1-l*.102,c=[189-l*12,164-l*9,117-l*5];
   const shape=Array.from({length:24},(_,i)=>{
    const a=i*Math.PI/12, q=shift(pos,Math.cos(a)*shadowWidth*fade+.12,.34+(.004*l),Math.sin(a)*length*fade-.08);
    return q;
   });face(shape,c,1,-l*.03);
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
     const theta=i*Math.PI/3+seconds*(moving?4:0),tip=at(side*w/2,r*.76*C(theta),r*.76*S(theta)),rim=at(side*w/2,r*.76*C(theta+.035),r*.76*S(theta+.035));
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
  }else{
   if(mode!=='walk'){
    const isBike=mode==='bike',bikeColor=isBike?[192,147,66]:[94,128,108];
    for(const z of [-1.0,1.11])wheel(shift(pos,0,.39,z),.40,isBike?.12:.22,heading);
    box(pos,isBike?.20:.57,.24,isBike?1.38:1.69,heading,bikeColor,.55,-1.4);
    box(shift(pos,0,0,-.25),.33,.105,.44,heading,[58,63,51],.96,-1.5);
    box(shift(pos,0,0,.79),.69,.077,.074,heading,[75,81,65],1.11,-1.5);
   }
   const pose=actor.pose({moving,mode,speed,seconds,dt,action,actionTime,turn:steer});
   WindHiker.draw((p,c,light)=>face(p,c,light,-1.8),p=>shift(pos,...p.map(v=>v*.93)),pose,mode,damage);
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
 return {render,reset:()=>{angle=null;camera=null;actorYaw=null;lastFrame=null;actor.reset();}};
}
return {attach,land};
})();
