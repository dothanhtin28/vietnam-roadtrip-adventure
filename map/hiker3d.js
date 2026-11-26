/* Articulated, procedural 3D hiker. All surfaces are world-space mesh polygons. */
'use strict';
globalThis.WindHiker=(()=>{
 const PI=Math.PI, TAU=2*PI, mix=(a,b,t)=>a+(b-a)*t, clamp=(v,a,b)=>Math.min(Math.max(v,a),b);
 const ease=t=>t*t*(3-2*t);
 const plus=(a,b)=>a.map((v,i)=>v+b[i]), sub=(a,b)=>a.map((v,i)=>v-b[i]), times=(a,m)=>a.map(v=>v*m);
 const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
 const unit=a=>times(a,1/(Math.hypot(...a)||1)), dot=(a,b)=>a.reduce((r,v,i)=>r+v*b[i],0);
 const between=(a,b,t)=>a.map((v,i)=>mix(v,b[i],t));
 const sun=unit([-.65,.83,-.48]);
 const fabric={jacket:[103,120,63],light:[140,151,83],cuff:[63,73,51],pants:[115,92,68],pantsEdge:[84,79,66],shoe:[99,71,48],sole:[44,46,44],skin:[231,169,127],shade:[188,112,83],hair:[48,35,28],green:[103,110,63],greenDark:[63,79,48],strap:[98,75,58],trim:[212,174,107],metal:[163,169,148],bottle:[103,150,151],scarf:[76,102,81],white:[248,231,200]};
 const outfits={
  fern:{jacket:[105,131,75],light:[151,171,100],green:[169,110,70],greenDark:[110,75,57]},
  indigo:{jacket:[65,100,150],light:[109,144,183],green:[151,120,68],greenDark:[104,82,54]},
  plum:{jacket:[143,85,120],light:[181,124,154],green:[107,128,79],greenDark:[75,93,60]},
  azure:{jacket:[63,104,143],light:[102,146,179],green:[127,77,75],greenDark:[81,55,55]},
  gold:{jacket:[151,127,60],light:[185,159,99],green:[86,104,83],greenDark:[55,74,60]},
  woman:{jacket:[138,67,78],light:[188,116,122],pants:[61,79,90],cuff:[110,59,72],scarf:[170,124,76]},
  elder:{jacket:[77,100,107],light:[107,128,130],pants:[75,76,70],hair:[171,169,157],scarf:[129,125,109]},
  child:{jacket:[216,148,64],light:[242,183,87],pants:[62,92,110],cuff:[160,103,53]}
 };
 const rings=Array.from({length:15},(_,n)=>Array.from({length:n},(_,i)=>[Math.cos(i*TAU/n),Math.sin(i*TAU/n)]));
 function draw(face,world,pose,mode,hurt=false,outfit,{clothing='trail',materials=false,closeup=false}={}){
  const local=['woman','elder','child'].includes(outfit),hero=!outfit,feminine=['woman','fern','plum','azure','gold'].includes(outfit);
  const F={...fabric,...outfits[outfit],...(hero?TripData.clothing[clothing]?.colors:null)};
  const jacket=hurt?[174,78,60]:F.jacket;
  const textures=hero&&materials?new Map([
   [jacket,'shell'],[F.cuff,'shell'],[F.light,'shell'],[F.scarf,'shell'],
   [F.pants,'canvas'],[F.pantsEdge,'canvas'],[F.shoe,'leather'],[F.greenDark,'cordura'],[F.green,'cordura']
  ]):null;
  const tilt=pose.lean, slant=(p)=>{
   const y=p[1]-1.14,roll=pose.roll,twist=pose.twist*clamp(y/.65,0,1);
   const x=p[0]*Math.cos(twist)+p[2]*Math.sin(twist);
   const z=p[2]*Math.cos(twist)-p[0]*Math.sin(twist);
   return [x*Math.cos(roll)+y*Math.sin(roll)+pose.hipShift,1.14+y*Math.cos(roll)-x*Math.sin(roll)+pose.bob,z+y*tilt];
  };
  function emit(q,c,darken=1,normal=null){
   const n=normal??unit(cross(sub(q[1],q[0]),sub(q[2],q[0])));
   const lit=(hero?.73:.70)+Math.max(0,dot(n,sun))*.36+Math.max(0,n[1])*.08;
   const texture=textures?.get(c);
   let material=null;
   if(texture){
    const axis=n.map(Math.abs),horizontal=axis[1]>axis[0]&&axis[1]>axis[2];
    const u=horizontal||axis[2]>=axis[0]?0:2,v=horizontal?2:1;
    material={kind:texture,uv:q.map(p=>[p[u]*155,-p[v]*155])};
   }
   face(q.map(world),c,clamp(lit*darken,.54,1.16),0,material);
  }
  // Rounded ring loft, used for cloth, leather and facial planes. The shared
  // normals are averaged around each ring instead of shading boxes.
  function loft(rows,c,n=10,bend=null,ao=1){
   if(local)n=Math.min(n,6);
   else if(hero&&n>=10)n=14;
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
   if(local)n=Math.min(n,6);
   else if(hero&&closeup&&n>=8)n=11;
   const axis=unit(sub(b,a)),u=unit(cross(axis,Math.abs(axis[1])>.90?[0,0,1]:[0,1,0])),v=cross(axis,u);
   const profile=local?[[0,r1*.83],[.45,mix(r1,r2,.34)],[1,r2*.85]]
    :[[0,r1*.72],[.13,r1],[.67,mix(r1,r2,.58)],[.90,r2],[1,r2*.76]];
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
  loft([[0,1.04,0,.25,.145],[0,1.15,0,.30,.176],[0,1.35,0,.292,.173],[0,1.53,0,.316,.191],
   [0,1.68,.012,.352,.201],[0,1.77,.014,.368,.193],[0,1.84,.012,.326,.175],[0,1.96,.016,.151,.133]],jacket,12,upper);
  loft([[0,1.075,.008,.285,.170],[0,1.11,.008,.299,.178],[0,1.15,.008,.298,.176]],F.cuff,10,upper,.92);
  // Zip, storm collar and chest patch.
  if(hero){
   emit([upper([-.093,1.13,.183]),upper([.097,1.13,.183]),upper([.065,1.58,.208]),upper([.11,1.88,.177]),upper([-.105,1.88,.177]),upper([-.055,1.58,.208])],[184,149,101],1,[0,0,1]);
   for(const side of [-1,1]){
    limb(upper([side*.103,1.15,.188]),upper([side*.066,1.58,.219]),.012,.009,F.trim,6);
    limb(upper([side*.068,1.58,.218]),upper([side*.110,1.87,.188]),.009,.010,F.trim,6);
   }
  }else limb(upper([0,1.15,.179]),upper([0,1.91,.158]),.014,.013,F.trim,6);
  blob([.155,1.61,.180],.072,.075,.029,F.light,6,upper);
  loft([[0,1.875,.016,.153,.143],[0,1.928,.025,.170,.150],[0,1.972,.034,.139,.123]],F.scarf,10,upper);
  if(hero){
   limb(upper([-.126,1.938,.088]),upper([.123,1.854,.167]),.047,.037,F.scarf,9);
   limb(upper([.104,1.899,.105]),upper([-.097,1.864,.166]),.039,.035,F.scarf,9);
  }
  blob([0,1.79,-.145],.235,.135,.106,F.light,10,upper,.9);
  limb(upper([0,1.92,.025]),upper([0,2.045,.033]),.099,.112,F.skin,8);
  const yaw=pose.faceYaw, hyaw=Math.sin(yaw), hcos=Math.cos(yaw), nod=pose.lookUp;
  const head=p=>{
   const scale=hero?1.12:outfit==='child'?1.13:1;
   const x=p[0]*scale,y=(p[1]-1.99)*scale-.19,z=(p[2]-.05)*scale;
   return upper([x*hcos+z*hyaw,2.18+y*Math.cos(nod)+z*Math.sin(nod),.05+z*hcos-x*hyaw]);
  };
  loft([[0,1.98,.041,.064,.068],[0,2.01,.057,.122,.126],[0,2.08,.052,.171,.167],[0,2.18,.040,.193,.179],[0,2.29,.025,.173,.164],[0,2.37,.018,.101,.105]],F.skin,12,head);
  for(const x of [-.185,.185]){blob([x,2.14,.025],.047,.064,.037,F.skin,8,head);blob([x*1.14,2.14,.034],.012,.036,.020,F.shade,6,head,.92);}
  // Side-swept, angular-soft black hair. The rear fall and fringe are distinct.
  loft([[0,2.103,-.064,.155,.090],[0,2.17,-.040,.192,.125],[0,2.235,-.024,.202,.152],[0,2.328,.004,.182,.168],[.014,2.395,.015,.127,.127],[.039,2.425,.010,.048,.068]],F.hair,12,head);
  blob([-.075,2.33,.118],.143,.071,.107,F.hair,10,head);
  blob([.069,2.31,.122],.116,.048,.099,F.hair,8,head);
  if(hero){
   const locks=[
    [[-.14,2.23,.105],[-.194,2.34,.117],[-.238,2.39,.102],.047],
    [[-.12,2.32,.137],[-.167,2.433,.134],[-.238,2.431,.109],.066],
    [[-.071,2.37,.08],[-.125,2.473,.095],[-.184,2.494,.049],.076],
    [[-.016,2.38,.034],[.004,2.478,.051],[-.094,2.520,.009],.084],
    [[.057,2.388,.022],[.115,2.468,.037],[.069,2.527,-.025],.068],
    [[.126,2.362,.048],[.176,2.423,.083],[.211,2.453,.039],.056],
    [[.175,2.294,.099],[.204,2.367,.094],[.245,2.387,.030],.052],
    [[.069,2.366,.141],[.017,2.367,.187],[-.082,2.285,.191],.052],
    [[.144,2.344,.123],[.172,2.341,.175],[.096,2.276,.195],.051]
   ];
   for(const [i,[a,b,c,width]] of locks.entries()){
    const shade=i%3===0?[58,41,32]:F.hair;
    const points=closeup?[a,between(a,b,.65),b,between(b,c,.65),c]:[a,b,c];
    const radii=closeup?[width*.58,width,width*.79,width*.42,.003]:[width*.65,width*.83,.003],sides=closeup?7:5;
    const rows=points.map((p,k)=>{
     const tangent=unit(sub(points[Math.min(points.length-1,k+1)],points[Math.max(0,k-1)]));
     const normal=unit(cross(tangent,[0,0,1])),depth=cross(tangent,normal);
     return rings[sides].map(([x,y])=>head(plus(p,plus(times(normal,x*radii[k]),times(depth,y*radii[k]*.68)))));
    });
    for(let k=1;k<rows.length;k++)for(let j=0;j<sides;j++){
     const n=(j+1)%sides;
     emit([rows[k-1][j],rows[k-1][n],rows[k][n],rows[k][j]],shade,.90+.035*j);
    }
   }
  }
  if(feminine){
   blob([0,2.18,-.157],.123,.109,.076,F.hair,10,head);
   limb(head([0,2.18,-.195]),upper([.09,1.83,-.255]),.071,.041,F.hair,8);
   blob([.01,2.15,-.22],.045,.021,.042,[183,94,73],8,head);
  }
  for(const sign of [-1,1]){
   const x=.071*sign, blink=pose.blink;
   blob([x,2.187,.195],hero?.032:.034,(hero?.024:.026)*blink,.010,F.white,hero?8:6,head);
   blob([x+.004,2.188,.204],hero?.018:.015,(hero?.018:.020)*blink,.007,hero?[103,64,38]:[39,38,31],hero?8:6,head);
   if(hero){
    blob([x+.005,2.187,.211],.010,.013*blink,.005,[41,30,24],6,head);
    blob([x+.001,2.194,.217],.004,.004*blink,.003,F.white,6,head);
   }
   limb(head([x-.029,2.234,.186]),head([x+.028,2.24,.18]),.013,.010,F.hair,6);
  }
  blob([0,2.132,.212],.034,.041,.030,F.skin,8,head);
  limb(head([-.038,2.076,.175]),head([.006,2.062,.188]),.005,.006,[132,76,61],6);
  limb(head([.006,2.062,.188]),head([.043,2.080,.174]),.006,.004,[132,76,61],6);
  // Moss-green rucksack with a rounded sleeping roll, shoulder straps, a
  // closure flap, woven detail, buckles and a bottle in one side pocket.
  if(!local&&pose.washing<.25){
  const pack=p=>upper([p[0]+pose.pack*(p[1]-1.1)*.08,p[1]+pose.pack*.013,p[2]+pose.pack*.032]);
  loft([[0,1.07,-.251,.153,.092],[0,1.13,-.303,.233,.153],[0,1.37,-.324,.267,.175],[0,1.62,-.322,.259,.164],[0,1.77,-.294,.221,.131],[0,1.83,-.258,.151,.084]],F.greenDark,12,pack);
  loft([[0,1.24,-.426,.123,.057],[0,1.30,-.447,.203,.088],[0,1.47,-.448,.207,.077],[0,1.55,-.420,.170,.053]],F.green,10,pack);
  blob([0,1.684,-.449],.209,.092,.086,[129,134,81],10,pack);
  if(hero)limb(pack([-.265,1.874,-.345]),pack([.265,1.874,-.345]),.121,.121,F.green,11);
  else limb(pack([-.257,1.81,-.323]),pack([.257,1.81,-.323]),.103,.103,[159,142,96],10);
  for(const x of [-.180,.180]){
   limb(pack([x,1.73,-.486]),pack([x,1.37,-.516]),.023,.028,F.strap,6);
   limb(pack([x-.026,1.575,-.521]),pack([x+.026,1.575,-.521]),.028,.028,F.metal,6);
   if(hero)limb(pack([x-.015,1.879,-.462]),pack([x+.015,1.879,-.462]),.029,.029,F.strap,6);
  }
  if(hero){
   for(const side of [-1,1]){
    const rollFace=(r,a)=>pack([side*.265,1.874+Math.cos(a)*r,-.345+Math.sin(a)*r]);
    for(let i=0;i<10;i++){
     const a=i*TAU/10,b=(i+1)*TAU/10;
     emit([rollFace(.080,a),rollFace(.080,b),rollFace(.068,b),rollFace(.068,a)],F.greenDark,.86,[side,0,0]);
    }
   }
   for(const x of [-.12,.13]){
    emit([pack([x-.067,1.285,-.533]),pack([x+.067,1.285,-.533]),pack([x+.064,1.396,-.530]),pack([x-.064,1.396,-.530])],F.greenDark,1.02,[0,0,-1]);
    blob([x,1.384,-.545],.018,.015,.009,F.trim,6,pack);
   }
  }
  emit([pack([-.065,1.402,-.529]),pack([-.026,1.462,-.531]),pack([.005,1.431,-.529]),pack([.029,1.455,-.528]),pack([.075,1.401,-.527])],F.trim,1.04,[0,0,-1]);
  for(const x of [-.182,.182]){
   limb(upper([x,1.14,.156]),upper([x,1.75,.199]),.040,.046,F.strap,6);
   limb(upper([x,1.75,.199]),upper([x,1.855,-.119]),.046,.040,F.strap,6);
  }
  limb(upper([-.18,1.569,.212]),upper([.18,1.569,.212]),.022,.022,F.strap,6);
  blob([0,1.56,.226],.054,.035,.022,F.metal,6,upper);
  loft([[.255,1.19,-.328,.073,.07],[.259,1.26,-.333,.089,.08],[.262,1.39,-.335,.083,.074]],F.green,8,pack);
  loft([[.264,1.36,-.335,.058,.062],[.264,1.48,-.335,.063,.063],[.260,1.53,-.335,.054,.059],[.260,1.55,-.335,.037,.043]],F.bottle,8,pack);
  blob([.26,1.56,-.335],.055,.029,.054,F.metal,8,pack);
  }
  for(const side of [-1,1]){
   const index=side===1?1:0;
   const [hip,knee,ankle]=pose.legs[index];
   limb(hip,knee,.150,.118,F.pants,9);limb(knee,ankle,.116,.079,F.pants,9);
   blob(knee,.118,.131,.113,hero?F.pants:F.pantsEdge,8,null,.95);
   if(hero){
    const pocket=plus(between(hip,knee,.37),[side*.12,0,.012]);
    blob(pocket,.054,.15,.104,F.pantsEdge,8);
    blob(plus(pocket,[side*.018,.093,0]),.038,.035,.110,F.pants,8);
    limb(between(knee,ankle,.73),between(knee,ankle,.88),.086,.084,F.pantsEdge,9);
   }
   const [x,y,z]=ankle;
   const pitch=pose.feet[index],sin=Math.sin(pitch),cos=Math.cos(pitch);
   const rotateBoot=([a,b,c])=>[a,y+(b-y)*cos+(c-z)*sin,z+(c-z)*cos-(b-y)*sin];
   loft([[x,y-.12,z+.055,.085,.168],[x,y-.105,z+.075,.116,.202],[x,y-.057,z+.075,.118,.205],[x,y-.038,z+.07,.09,.181]],F.sole,9,rotateBoot);
   loft([[x,y-.053,z+.077,.108,.189],[x,y-.012,z+.086,.112,.188],[x,y+.056,z+.049,.103,.153],[x,y+.128,z+.015,.091,.097],[x,y+(hero?.204:.159),z,.078,.083]],F.shoe,9,rotateBoot);
   if(hero)loft([[x,y+.174,z,.080,.085],[x,y+.215,z,.076,.081]],F.sole,9,rotateBoot);
   if(!local)for(let l=0;l<(hero?4:3);l++)limb(rotateBoot([x-.06,y+.049+l*.023,z+.128-l*.017]),rotateBoot([x+.06,y+.058+l*.023,z+.119-l*.017]),.010,.011,F.trim,6);
  }
  const arms=pose.arms.map(a=>a.map(upper));
  arms.forEach(([shoulder,elbow,hand],i)=>{
   blob(shoulder,.142,.166,.147,jacket,8);
   limb(shoulder,elbow,.139,.105,jacket,9);
   if(hero){
    const sleeve=between(elbow,hand,.39);
    limb(elbow,sleeve,.107,.090,jacket,9);
    limb(between(elbow,hand,.29),sleeve,.103,.098,F.cuff,8);
    limb(sleeve,hand,.083,.058,F.skin,9);
    if(i===0){
     limb(between(elbow,hand,.84),between(elbow,hand,.94),.067,.065,F.sole,8);
     blob(plus(between(elbow,hand,.89),[-.065,.007,0]),.024,.030,.032,F.metal,8);
    }
   }else{
    limb(elbow,hand,.105,.069,jacket,9);
    limb(between(elbow,hand,.81),hand,.071,.072,F.cuff,8);
   }
   const end=plus(hand,[0,-.053,.009]);blob(end,.063,.084,.060,F.skin,8);
   blob(plus(end,[i?-.045:.045,.014,.035]),.028,.052,.033,F.skin,6);
  });
  const act=pose.action,hand=arms[1][2],left=arms[0][2];
  function camera(center,transform=p=>p){
   blob(center,.135,.077,.060,F.hair,10,transform);
   const lens=plus(center,[0,0,.036]),rim=plus(center,[0,0,.134]);
   limb(transform(lens),transform(rim),.060,.055,[52,49,45],10);
   limb(transform(plus(rim,[0,0,-.013])),transform(rim),.057,.056,F.metal,10);
   blob(plus(rim,[0,0,.013]),.039,.038,.013,[43,64,70],8,transform);
   blob(plus(rim,[-.015,.013,.025]),.012,.011,.004,[117,160,166],6,transform);
  }
  if(hero&&pose.washing<.25&&!(act==='photo'&&pose.activity>.12)){
   const body=[pose.pack*.019,1.42+pose.pack*.008,.262];
   for(const side of [-1,1])limb(upper([side*.101,1.918,.150]),upper([body[0]+side*.114,body[1]+.038,.258]),.011,.012,F.sole,6);
   camera(body,upper);
  }
  const pole=(grip,tip)=>{
   const head=plus(grip,[0,.11,0]),joint=between(grip,tip,.60);
   limb(head,between(grip,tip,.12),.039,.029,[67,58,46],8);
   limb(grip,joint,.017,.013,[143,99,52],6);
   limb(joint,tip,.012,.006,F.metal,6);
  };
  if(hero&&pose.poles){
   for(const [i,grip] of [left,hand].entries()){
    const side=i===0?-1:1,foot=pose.legs[1-i][2];
    pole(grip,[grip[0]+side*.16,.024,foot[2]-.20]);
   }
  }
  if(outfit==='elder')pole(hand,[.55,.026,.28]);
  if(pose.activity>.12){
   if(act==='fish'||act==='reel'){
    const tip=plus(hand,[.17,.17+pose.castArc*.45,1.04-pose.castArc*.29]);
    limb(hand,between(hand,tip,.38),.024,.014,F.shoe,6);
    limb(between(hand,tip,.38),tip,.013,.005,F.trim,6);
    const float=plus(tip,[.02,-.63,1.12]);
    limb(tip,float,.0035,.0035,F.white,6);blob(float,.036,.056,.036,[217,106,61],6);
   }else if(act==='drink'){
    const b=plus(hand,[.022,.065,.028]),cap=plus(b,[0,.155*(1-pose.sip*.7),.023-pose.sip*.141]);
    limb(b,cap,.052,.041,F.bottle,8);
    blob(cap,.042,.024,.042,F.metal,8);
   }else if(act==='meal'){
    const bowl=plus(left,[.036,.024,.054]);blob(bowl,.115,.062,.111,F.shoe,10);
    blob(plus(bowl,[0,.033,0]),.096,.036,.093,F.white,8);
    limb(hand,plus(hand,[-.09,.065,.086]),.012,.011,F.trim,6);
   }else if(act==='snack'){
    const bite=plus(hand,[-.010,.071,.025]),size=pose.bite>.8?.046:.063;
    blob(bite,size,size*.88,size,[194,117,43],8);
    limb(plus(bite,[0,.02,0]),plus(bite,[.014,.064,.005]),.011,.005,F.green,6);
   }else if(act==='photo'){
    camera(plus(between(left,hand,.5),[0,.036,.032]));
   }
  }
 }
 function create(gaitOffset=0){
  let phase=gaitOffset,blend=0,run=0,mixActivity=0,lastAction='',faceYaw=0;
  let previousFeet=null,settle=null,wasWalking=false,lastJump=null,landing=1,pivot=0,pivotPhase=0;
  return {pose({moving=false,mode='walk',speed=0,actualSpeed=0,seconds=0,dt=.033,action='',actionTime=0,turn=0,turnDelta=0,reduced=false,trekking=false,distance=Math.abs(actualSpeed)*dt,scale=1,jump=null}){
   dt=clamp(dt,0,.08);
   const damp=(k)=>1-Math.exp(-dt*k);
   const rolling=mode!=='walk',stance=.64,stride=rolling?.23:.49;
   const walking=moving&&!rolling&&jump===null;
   const effort=clamp(Math.max(Math.abs(actualSpeed),dt>0?distance/dt:0)/(rolling?26:2.5),0,1.25);
   blend=mix(blend,moving?rolling?1:clamp(.25+.76*effort,.25,1):0,damp(moving?12:11));
   run=mix(run,clamp((speed-1.015)*6,0,1)*Math.min(1,effort),damp(5));
   // A full planted stroke moves from +stride to -stride. Advancing this
   // phase by distance cancels the player's forward motion during stance.
   if(moving&&jump===null)phase=(phase+(rolling?dt*8.5:distance*TAU*stance/(2*stride*scale)))%TAU;
   if(action)lastAction=action;
   mixActivity=mix(mixActivity,action?1:0,damp(action?8:5));
   faceYaw=mix(faceYaw,clamp(turn*.24+turnDelta*6,-.32,.32),damp(7));
   const actions={rest:lastAction==='rest'?mixActivity:0};
   const washing=lastAction==='bath'||lastAction==='shower'?mixActivity:0;
   const sip=lastAction==='drink'?ease(clamp(actionTime/.69,0,1))*(1-ease(clamp((actionTime-1.22)/.62,0,1)))*mixActivity:0;
   const bite=ease(clamp((actionTime-.22)/.58,0,1))*(1-ease(clamp((actionTime-1.04)/.48,0,1)));
   if(jump===null&&lastJump!==null&&lastJump>=.78)landing=0;
   else landing=Math.min(1,landing+dt/.30);
   lastJump=jump;
   const turning=!moving&&!rolling&&jump===null?clamp(Math.abs(turnDelta)/Math.max(dt,.016)/3.8,0,1):0;
   pivot=mix(pivot,turning,damp(14));pivotPhase+=Math.abs(turnDelta)*4.8;
   if(walking||rolling||jump!==null||actions.rest>.01||turning>.12)settle=null;
   else if(wasWalking&&previousFeet){
    const [left,right]=previousFeet;
    const first=left.ankle[1]-right.ankle[1]>.03||left.ankle[1]>=right.ankle[1]-.03&&left.ankle[2]<right.ankle[2]?0:1;
    settle={feet:previousFeet,first,time:0};
   }
   wasWalking=walking;
   const sit=actions.rest, breathing=Math.sin(seconds*2.4);
   const tuck=jump===null?0:Math.sin(clamp(jump,0,1)*PI);
   const load=jump!==null&&jump<0?ease(clamp(1+jump*10,0,1))*.105:
    jump!==null?.105*(1-ease(clamp(jump/.16,0,1))):.145*Math.sin(PI*landing)*(1-landing*.55);
   const lean=(rolling?.25:.064+run*.16)*blend+tuck*.15+load*.65+washing*.075;
   const sway=Math.sin(phase+.25);
   const hipShift=(rolling?0:sway*blend*.052)*(1-sit);
   const bob=(reduced?.45:1)*(-Math.cos(phase*2+.35)*blend*.029+breathing*.008)-load;
   const hips=1.10-sit*.58-(rolling?.08:0)+bob;
   const feet=[];
   const legs=[-1,1].map(sign=>{
    const t=(phase+(sign===1?PI:0))%TAU/TAU;
    const recovery=clamp((t-stance)/(1-stance),0,1);
    const followThrough=2*(1-stance)/stance;
    const swingPath=-1+2*ease(recovery)-followThrough*recovery*(1-recovery)*(1-2*recovery);
    const fore=(t<stance?1-2*t/stance:swingPath)*stride*blend*(1-sit);
    const lift=Math.sin(recovery*PI)**1.45*blend*(.285+run*.062)*(1-sit);
    // Land on the heel, pass through a flat stance, then push off the toe.
    let pitch=rolling?0:(t<stance
     ?.24*(1-ease(clamp(t/.14,0,1)))-.43*ease(clamp((t-.44)/(stance-.44),0,1))
     :mix(-.43,.24,ease(recovery)))*blend*(1-sit);
    const footPivot=pitch<0?.245:-.112;
    const pedal=mode==='bike'?blend:0;
    let foot=[sign*(.153+sit*.086),.123+(rolling?.24+pedal*.15*Math.sin(t*TAU):lift-footPivot*Math.sin(pitch)),
     (rolling?.13+pedal*.23*Math.cos(t*TAU):fore)+sit*.56];
    if(jump!==null){
     foot[1]=mix(foot[1],.41+tuck*(sign===1?.31:.21),tuck);
     foot[2]=mix(foot[2],sign===1?.32:-.25,tuck);
    }
    if(!moving&&!rolling&&jump===null&&sit<=.01){
     const index=sign===-1?0:1,wave=Math.sin(pivotPhase+index*PI);
     foot=[sign*.153,.123+Math.max(0,wave)*pivot*.095,sign*.038+wave*pivot*.115];
     pitch=wave*pivot*.09;
     if(settle){
      const start=settle.feet[index],primary=index===settle.first;
      const progress=clamp((settle.time-(primary?0:.105))/(primary?.22:.21),0,1);
      foot=between(start.ankle,foot,ease(progress));
      foot[1]+=Math.sin(progress*PI)*(primary?.064:.037);
      pitch=mix(start.pitch,pitch,ease(progress));
     }
    }
    feet.push(pitch);
    const hip=[sign*.158+hipShift,hips,sit*-.11+sign*sway*blend*.038];
    if(rolling||sit>.01)return [hip,[sign*(.168+sit*.074),mix(.59,.35,sit),foot[2]*.65+.12],foot];
    const rise=hip[1]-foot[1],reach=foot[2]-hip[2],distance=Math.hypot(rise,reach)||1;
    const flex=Math.sqrt(Math.max(0,.56**2-distance**2*.25));
    const knee=[sign*.168,(hip[1]+foot[1])*.5+flex*reach/distance,(hip[2]+foot[2])*.5+flex*rise/distance];
    return [hip,knee,foot];
   });
   if(settle){settle.time+=dt;if(settle.time>=.32)settle=null;}
   previousFeet=legs.map((leg,i)=>({ankle:leg[2],pitch:feet[i]}));
   function actionHand(sign,base){
    const t=actionTime,side=sign>0,last=lastAction;
    let to=base;
    if(last==='fish'||last==='reel')to=[sign*(side?.26:.18),1.27+(side?.26:.04)*Math.max(0,Math.sin(t*4)),.48];
    if(last==='meal')to=side?[.15-.06*bite,1.46+.46*bite,.34-.045*bite]:[-.15,1.43,.37];
    if(last==='snack')to=side?[.17-.09*bite,1.45+.53*bite,.36-.08*bite]:base;
    if(last==='drink')to=side?[.14-.058*sip,1.40+.51*sip,.31-.026*sip]:base;
    if(last==='bath'||last==='shower'){
     const reach=ease(clamp((Math.sin(t*2.7+(side?0:PI))+.65)/1.65,0,1));
     to=[sign*(.13+.16*(1-reach)),1.30+.84*reach,.32-.18*reach];
    }
    if(last==='rest')to=[sign*.26,1.08,.46];
    if(last==='photo')to=[sign*.113,2.069,.313];
    if(last==='scuffle')to=[sign*.32,1.58+.18*Math.sin(t*5+sign),.35];
    return between(base,to,mixActivity);
   }
   const poles=trekking&&mode==='walk'&&mixActivity<.10;
   const arms=[-1,1].map(sign=>{
    const strideZ=Math.cos(phase-.39)*sign*(poles?.38:.29)*blend+tuck*.22+pivot*.055*sign;
    const flex=Math.max(0,strideZ);
    const hand=actionHand(sign,[sign*(.425+Math.abs(strideZ)*.075),rolling?1.24:poles?1.27:1.087+run*.08+flex*.33+load,rolling?.49:strideZ+(poles?.21:0)]);
    const elbow=[sign*(.43+(rolling?.03:0)),mix(1.39,(1.54+hand[1])*.5,mixActivity),mix(rolling?.28:strideZ*.49-.066,hand[2]*.5-.08,mixActivity)];
    return [[sign*.347,1.728,0],elbow,hand];
   });
   const blink=1-.93*Math.pow(Math.max(0,Math.cos(seconds*1.37+1.3)),95);
   const roll=(reduced?.5:1)*(sway*blend*.044+turn*(rolling?.18:.075));
   const twist=(reduced?.55:1)*(-sway*blend*.095+clamp(turnDelta*5,-.16,.16));
   return {legs,feet,arms,poles,blink,faceYaw,lean,roll,twist,hipShift,crouch:sit,actions,pack:Math.cos(phase-.31)*blend,lookUp:sip*.24-washing*.10,bob,action:lastAction,activity:mixActivity,castArc:Math.sin(actionTime*4),washing,sip,bite};
  },reset(){
   phase=gaitOffset;blend=0;run=0;mixActivity=0;lastAction='';faceYaw=0;
   previousFeet=null;settle=null;wasWalking=false;lastJump=null;landing=1;pivot=0;pivotPhase=0;
  }};
 }
 return {create,draw};
})();
