/* Articulated, procedural 3D hiker. All surfaces are world-space mesh polygons. */
'use strict';
globalThis.WindHiker=(()=>{
 const PI=Math.PI, TAU=2*PI, mix=(a,b,t)=>a+(b-a)*t, clamp=(v,a,b)=>Math.min(Math.max(v,a),b);
 const plus=(a,b)=>a.map((v,i)=>v+b[i]), sub=(a,b)=>a.map((v,i)=>v-b[i]), times=(a,m)=>a.map(v=>v*m);
 const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
 const unit=a=>times(a,1/(Math.hypot(...a)||1)), dot=(a,b)=>a.reduce((r,v,i)=>r+v*b[i],0);
 const between=(a,b,t)=>a.map((v,i)=>mix(v,b[i],t));
 const sun=unit([-.65,.83,-.48]);
 const fabric={jacket:[204,104,55],light:[236,150,83],cuff:[118,67,50],pants:[52,69,81],pantsEdge:[73,91,98],shoe:[96,69,53],sole:[44,46,44],skin:[217,157,112],shade:[172,105,78],hair:[39,34,30],green:[66,113,104],greenDark:[49,78,75],strap:[63,65,52],trim:[218,184,105],metal:[163,169,148],bottle:[113,182,171],scarf:[93,128,112],white:[239,219,178]};
 const rings=Array.from({length:13},(_,n)=>Array.from({length:n},(_,i)=>[Math.cos(i*TAU/n),Math.sin(i*TAU/n)]));
 function draw(face,world,pose,mode,hurt=false){
  const F=fabric, orange=hurt?[224,104,79]:F.jacket;
  const tilt=pose.lean, slant=(p)=>{
   const y=p[1]-1.14,roll=pose.roll;return [p[0]*Math.cos(roll)+y*Math.sin(roll),1.14+y*Math.cos(roll)-p[0]*Math.sin(roll)+pose.bob,p[2]+y*tilt];
  };
  function emit(q,c,darken=1,normal=null){
   const n=normal??unit(cross(sub(q[1],q[0]),sub(q[2],q[0])));
   const lit=.70+Math.max(0,dot(n,sun))*.36+Math.max(0,n[1])*.08;
   face(q.map(world),c,clamp(lit*darken,.54,1.16),0);
  }
  // Rounded ring loft, used for cloth, leather and facial planes. The shared
  // normals are averaged around each ring instead of shading boxes.
  function loft(rows,c,n=10,bend=null,ao=1){
   const ring=rings[n];
   const q=rows.map(([cx,y,cz,rx,rz])=>ring.map(([x,z])=>{
    const p=[cx+x*rx,y,cz+z*rz];return bend?bend(p):p;
   }));
   for(let k=1;k<q.length;k++)for(let i=0;i<n;i++){
    const j=(i+1)%n,a=ring[i],b=ring[j],ny=(rows[k-1][3]-rows[k][3])*2.3;
    emit([q[k-1][i],q[k][i],q[k][j],q[k-1][j]],c,ao,unit([a[0]+b[0],ny,a[1]+b[1]]));
   }
   emit([...q[0]].reverse(),c,ao,[0,-1,0]);emit(q.at(-1),c,ao,[0,1,0]);
  }
  function blob(p,rx,ry,rz,c,n=8,bend=null,ao=1){
   const [x,y,z]=p;loft([[x,y-ry,z,rx*.33,rz*.34],[x,y-ry*.61,z,rx*.81,rz*.80],[x,y,z,rx,rz],[x,y+ry*.62,z,rx*.84,rz*.81],[x,y+ry,z,rx*.31,rz*.34]],c,n,bend,ao);
  }
  function limb(a,b,r1,r2,c,n=8){
   const axis=unit(sub(b,a)),u=unit(cross(axis,Math.abs(axis[1])>.90?[0,0,1]:[0,1,0])),v=cross(axis,u);
   const profile=[[0,r1*.72],[.13,r1],[.67,mix(r1,r2,.58)],[.90,r2],[1,r2*.76]];
   const row=profile.map(([t,r])=>rings[n].map(([x,y])=>plus(between(a,b,t),plus(times(u,x*r),times(v,y*r)))));
   for(let k=1;k<row.length;k++)for(let i=0;i<n;i++){
    const j=(i+1)%n,normal=unit(plus(times(u,rings[n][i][0]+rings[n][j][0]),times(v,rings[n][i][1]+rings[n][j][1])));
    emit([row[k-1][i],row[k-1][j],row[k][j],row[k][i]],c,1,normal);
   }
   emit([...row[0]].reverse(),c,1,times(axis,-1));emit(row.at(-1),c,1,axis);
  }
  const sitting=pose.actions.rest, pedal=mode==='walk'?0:1, up=1-pose.crouch*.52;
  const upper=p=>slant([p[0],p[1]-(1-up)*.86,p[2]+pedal*.12]);
  if(sitting>.58){
   const floor=[0,.056,-.13],seat=[0,.55,-.13];
   for(const side of [-1,1]){
    limb(plus(floor,[side*.26,0,-.18]),plus(seat,[-side*.17,-.022,.10]),.021,.024,F.strap,6);
    limb(plus(floor,[side*.24,0,.14]),plus(seat,[-side*.17,-.03,-.12]),.021,.021,F.strap,6);
   }
   blob(seat,.28,.052,.20,F.greenDark,8);
  }
  loft([[0,1.04,0,.25,.145],[0,1.15,0,.30,.176],[0,1.35,0,.292,.173],[0,1.60,0,.34,.204],[0,1.77,.014,.381,.190],[0,1.87,.012,.307,.165],[0,1.96,.016,.151,.133]],orange,12,upper);
  loft([[0,1.075,.008,.285,.170],[0,1.11,.008,.299,.178],[0,1.15,.008,.298,.176]],F.cuff,10,upper,.92);
  // Zip, storm collar and chest patch.
  limb(upper([0,1.15,.179]),upper([0,1.91,.158]),.014,.013,F.trim,6);
  blob([.155,1.61,.180],.072,.075,.029,F.light,6,upper);
  loft([[0,1.875,.016,.153,.143],[0,1.928,.025,.170,.150],[0,1.972,.034,.139,.123]],F.scarf,10,upper);
  blob([0,1.79,-.145],.235,.135,.106,F.light,10,upper,.9);
  limb(upper([0,1.92,.025]),upper([0,2.045,.033]),.099,.112,F.skin,8);
  const yaw=pose.faceYaw, hyaw=Math.sin(yaw), hcos=Math.cos(yaw), nod=pose.lookUp;
  const head=p=>{
   const x=p[0],y=p[1]-2.18,z=p[2]-.05;
   return upper([x*hcos+z*hyaw,2.18+y*Math.cos(nod)+z*Math.sin(nod),.05+z*hcos-x*hyaw]);
  };
  loft([[0,1.98,.041,.064,.068],[0,2.01,.057,.122,.126],[0,2.08,.052,.171,.167],[0,2.18,.040,.193,.179],[0,2.29,.025,.173,.164],[0,2.37,.018,.101,.105]],F.skin,12,head);
  for(const x of [-.185,.185]){blob([x,2.14,.025],.047,.064,.037,F.skin,8,head);blob([x*1.14,2.14,.034],.012,.036,.020,F.shade,6,head,.92);}
  // Side-swept, angular-soft black hair. The rear fall and fringe are distinct.
  loft([[0,2.103,-.064,.155,.090],[0,2.17,-.040,.192,.125],[0,2.235,-.024,.202,.152],[0,2.328,.004,.182,.168],[.014,2.395,.015,.127,.127],[.039,2.425,.010,.048,.068]],F.hair,12,head);
  blob([-.075,2.33,.118],.143,.071,.107,[52,41,33],10,head);
  blob([.069,2.31,.122],.116,.048,.099,F.hair,8,head);
  for(const sign of [-1,1]){
   const x=.071*sign, blink=pose.blink;
   blob([x,2.187,.195],.034,.026*blink,.010,F.white,6,head);
   blob([x+.004,2.188,.204],.015,.020*blink,.008,[39,38,31],6,head);
   limb(head([x-.025,2.234,.186]),head([x+.025,2.24,.18]),.011,.010,F.hair,6);
  }
  blob([0,2.132,.212],.034,.041,.030,F.skin,8,head);
  limb(head([-.034,2.072,.175]),head([.006,2.062,.188]),.005,.006,[132,76,61],6);
  limb(head([.006,2.062,.188]),head([.042,2.075,.174]),.006,.004,[132,76,61],6);
  // Moss-green rucksack with a rounded sleeping roll, shoulder straps, a
  // closure flap, woven detail, buckles and a bottle in one side pocket.
  const pack=p=>upper([p[0]+pose.pack*(p[1]-1.1)*.08,p[1]+pose.pack*.013,p[2]+pose.pack*.032]);
  loft([[0,1.07,-.251,.153,.092],[0,1.13,-.303,.233,.153],[0,1.37,-.324,.267,.175],[0,1.62,-.322,.259,.164],[0,1.77,-.294,.221,.131],[0,1.83,-.258,.151,.084]],F.greenDark,12,pack);
  loft([[0,1.24,-.426,.123,.057],[0,1.30,-.447,.203,.088],[0,1.47,-.448,.207,.077],[0,1.55,-.420,.170,.053]],F.green,10,pack);
  blob([0,1.684,-.449],.209,.092,.086,[129,134,81],10,pack);
  limb(pack([-.257,1.81,-.323]),pack([.257,1.81,-.323]),.103,.103,[159,142,96],10);
  for(const x of [-.182,.182]){
   limb(pack([x,1.73,-.486]),pack([x,1.37,-.516]),.023,.028,F.strap,6);
   limb(pack([x-.026,1.575,-.521]),pack([x+.026,1.575,-.521]),.028,.028,F.metal,6);
   limb(upper([x,1.14,.156]),upper([x,1.75,.199]),.040,.046,F.strap,6);
   limb(upper([x,1.75,.199]),upper([x,1.855,-.119]),.046,.040,F.strap,6);
  }
  limb(upper([-.18,1.569,.212]),upper([.18,1.569,.212]),.022,.022,F.strap,6);
  blob([0,1.56,.226],.054,.035,.022,F.metal,6,upper);
  loft([[.255,1.19,-.328,.073,.07],[.259,1.26,-.333,.089,.08],[.262,1.39,-.335,.083,.074]],F.green,8,pack);
  loft([[.264,1.36,-.335,.058,.062],[.264,1.48,-.335,.063,.063],[.260,1.53,-.335,.054,.059],[.260,1.55,-.335,.037,.043]],F.bottle,8,pack);
  blob([.26,1.56,-.335],.055,.029,.054,F.metal,8,pack);
  // Jagged mountain-shaped woven trail badge on the back pocket.
  emit([pack([-.065,1.402,-.529]),pack([-.026,1.462,-.531]),pack([.005,1.431,-.529]),pack([.029,1.455,-.528]),pack([.075,1.401,-.527])],F.trim,1.04,[0,0,-1]);
  for(const side of [-1,1]){
   const [hip,knee,ankle]=pose.legs[side===1?1:0];
   limb(hip,knee,.150,.118,F.pants,9);limb(knee,ankle,.116,.079,F.pants,9);
   blob(knee,.118,.131,.113,F.pantsEdge,8,null,.98);
   const [x,y,z]=ankle;
   loft([[x,y-.12,z+.055,.085,.168],[x,y-.105,z+.075,.116,.202],[x,y-.057,z+.075,.118,.205],[x,y-.038,z+.07,.09,.181]],F.sole,9);
   loft([[x,y-.053,z+.077,.108,.189],[x,y-.012,z+.086,.112,.188],[x,y+.056,z+.049,.103,.153],[x,y+.128,z+.015,.091,.097],[x,y+.159,z,.075,.078]],F.shoe,9);
   for(let l=0;l<3;l++)limb([x-.06,y+.049+l*.023,z+.128-l*.017],[x+.06,y+.058+l*.023,z+.119-l*.017],.010,.011,F.trim,6);
  }
  const arms=pose.arms.map(a=>a.map(upper));
  arms.forEach(([shoulder,elbow,hand],i)=>{
   blob(shoulder,.142,.166,.147,orange,8);
   limb(shoulder,elbow,.139,.105,orange,9);limb(elbow,hand,.105,.069,orange,9);
   limb(between(elbow,hand,.81),hand,.071,.072,F.cuff,8);
   const end=plus(hand,[0,-.053,.009]);blob(end,.063,.084,.060,F.skin,8);
   blob(plus(end,[i?-.045:.045,.014,.035]),.028,.052,.033,F.skin,6);
  });
  const act=pose.action,hand=arms[1][2],left=arms[0][2];
  if(pose.activity>.12){
   if(act==='fish'||act==='reel'){
    const tip=plus(hand,[.17,.17+pose.castArc*.45,1.04-pose.castArc*.29]);
    limb(hand,between(hand,tip,.38),.024,.014,F.shoe,6);
    limb(between(hand,tip,.38),tip,.013,.005,F.trim,6);
    const float=plus(tip,[.02,-.63,1.12]);
    limb(tip,float,.0035,.0035,F.white,6);blob(float,.036,.056,.036,[217,106,61],6);
   }else if(act==='drink'){
    const b=plus(hand,[.022,.081,.019]);limb(b,plus(b,[0,.14,.075]),.057,.047,F.bottle,8);
    blob(plus(b,[0,.163,.083]),.045,.027,.045,F.metal,6);
   }else if(act==='meal'){
    const bowl=plus(left,[.036,.024,.054]);blob(bowl,.115,.062,.111,F.shoe,10);
    blob(plus(bowl,[0,.033,0]),.096,.036,.093,F.white,8);
    limb(hand,plus(hand,[-.09,.065,.086]),.012,.011,F.trim,6);
   }else if(act==='photo'){
    const camera=between(left,hand,.5);blob(plus(camera,[0,.036,.033]),.142,.079,.052,F.hair,10);
    limb(camera,plus(camera,[0,0,.121]),.057,.053,F.metal,10);
   }
  }
 }
 function create(){
  let phase=0,blend=0,run=0,mixActivity=0,lastAction='',faceYaw=0;
  return {pose({moving=false,mode='walk',speed=0,actualSpeed=0,seconds=0,dt=.033,action='',actionTime=0,turn=0,reduced=false}){
   dt=clamp(dt,0,.08);
   const damp=(k)=>1-Math.exp(-dt*k);
   const effort=clamp(Math.abs(actualSpeed)/29,0,1.35);
   blend=mix(blend,moving?Math.max(.18,Math.min(effort+.24,1)):0,damp(moving?10:14));
   run=mix(run,clamp((speed-1.015)*6,0,1)*Math.min(1,effort),damp(5));
   if(moving)phase=(phase+dt*(mode==='walk'?mix(6.4,12.5,effort/1.35):8.5))%TAU;
   if(action)lastAction=action;
   mixActivity=mix(mixActivity,action?1:0,damp(action?8:5));faceYaw=mix(faceYaw,clamp(turn,-.6,.6)*.45,damp(6));
   const actions={rest:lastAction==='rest'?mixActivity:0};
   const rolling=mode!=='walk', sit=actions.rest, breathing=Math.sin(seconds*2.4);
   const lean=(rolling?.25:.055+run*.19)*blend,stride=rolling?.23:mix(.39,.49,run);
   const swing=Math.cos(phase),bob=(reduced?.38:1)*(Math.cos(phase*2)*blend*.034+breathing*.012);
   const hips=1.10-sit*.58-(rolling?.08:0)+bob;
   const legs=[-1,1].map(sign=>{
    const t=(phase+(sign===1?PI:0))%TAU/TAU,stance=.61;
    const recovery=clamp((t-stance)/(1-stance),0,1);
    const fore=(t<stance?1-2*t/stance:-Math.cos(recovery*PI))*stride*blend;
    const lift=Math.sin(recovery*PI)*blend*(.19+run*.08);
    const pedal=mode==='bike'?blend:0;
    const foot=[sign*(.153+sit*.086),.137+(rolling?.24+pedal*.15*Math.sin(t*TAU):lift),
     (rolling?.13+pedal*.23*Math.cos(t*TAU):fore)+sit*.56];
    const hip=[sign*.158,hips,sit*-.11];
    if(rolling||sit>.01)return [hip,[sign*(.168+sit*.074),mix(.59,.35,sit),foot[2]*.65+.12],foot];
    const rise=hip[1]-foot[1],reach=foot[2]-hip[2],distance=Math.hypot(rise,reach)||1;
    const flex=Math.sqrt(Math.max(0,.53**2-distance**2*.25));
    const knee=[sign*.168,(hip[1]+foot[1])*.5+flex*reach/distance,(hip[2]+foot[2])*.5+flex*rise/distance];
    return [hip,knee,foot];
   });
   function actionHand(sign,base){
    const t=actionTime,side=sign>0,last=lastAction;
    let to=base;
    if(last==='fish'||last==='reel')to=[sign*(side?.26:.18),1.27+(side?.26:.04)*Math.max(0,Math.sin(t*4)),.48];
    if(last==='meal')to=side?[.12,1.46+.45*Math.pow(Math.max(0,Math.sin(t*3.65)),1.3),.32]:[-.15,1.43,.37];
    if(last==='drink')to=side?[.08,1.58+.26*Math.sin(clamp(t,0,1)*PI/2),.241]:base;
    if(last==='rest')to=[sign*.26,1.08,.46];
    if(last==='photo')to=[sign*.113,2.069,.313];
    return between(base,to,mixActivity);
   }
   const arms=[-1,1].map(sign=>{
    const strideZ=swing*sign*stride*blend;
    const hand=actionHand(sign,[sign*.465,rolling?1.24:1.085+run*.12,rolling?.49:strideZ]);
    const elbow=[sign*(.43+(rolling?.03:0)),mix(1.39,(1.54+hand[1])*.5,mixActivity),mix(rolling?.28:strideZ*.49-.066,hand[2]*.5-.08,mixActivity)];
    return [[sign*.347,1.728,0],elbow,hand];
   });
   const blink=1-.93*Math.pow(Math.max(0,Math.cos(seconds*1.37+1.3)),95);
   const roll=(reduced?.5:1)*(swing*blend*.049+turn*(rolling?.18:.075));
   return {legs,arms,blink,faceYaw,lean,roll,crouch:sit,actions,pack:swing*blend,lookUp:lastAction==='drink'?mixActivity*.24:0,bob,action:lastAction,activity:mixActivity,castArc:Math.sin(actionTime*4)};
  },reset(){phase=0;blend=0;run=0;mixActivity=0;lastAction='';faceYaw=0;}};
 }
 return {create,draw};
})();
