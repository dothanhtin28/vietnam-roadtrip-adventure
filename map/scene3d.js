'use strict';
globalThis.TripScene3D = (() => {
const E=TripEngine, D=TripData, full=E.profile(0,D.places.length-1);
const cap=(n,a,b)=>Math.min(b,Math.max(a,n)), mix=(a,b,t)=>a+(b-a)*t;
const rand=n=>((Math.sin(n*81.28+91.4)*43581.781)%1+1)%1;
const fog=[191,214,203], prairie=[111,143,79], rock=[113,128,109];
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
 const terrace=(z+x*.22+Math.sin(x*.034)*8)/10;
 const shelf=(Math.floor(terrace)+cap((terrace%1+1)%1*3-1.65,0,1)-terrace)*4.1;
 return p.height-.29+Math.sin(x*.048+z*.026)*sides*6+sides*sides*(folds*(47+region*122)-15)+shelf*sides*(1-region);
}
const STEP=17, samples=new Map();
function grid(x,z){
 const k=x+':'+z;if(!samples.has(k))samples.set(k,pathV(x,land(x,z),z));return samples.get(k);
}
const shoulders=[];
for(let d=0;d<=full.at(-1).d+3;d+=3){
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
 let angle=null,camera=null,lastFrame=null,actorYaw=null,zoom=1,wheelAngle=0,backwards=false;
 const actor=WindHiker.create();
 const render=({route,d,mode='walk',moving=false,seconds=0,orbit=0,hazard=null,damage=false,pets=[],offset=0,speed=0,actualSpeed=0,action='',actionTime=0,steer=0,reduced=false})=>{
  if(action)mode='walk';
  const size=canvas.getBoundingClientRect(),density=cap(globalThis.devicePixelRatio||1,1,1.35);
  const W=cap(Math.round(size.width*density),280,1150),H=cap(Math.round(size.height*density),220,850);
  if(canvas.width!==W||canvas.height!==H){canvas.width=W;canvas.height=H;}
  const base=E.sample(route,d), a=E.sample(route,d-4),b=E.sample(route,d+9);
  const direction=Math.atan2(b.x-a.x,b.z-a.z);
  const pos=add(base,Math.cos(direction)*offset,0,-Math.sin(direction)*offset);
  if(Math.abs(offset)>3.5)pos.h=Math.max(base.h-.2,land(pos.x,pos.z));
  const dt=lastFrame===null?.033:cap(seconds-lastFrame,0,.08);lastFrame=seconds;
  const angular=(old,want,alpha)=>old===null?want:old+Math.atan2(Math.sin(want-old),Math.cos(want-old))*alpha;
  if(actualSpeed!==0)backwards=actualSpeed<0;
  if(!moving&&d===0)backwards=false;
  const target=direction+orbit;
  angle=angular(angle,target,1-Math.exp(-dt*5.5));
  const facing=direction+(backwards&&mode==='walk'?Math.PI:0);
  actorYaw=angular(actorYaw,facing+steer*.31,1-Math.exp(-dt*10));
  const heading=actorYaw,fx=Math.sin(angle),fz=Math.cos(angle),rx=fz,rz=-fx;
  const follow=mode==='car'?10.1:mode==='walk'?7.45:8.6;
  const want={x:pos.x-fx*follow+rx*.42,h:pos.h+(mode==='car'?3.65:2.95),z:pos.z-fz*follow+rz*.42};
  want.h=Math.max(want.h,land(want.x,want.z)+1.8);
  if(!camera||Math.hypot(want.x-camera.x,want.z-camera.z)>24)camera=want;
  else{const a=1-Math.exp(-dt*12);camera={x:mix(camera.x,want.x,a),h:mix(camera.h,want.h,a*.82),z:mix(camera.z,want.z,a)};}
  zoom=mix(zoom,reduced?1:1-cap(Math.abs(actualSpeed)/100,0,.5)*.14,1-Math.exp(-dt*3));
  wheelAngle+=actualSpeed*dt/.42;
  const cam=camera,pitch=.08,cp=Math.cos(pitch),sp=Math.sin(pitch),focal=Math.min(W*.91,H*1.07)*zoom,horizon=H*.43;
  const bg=ctx.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#5b9fae');bg.addColorStop(.38,'#b3d0c3');bg.addColorStop(.62,'#f3e8bb');bg.addColorStop(1,'#9eb389');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
  const sunX=W*(.74+.19*Math.sin(angle+.9)),sunY=H*.16,sunR=Math.min(W,H)*.045;
  for(let l=5;l>=0;l--){
   ctx.beginPath();ctx.arc(sunX,sunY,sunR*(1+l*.54),0,Math.PI*2);
   ctx.fillStyle=l?'rgba(255,237,178,.055)':'#fff1c5';ctx.fill();
  }
  for(let i=0;i<6;i++){
   const bearing=i*Math.PI/3+.62;
   const relative=Math.atan2(Math.sin(bearing-angle),Math.cos(bearing-angle));
   if(Math.abs(relative)>.97)continue;
   const x=W*(.5+relative*.65),y=H*(.12+rand(i+8)*.17),width=W*(.115+rand(i+6)*.14);
   ctx.beginPath();ctx.moveTo(x-width*.55,y);
   for(let j=0;j<=12;j++){
    const t=j/12;
    ctx.lineTo(x+(t-.5)*width,y-Math.sin(t*Math.PI)*H*(.014+.009*Math.sin(t*23+i)));
   }
   ctx.lineTo(x+width*.54,y+H*.006);ctx.lineTo(x-width*.32,y+H*.012);
   ctx.closePath();ctx.fillStyle='rgba(255,246,217,.35)';ctx.fill();
  }
  for(let l=0;l<5;l++){
   ctx.beginPath();ctx.moveTo(-10,H*.75);
   for(let j=-1;j<53;j++){const x=j*W/50,u=(j/50-.5)*1.5+angle+l*.79;
    const ridge=Math.abs(Math.sin(u*3.8)*Math.cos(u*2.05)+.31*Math.sin(u*9.2)+.12*Math.sin(u*17.1));
    ctx.lineTo(x,H*(.40+l*.044-(.085+l*.012)*ridge));
   }ctx.lineTo(W+W/20,H*.82);ctx.closePath();ctx.fillStyle=['#b9d1ca','#a5c4be','#91b4ad','#7da297','#6a8e80'][l];ctx.fill();
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
   const tint=cap((q[0].h-38)/165,0,.92),color=prairie.map((n,j)=>mix(n,rock[j],tint));
   const light=cap(1+(q[1].h-q[0].h)*.018-(q[3].h-q[0].h)*.014,.72,1.23);
   face([q[0],q[1],q[2]],color,light*(.93+rand(x*11+z)*.14));
   face([q[0],q[2],q[3]],color,light*(.94+rand(x*7+z)*.12));
  }
  layer=1;
  const strip=(s,w,h)=>add(s.p,s.nx*w,h,s.nz*w);
  for(let i=1;i<shoulders.length;i++){
   const a=shoulders[i-1],b=shoulders[i];
   if(Math.hypot(a.p.x-cam.x,a.p.z-cam.z)>190)continue;
   face([strip(a,-4.72,.06),strip(a,4.72,.06),strip(b,4.72,.06),strip(b,-4.72,.06)],[142,132,94],1,-3);
   face([strip(a,-3.56,.13),strip(a,3.56,.13),strip(b,3.56,.13),strip(b,-3.56,.13)],[175,154,112],.96+rand(i)*.07,-3.14);
   for(const side of [-1,1]){
    const left=side*1.55-.48,right=side*1.55+.48;
    face([strip(a,left,.16),strip(a,right,.16),strip(b,right,.16),strip(b,left,.16)],[184,162,118],.98+rand(i+side)*.055,-3.23);
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
   const breeze=reduced?0:Math.sin(seconds*2.7+p.seed*.54)*.13;
   for(let i=-1;i<=1;i++){
    const h=p.size*(1-Math.abs(i)*.21),s=i*.23;
    const color=p.seed%5===0?[194,165,87]:[92,129,61];
    face([add(p,s-.11,0,i*.12),add(p,s+.09,0,i*.12),add(p,s*2+breeze,h,i*.19)],color,1+i*.09);
   }
  }
  for(const p of plants){
   const dx=p.x-cam.x,dz=p.z-cam.z, ahead=dx*fx+dz*fz;
   if(ahead<0||ahead>242||Math.abs(dx*rx+dz*rz)>32+ahead*.97)continue;
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
   const w=p.w,yaw=.45;
   box(p,w,w*.68,w*1.3,yaw,[223,195,145]);
   const turn=(x,y,z)=>add(p,x*Math.cos(yaw)+z*Math.sin(yaw),y,z*Math.cos(yaw)-x*Math.sin(yaw));
   const r=[turn(-w*.60,w*.68,-w*.73),turn(w*.60,w*.68,-w*.73),turn(w*.60,w*.68,w*.73),turn(-w*.60,w*.68,w*.73),turn(0,w*1.06,-w*.73),turn(0,w*1.06,w*.73)];
   const roof=p.tint?[123,94,72]:[159,111,72];face([r[0],r[3],r[5],r[4]],roof,1.12);face([r[1],r[2],r[5],r[4]],roof,.86);face([r[0],r[1],r[4]],roof,.77);face([r[2],r[3],r[5]],roof,.8);
   for(const side of [-1,1]){
    const z=side*w*.656;
    face([turn(-w*.13,0,z),turn(w*.13,0,z),turn(w*.13,w*.49,z),turn(-w*.13,w*.49,z)],[89,67,50],.96,-.15);
    for(const x of [-w*.31,w*.31]){
     const y=w*.38,half=w*.066;
     face([turn(x-half,y-half,z),turn(x+half,y-half,z),turn(x+half,y+half,z),turn(x-half,y+half,z)],[70,99,94],1,-.15);
    }
   }
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
   const fade=1-l*.102,c=[173-l*12,150-l*10,106-l*6];
   const shape=Array.from({length:24},(_,i)=>{
    const a=i*Math.PI/12, q=shift(pos,Math.cos(a)*shadowWidth*fade+.12,.19+(.004*l),Math.sin(a)*length*fade-.08);
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
  }else{
   if(mode!=='walk'){
    const isBike=mode==='bike',bikeColor=isBike?[192,147,66]:[94,128,108];
    for(const z of [-1.0,1.11])wheel(shift(pos,0,.39,z),.40,isBike?.12:.22,heading);
    box(pos,isBike?.20:.57,.24,isBike?1.38:1.69,heading,bikeColor,.55,-1.4);
    box(shift(pos,0,0,-.25),.33,.105,.44,heading,[58,63,51],.96,-1.5);
    box(shift(pos,0,0,.79),.69,.077,.074,heading,[75,81,65],1.11,-1.5);
   }
   const pose=actor.pose({moving,mode,speed,actualSpeed,seconds,dt,action,actionTime,turn:steer,reduced});
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
 return {render,reset:()=>{angle=null;camera=null;actorYaw=null;lastFrame=null;zoom=1;wheelAngle=0;backwards=false;actor.reset();}};
}
return {attach,land};
})();
