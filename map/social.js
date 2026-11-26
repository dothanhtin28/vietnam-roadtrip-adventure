'use strict';
globalThis.TripSocial=(()=>{
 const E=TripEngine, D=TripData;
 const creators={
  an:{name:'An Mây',handle:'@anmay.dian',role:'KOC ẩm thực',bio:'Review quán nhỏ và những món đáng thử ở mỗi bản.',greeting:'Anh có món nào ở Hà Giang muốn thử không? Em đang tìm một quán cơm nhà.',romance:{flirt:'Em thích cách anh nhớ mấy quán nhỏ em kể.',date:'Cùng chọn một món ở quán ven đường rồi chia đôi. Em muốn thử thêm chỗ này với anh.',yes:'Em cũng thích anh. Mình yêu nhau nha?'}},
  khoi:{name:'Khôi Đèo',handle:'@khoideo.road',role:'KOL du lịch',bio:'Quay clip đường đèo, chợ phiên và những người gặp trên đường.',greeting:'Anh vừa đi qua đoạn nào đẹp? Em đang ghi lại chuyến đi Hà Giang.'},
  nhi:{name:'Nhi Gió',handle:'@nhigio.camp',role:'KOC đồ dã ngoại',bio:'Thử đồ đi đường và giới thiệu các cửa hàng địa phương.',greeting:'Sáng mai em định test bộ pha cà phê cắm trại. Anh hay nghỉ ở đâu?',romance:{flirt:'Nói chuyện với anh vui ghê. Lần sau kể em nghe thêm về chuyến leo đèo nhé.',date:'Mình pha hai ly cà phê rồi ngồi ngắm đường đèo nhé, em mang sẵn bộ pha đây.',yes:'Em cũng có tình cảm với anh. Em muốn tụi mình chính thức hẹn hò.'}}
 };
 const venues={
  start:{name:'Sân cà phê Hà Giang',host:'an',topic:'quán nhỏ ven sông Lô',outing:'Đi dạo bờ sông'},
  yen:{name:'Phố quán Yên Minh',host:'nhi',topic:'quầy đồ dã ngoại',outing:'Đi chơi ở phố quán'},
  dong:{name:'Sân chợ Đồng Văn',host:'khoi',topic:'món ăn chợ phiên',outing:'Dạo chợ và nghe nhạc'}
 };
 const actions={
  greet:{label:'Chào hỏi',gain:10,minutes:10},
  chat:{label:'Trò chuyện',gain:7,minutes:18,min:10},
  meal:{label:'Ăn cùng · 10k',gain:12,minutes:35,min:10,cost:10,food:20,water:10},
  outing:{gain:14,minutes:65,min:15,cost:8,energy:-6},
  clip:{label:'Quay clip cùng',gain:9,minutes:30,min:22},
  flirt:{label:'Tán tỉnh',gain:3,minutes:12,min:17,affection:16},
  date:{label:'Mời đi hẹn hò',gain:9,minutes:50,min:30,interest:16,affection:20},
  confess:{label:'Ngỏ lời yêu',gain:0,minutes:15,min:35,interest:20},
  breakup:{label:'Dừng hẹn hò',gain:0,minutes:10}
 };
 const owns=(value,key)=>Object.hasOwn(value,key);
 const limit=(value,min,max)=>Math.min(max,Math.max(min,value));
 const int=(n,max)=>Number.isSafeInteger(n)?limit(n,0,max):0;
 const dayOf=s=>E.day(s);
 function restore(data){
  const contacts={};
  for(const id of Object.keys(creators)){
   const saved=data?.contacts?.[id],done={};
   if(!saved)continue;
   for(const action of Object.keys(actions))done[action]=int(saved.done?.[action],Number.MAX_SAFE_INTEGER);
   contacts[id]={bond:int(saved.bond,100),done,affection:int(saved.affection,100),dates:int(saved.dates,999)};
  }
  const incidents={};
  for(const id of Object.keys(venues)){
   const saved=data?.incidents?.[id];
   if(saved&&Number.isSafeInteger(saved.day)&&['calm','fight'].includes(saved.outcome))incidents[id]={day:saved.day,outcome:saved.outcome};
  }
  const detained=owns(venues,data?.detained)?data.detained:null;
  const partner=owns(creators,data?.partner)&&creators[data.partner].romance&&contacts[data.partner]?.dates>=2?data.partner:null;
  return {contacts,incidents,detained,partner,followers:int(data?.followers,999999),clips:int(data?.clips,99999),reputation:int(data?.reputation??50,100)};
 }
 function venue(s){
  const id=D.places[s.at].id;
  if(!owns(venues,id))return null;
  const spot=venues[id],others=Object.keys(creators).filter(name=>name!==spot.host);
  const partner=s.social.partner;
  return {...spot,id,guests:[spot.host,partner&&partner!==spot.host?partner:others[(dayOf(s)-1)%others.length]]};
 }
 const contact=(s,id)=>s.social.contacts[id]??{bond:0,done:{},affection:0,dates:0};
 const romanticKeys=new Set(['flirt','date','confess','breakup']);
 function visible(s,id,key){
  if(!romanticKeys.has(key))return true;
  if(!creators[id]?.romance)return false;
  const partner=s.social.partner;
  if(key==='breakup')return partner===id;
  if(key==='confess')return !partner;
  return !partner||partner===id;
 }
 function requirements(s,id,key){
  const act=actions[key],person=contact(s,id);
  if(person.bond<(act.min??0))return 'Cần thân thiết '+act.min;
  if(person.affection<(act.interest??0))return 'Cần cảm tình '+act.interest;
  if(person.done[key]===dayOf(s)&&key!=='breakup')return 'Đã làm hôm nay';
  if(s.money<(act.cost??0))return 'Cần '+act.cost+'k';
  return '';
 }
 function banter(s,spot){
  const [a,b]=spot.guests.map(id=>creators[id].name);
  const day=dayOf(s),minute=s.clock%1440;
  const lines=[
   a+' hỏi '+b+' có ghé '+spot.topic+' chưa.',
   b+' đưa '+a+' xem đoạn clip vừa quay trong chuyến đi.',
   a+' và '+b+' bàn xem nên rủ ai đi ăn tối.'
  ];
  return lines[(day+Math.floor(minute/16))%lines.length];
 }
 function available(s,id,key,spot=venue(s)){
  return Boolean(owns(actions,key)&&spot?.guests.includes(id)&&!s.social.detained
   &&visible(s,id,key)&&!requirements(s,id,key));
 }
 function interact(s,id,key){
  if(!owns(creators,id)||!owns(actions,key)||!available(s,id,key))return '';
  const act=actions[key],person=contact(s,id),{name,romance}=creators[id];
  s.social.contacts[id]=person;
  person.done[key]=dayOf(s);person.bond=limit(person.bond+act.gain,0,100);
  s.money-=act.cost??0;
  s.food=limit(s.food+(act.food??0),0,100);
  s.water=limit(s.water+(act.water??0),0,100);
  s.energy=limit(s.energy+(act.energy??0),0,100);
  s.clock+=act.minutes;
  if(romanticKeys.has(key)){
   if(key==='breakup'){
    s.social.partner=null;person.affection=0;person.dates=0;
    return 'Anh và '+name+' đã nói chuyện và quyết định dừng hẹn hò.';
   }
   if(key==='confess'){
    if(person.dates<2||person.affection<50||person.bond<50)return name+' nói “Em có cảm tình, nhưng muốn có thêm thời gian tìm hiểu nhau.”';
    s.social.partner=id;
    return name+' nói “'+romance.yes+'” Cả hai đã thành một đôi.';
   }
   person.affection=limit(person.affection+act.affection,0,100);
   if(key==='date')person.dates=Math.min(999,person.dates+1);
   return name+' nói “'+romance[key]+'”';
  }
  if(key==='clip'){
   const gained=30+person.bond*2+Math.floor(s.social.reputation/2);
   s.social.followers=Math.min(999999,s.social.followers+gained);
   s.social.clips=Math.min(99999,s.social.clips+1);
   s.social.reputation=limit(s.social.reputation+3,0,100);
   return 'Clip du lịch với '+name+' đã lên kênh trong game. +'+gained+' người theo dõi.';
  }
  if(key==='greet')return name+' nói “'+creators[id].greeting+'”';
  if(key==='meal')return 'Ăn và trò chuyện cùng '+name+'. +20 no, +10 nước.';
  if(key==='outing')return 'Đã đi chơi cùng '+name+'. Hai người thân hơn.';
  return name+' kể thêm về chuyến đi. Độ thân thiết +'+act.gain+'.';
 }
 function conflict(s,spot=venue(s)){
  if(!spot||s.social.detained||s.social.incidents[spot.id]?.day===dayOf(s))return false;
  const afterOuting=spot.guests.some(id=>contact(s,id).done.outing===dayOf(s));
  return afterOuting||s.clock%1440>=1110;
 }
 function resolve(s,choice){
  const spot=venue(s);
  if(!conflict(s,spot)||!['calm','fight'].includes(choice))return '';
  s.social.incidents[spot.id]={day:dayOf(s),outcome:choice};
  if(choice==='calm'){
   s.clock+=12;s.social.reputation=limit(s.social.reputation+4,0,100);
   return 'Hai bên đã bình tĩnh và nói chuyện lại. +4 uy tín.';
  }
  s.health=limit(s.health-6,1,100);s.energy=limit(s.energy-12,0,100);
  s.social.reputation=limit(s.social.reputation-15,0,100);s.social.detained=spot.id;
  s.clock+=20;
  return 'Vụ xô xát khiến cảnh sát đưa anh về trạm. Anh cần giải quyết biên bản để đi tiếp.';
 }
 function settle(s){
  if(!s.social.detained||s.social.detained!==venue(s)?.id)return '';
  const fee=Math.min(s.money,25);
  s.money-=fee;s.clock+=100;s.social.detained=null;
  return 'Đã giải quyết ở trạm'+(fee?' · −'+fee+'k':'')+'. Anh có thể tiếp tục chuyến đi.';
 }
 return {creators,actions,restore,venue,contact,banter,visible,requirements,available,interact,conflict,resolve,settle};
})();
