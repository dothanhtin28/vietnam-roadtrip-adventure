'use strict';
globalThis.TripSocial=(()=>{
 const E=TripEngine, D=TripData;
 const creators={
  an:{name:'An Mây',age:26,handle:'@anmay.dian',role:'KOC ẩm thực',bio:'Review quán nhỏ và những món đáng thử ở mỗi bản.',greeting:'Anh có món nào ở Hà Giang muốn thử không? Em đang tìm một quán cơm nhà.',romance:{flirt:'Em thích cách anh nhớ mấy quán nhỏ em kể.',date:'Cùng chọn một món ở quán ven đường rồi chia đôi. Em muốn thử thêm chỗ này với anh.',yes:'Em cũng thích anh. Mình yêu nhau nha?',proposal:'Em đồng ý. Mình làm một đám cưới nhỏ, mời những người đã gặp dọc đường nha anh.'}},
  khoi:{name:'Khôi Đèo',handle:'@khoideo.road',role:'KOL du lịch',bio:'Quay clip đường đèo, chợ phiên và những người gặp trên đường.',greeting:'Anh vừa đi qua đoạn nào đẹp? Em đang ghi lại chuyến đi Hà Giang.'},
  nhi:{name:'Nhi Gió',age:27,handle:'@nhigio.camp',role:'KOC đồ dã ngoại',bio:'Thử đồ đi đường và giới thiệu các cửa hàng địa phương.',greeting:'Sáng mai em định test bộ pha cà phê cắm trại. Anh hay nghỉ ở đâu?',romance:{flirt:'Nói chuyện với anh vui ghê. Lần sau kể em nghe thêm về chuyến leo đèo nhé.',date:'Mình pha hai ly cà phê rồi ngồi ngắm đường đèo nhé, em mang sẵn bộ pha đây.',yes:'Em cũng có tình cảm với anh. Em muốn tụi mình chính thức hẹn hò.',proposal:'Em đồng ý. Sau này mình vẫn dành thời gian lên đèo pha cà phê với nhau nhé.'}},
  thao:{name:'Thảo Lâm',age:25,handle:'@thaolam.anh',role:'KOL nhiếp ảnh',stops:['quan','dog','start'],bio:'Chụp sương sớm, ruộng bậc thang và chân dung người đi chợ.',greeting:'Anh đến đúng lúc em đang đợi mây tan trên Núi Đôi.',romance:{flirt:'Anh để ý cả ánh sáng lúc chiều muộn à? Em thích người tinh ý như anh.',date:'Mình chọn một góc rồi mỗi người chụp cho nhau một tấm nhé.',yes:'Em cũng muốn hai đứa hẹn hò.',proposal:'Em đồng ý. Bức ảnh đầu tiên sau lễ cưới để em tự chụp nhé.'}},
  quynh:{name:'Quỳnh Đạp',age:28,handle:'@quynh.dapdeo',role:'KOC xe đạp',stops:['river','yen','cat'],bio:'Thử cung đạp xe và kể chuyện những trạm nghỉ dọc đèo.',greeting:'Em vừa xuống dốc. Anh có biết gần đây có chỗ bơm bánh không?',romance:{flirt:'Anh nói vậy làm em quên cả mỏi chân.',date:'Mình đi bộ ra bến uống nước rồi xem ai kể chuyện đèo vui hơn.',yes:'Em thích anh. Mình cứ hẹn hò nhé.',proposal:'Em đồng ý. Mình lấy đèo đầu tiên từng đi cùng làm kỷ niệm nha.'}},
  linhnghe:{name:'Linh Chàm',age:29,handle:'@linhcham.nghe',role:'KOL văn hóa và thủ công',stops:['dog','cat','dong'],bio:'Ghi lại nghề dệt và câu chuyện của các nghệ nhân vùng cao.',greeting:'Em đang tìm người chỉ cách nhận ra một mảnh vải nhuộm chàm.',romance:{flirt:'Em vui vì anh nhớ câu chuyện người thợ hôm trước.',date:'Mình ghé quầy vải chọn một món nhỏ làm kỷ niệm nhé.',yes:'Em muốn mình tìm hiểu nhau nghiêm túc hơn.',proposal:'Em đồng ý. Em muốn tự chọn một mảnh vải cho ngày cưới.'}},
  yenchi:{name:'Yến Chi',age:26,handle:'@yenchi.comban',role:'KOC món bản',stops:['cat','start','dong'],bio:'Ghi sổ những hàng bánh, bát phở và bữa cơm bản gặp trên đường.',greeting:'Anh giữ bụng đói một chút nhé, em còn muốn thử món bánh ven đường.',romance:{flirt:'Anh làm em cười đến quên ghi tên quán rồi.',date:'Hôm nay mình chọn món cho nhau, tới lúc dọn ra mới bật mí.',yes:'Em cũng thích anh. Mình hẹn hò nha.',proposal:'Em đồng ý. Phần đồ ăn đám cưới cho em chọn cùng anh nhé.'}},
  duy:{name:'Duy Khung Hình',age:28,handle:'@duy.khung',role:'KOL làm phim',stops:['ma','quan','yen'],bio:'Quay phim tài liệu ngắn về đèo, chợ và các con sông.',greeting:'Anh vừa xuống từ hướng nào? Tôi đang tìm góc quay dọc vách đá.'},
  bao:{name:'Bảo Mộc',age:31,handle:'@bao.moc',role:'KOC nhạc acoustic',stops:['dong','river','dog'],bio:'Mang đàn đi chợ phiên và thu lại tiếng động dọc đường.',greeting:'Anh thích nghe nhạc ven chợ không? Tôi vừa viết một đoạn lúc qua bến sông.'}
 };
 const venues={
  start:{name:'Sân cà phê Hà Giang',topic:'quán nhỏ ven sông Lô',outing:'Đi dạo bờ sông'},
  river:{name:'Bờ kè sông Lô',topic:'chiếc thuyền bên bến',outing:'Dạo bờ kè'},
  dog:{name:'Sân đầu bản',topic:'nghề dệt trong bản',outing:'Dạo quanh bản'},
  quan:{name:'Điểm ngắm Núi Đôi',topic:'mây trên Núi Đôi',outing:'Đi chụp ảnh quanh thung lũng'},
  yen:{name:'Phố quán Yên Minh',topic:'quầy đồ dã ngoại',outing:'Đi chơi ở phố quán'},
  cat:{name:'Hiên quán cao nguyên',topic:'quán cơm ở đầu ngõ',outing:'Dạo ngõ cao nguyên'},
  dong:{name:'Sân chợ Đồng Văn',topic:'món ăn chợ phiên',outing:'Dạo chợ và nghe nhạc'},
  ma:{name:'Điểm dừng bên đèo',topic:'góc quay nhìn xuống hẻm Tu Sản',outing:'Dạo quanh điểm ngắm đèo'}
 };
 const destinations=Object.keys(venues),hours=[360,660,1020],cycleDays=5;
 for(const person of Object.values(creators))person.gender=person.romance?'female':'male';
 const specialties=[
  ['KOL nhiếp ảnh','chụp ảnh mùa lúa', 'Anh biết chỗ nào đón nắng đẹp buổi sớm không?'],
  ['KOC món bản','thử các hàng ăn nhỏ', 'Anh đã thử món nào ở bản này chưa?'],
  ['KOL du lịch','ghi lại những chuyến đi vùng cao', 'Anh muốn ghé điểm nào trên cung đường này?'],
  ['KOC đồ dã ngoại','thử lều và đồ cắm trại', 'Anh thường mang món gì nhẹ nhất khi đi đèo?'],
  ['KOL quay phim','quay những con đường và phiên chợ', 'Theo anh góc nào kể được câu chuyện của chỗ này?'],
  ['KOC xe đạp','khảo sát các dốc và trạm nghỉ', 'Đoạn đường anh vừa qua có dễ đạp xe không?'],
  ['KOL văn hóa','tìm hiểu nghề thủ công', 'Anh có gặp người dệt vải ở bản nào dọc đường không?'],
  ['KOC cà phê','tìm quán và thử các cách pha', 'Anh hay uống cà phê ở đâu khi đi xa?'],
  ['KOL âm nhạc','thu âm thanh dọc đường', 'Anh nghe thấy tiếng nhạc ở phía chợ không?'],
  ['KOC video ngắn','dựng clip về vẻ đẹp ven đường', 'Nếu quay một đoạn ở đây, anh muốn mở đầu bằng gì?']
 ];
 const visitingGroups=[
  {gender:'female',first:'Mai Lan Hạ Vân Trúc Thu Ngọc Thanh Diệp Kim Hương Thư Nhã Hoài Minh Hà Tú Bích Ánh Trâm An Mỹ'.split(' '),last:['Vy','Lam','Nhi'],assets:['thao','quynh','linhnghe','yenchi','an','nhi']},
  {gender:'male',first:'Hải Nam Tùng Sơn Phúc Vũ Lâm Tiến Nhật Bách Khang Phong Thái Đức'.split(' '),last:['Khánh','Huy'],assets:['duy','bao','khoi']}
 ];
 let visitor=0;
 for(const {gender,first,last,assets} of visitingGroups){
  for(const given of first)for(const middle of last){
   const index=visitor++,id='guest-'+(index+1),name=given+' '+middle;
   const [role,specialty,greeting]=specialties[index%specialties.length];
   const handle=name.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().replace(' ','.');
   const romance=gender==='female'?{
    flirt:['Em thích cách anh nhìn những điều nhỏ trên đường.','Anh nói vậy làm em muốn nán lại đây lâu hơn.','Hôm nay nói chuyện với anh vui ghê.'][index%3],
    date:'Mình dành buổi này để '+specialty+' cùng nhau nhé.',
    yes:['Em cũng có tình cảm với anh. Mình hẹn hò nhé.','Em đồng ý. Mình dành thời gian cho nhau nhiều hơn nha.'][index%2],
    proposal:'Em đồng ý. Mình giữ một ngày thật đẹp trong chuyến đi này nhé.'
   }:undefined;
   creators[id]={name,gender,age:23+index%12,handle:'@'+handle+'.road',role,bio:'Đi nhiều nơi để '+specialty+'.',greeting,romance,
    openAt:32+(index%4)*3,asset:assets[index%assets.length],colorShift:(index%7-3)*6,visit:(index*37+3)%(destinations.length*hours.length*cycleDays)};
  }
 }
 const villagers=[
  ['Lò Thị Pha','female','dog','Chăm đồi chè','tea-grower'],['Vàng Thị Dế','female','dog','Dệt vải lanh','weaver'],['Sùng Thị Mỷ','female','cat','Bán bánh ngô','weaver'],
  ['Hoàng Thị Én','female','quan','Trồng rau trên nương','tea-grower'],['Lý Thị Duyên','female','river','Bán chè và nước lá','weaver'],['Triệu Thị Hoa','female','cat','Chăm vườn mận','tea-grower'],
  ['Phàn Thị Nụ','female','dong','Mang rau ra chợ phiên','tea-grower'],['Lò Văn Lâm','male','river','Chở hàng qua bến','basket-maker'],['Vàng A Sáng','male','dog','Làm nương ngô','field-hand'],['Hoàng Văn Định','male','cat','Đan giỏ tre','basket-maker']
 ];
 for(const [index,[name,gender,home,role,asset]] of villagers.entries()){
  const stops=[home,index%2?'dong':'yen',home];
  const romance=gender==='female'?{flirt:'Nói chuyện với anh vui hơn em tưởng.',date:'Xong việc, mình đi dạo quanh bản nhé.',yes:'Em đồng ý. Lúc nào rảnh anh lại ghé bản nhé.',proposal:'Em đồng ý. Mình cùng về thưa chuyện với gia đình nha.'}:undefined;
  creators['local-'+(index+1)]={name,gender,home,stops,role,asset,romance,age:24+index,openAt:40+index%3*4,colorShift:(index%5-2)*9,bio:'Quanh năm làm việc ở '+D.places.find(place=>place.id===home).name+'.',greeting:'Anh có cần tôi chỉ lối quanh đây không?'};
 }
 const regulars=Object.entries(creators).filter(([,person])=>person.visit===undefined);
 for(const person of Object.values(creators)){
  if(person.visit===undefined)continue;
  const slot=Math.floor(person.visit/destinations.length),clock=Math.floor(slot/hours.length)*1440+hours[slot%hours.length];
  const location=destinations[person.visit%destinations.length];
  const used=new Set(regulars.filter(([id])=>where(id,clock)===location).map(([id,member])=>member.asset??id));
  if(used.has(person.asset))person.asset=visitingGroups.find(group=>group.gender===person.gender).assets.find(asset=>!used.has(asset))??person.asset;
 }
 const actions={
  greet:{label:'Chào hỏi',gain:10,minutes:10},
  chat:{label:'Trò chuyện',gain:7,minutes:18,min:10},
  meal:{label:'Ăn cùng · 10k',gain:12,minutes:35,min:10,cost:10,food:20,water:10},
  outing:{gain:14,minutes:65,min:15,cost:8,energy:-6},
  clip:{label:'Quay clip cùng',gain:9,minutes:30,min:22},
  flirt:{label:'Tán tỉnh',gain:3,minutes:12,min:17,affection:16},
  date:{label:'Mời đi hẹn hò',gain:9,minutes:50,min:30,interest:16,affection:20},
  confess:{label:'Ngỏ lời yêu',gain:0,minutes:15,min:35,interest:20},
  discussOpen:{label:'Bàn về hẹn hò mở',minutes:15,min:32},
  proposal:{label:'Cầu hôn',min:68,interest:70,dates:3,minutes:20},
  wedding:{label:'Tổ chức đám cưới',minutes:120},
  planFamily:{label:'Bàn chuyện có con',minutes:20},
  pauseFamily:{label:'Tạm hoãn kế hoạch có con',minutes:10},
  private:{label:'Đồng ý ở lại cùng nhau',minutes:90},
  later:{label:'Để dịp khác',minutes:0},
  breakup:{label:'Dừng hẹn hò',gain:0,minutes:10}
 };
 const owns=(value,key)=>Object.hasOwn(value,key);
 const limit=(value,min,max)=>Math.min(max,Math.max(min,value));
 const int=(n,max)=>Number.isSafeInteger(n)?limit(n,0,max):0;
 const dayOf=s=>E.day(s);
 const adultPartner=id=>creators[id]?.age>=18&&Boolean(creators[id].romance);
 function restore(data){
  const contacts={};
  for(const id of Object.keys(creators)){
   const saved=data?.contacts?.[id],done={};
   if(!saved)continue;
   for(const action of Object.keys(actions))done[action]=int(saved.done?.[action],Number.MAX_SAFE_INTEGER);
   const dates=int(saved.dates,999),legacy=id===data.partner;
   const status=saved.relationship??(legacy?data.union??'dating':null);
   const relationship=adultPartner(id)&&dates>=2&&['dating','engaged','married'].includes(status)?status:null;
   contacts[id]={bond:int(saved.bond,100),done,affection:int(saved.affection,100),dates,relationship,
    open:adultPartner(id)&&saved.open===true,planFamily:relationship==='married'&&(saved.planFamily??(legacy&&data.planFamily))===true,
    privateDay:relationship?int(saved.privateDay??(legacy?data.privateDay:0),Number.MAX_SAFE_INTEGER):0};
  }
  const incidents={};
  for(const id of Object.keys(venues)){
   const saved=data?.incidents?.[id];
   if(saved&&Number.isSafeInteger(saved.day)&&['calm','fight'].includes(saved.outcome))incidents[id]={day:saved.day,outcome:saved.outcome};
  }
  const detained=owns(venues,data?.detained)?data.detained:null;
  const family=adultPartner(data?.family?.parent)&&int(data.family.dueAt,Number.MAX_SAFE_INTEGER)>0?{parent:data.family.parent,dueAt:data.family.dueAt,lastCare:int(data.family.lastCare,Number.MAX_SAFE_INTEGER)}:null;
  return {contacts,incidents,detained,family,followers:int(data?.followers,999999),clips:int(data?.clips,99999),reputation:int(data?.reputation??50,100)};
 }
 function where(id,clock){
  const person=creators[id],day=Math.floor(clock/1440),minute=clock%1440;
  const period=minute>=hours[2]?2:minute>=hours[1]?1:minute>=hours[0]?0:-1;
  if(id==='an')return 'start';
  if(id==='nhi')return 'yen';
  if(id==='khoi')return day%2===0&&period===2?'start':'dong';
  if(period<0)return null;
  if(person.stops)return person.stops[period];
  const visit=Math.floor(person.visit/destinations.length);
  return day%cycleDays===Math.floor(visit/hours.length)&&period===visit%hours.length?destinations[person.visit%destinations.length]:null;
 }
 const placeIndex=new Map(D.places.map((place,index)=>[place.id,index]));
 const identities=Object.keys(creators), plansByDay=new Map();
 const workByRole=[[/ảnh|phim|video/iu,'Đi tìm góc quay và chụp cảnh'],[/ẩm thực|món bản|cà phê/iu,'Ghé quán thử món và ghi chép'],[/đạp xe|xe đạp/iu,'Kiểm tra xe và khảo sát đường'],[/dã ngoại/iu,'Thử đồ dã ngoại'],[/hóa|thủ công/iu,'Ghi chép chuyện trong bản'],[/nhạc/iu,'Tập đàn và thu âm']];
 function itineraryStop(id,day,period){
  const person=creators[id],publicStop=where(id,day*1440+hours[period]);
  if(publicStop)return {at:placeIndex.get(publicStop),public:true};
  const home=person.home??destinations[person.visit%destinations.length],index=placeIndex.get(home);
  const side=(day+person.age)%2?1:-1;
  return {at:period===1?limit(index+side,0,destinations.length-1):index,public:false};
 }
 function itinerary(id,day){
  let schedules=plansByDay.get(day);
  if(!schedules){
   if(plansByDay.size>=8)plansByDay.delete(plansByDay.keys().next().value);
   schedules=new Map();plansByDay.set(day,schedules);
  }
  if(schedules.has(id))return schedules.get(id);
  const person=creators[id],dayStart=day*1440,lastNight=itineraryStop(id,Math.max(0,day-1),2).at;
  const slots=hours.map((hour,period)=>({...itineraryStop(id,day,period),hour}));
  const rain=E.weather(dayStart+785).kind==='rain',variation=(day+(person.age??27))%3;
  const tasks=person.home?[person.role,'Nghỉ ăn và ghé chợ','Về bản gặp hàng xóm']:
   [workByRole.find(([pattern])=>pattern.test(person.role))?.[1]??'Khảo sát điểm dừng',rain&&variation===0?'Trú mưa và sắp lại đồ':'Ăn trưa và trao đổi với khách qua đường',variation?'Chỉnh ảnh và đăng nhật ký chuyến đi':'Ăn tối cùng bạn đường'];
  const segments=[];
  const append=(from,until,data)=>{if(until>from)segments.push({start:dayStart+from,end:dayStart+until,...data});};
  const tripMinutes=(a,b)=>a===b?0:28+Math.abs(b-a)*31;
  const firstDeparture=slots[0].hour-tripMinutes(lastNight,slots[0].at);
  append(0,firstDeparture,{at:lastNight,kind:'rest',label:'Nghỉ qua đêm'});
  append(firstDeparture,slots[0].hour,{from:lastNight,to:slots[0].at,kind:'travel',label:'Đang đi đường'});
  for(const [period,slot] of slots.entries()){
   const next=slots[period+1],departure=next?next.hour-tripMinutes(slot.at,next.at):1260;
   const midpoint=slot.hour+Math.floor((departure-slot.hour)*.6);
   append(slot.hour,midpoint,{at:slot.at,public:slot.public,kind:period===0?'work':'social',label:tasks[period]});
   const downtime=period===0?'Đi dạo quanh điểm dừng':period===1?'Nghỉ chân sau bữa trưa':'Thu dọn đồ và nghỉ ngơi';
   append(midpoint,departure,{at:slot.at,public:slot.public,kind:period===0?'walk':'rest',label:downtime});
   if(next)append(departure,next.hour,{from:slot.at,to:next.at,kind:'travel',label:'Đang đi đường'});
   else append(departure,1440,{at:slot.at,kind:'rest',label:'Nghỉ qua đêm'});
  }
  schedules.set(id,segments);return segments;
 }
 function life(id,clock){
  const day=Math.max(0,Math.floor(clock/1440));
  return itinerary(id,day).find(segment=>clock<segment.end);
 }
 function travelAt(clock){
  return identities.flatMap(id=>{
   const stage=life(id,clock);
   return stage.kind==='travel'?[{id,...stage}]:[];
  });
 }
 const stagePlace=stage=>stage.kind==='travel'?D.places[stage.from].name+' → '+D.places[stage.to].name:D.places[stage.at].name;
 function publicNeighbors(id,at,start){
  if(at===undefined)return [];
  const swimmers=bathing({at,clock:start});
  if(swimmers.includes(id))return [];
  return identities.filter(other=>{const stage=life(other,start);return id!==other&&stage.public&&stage.at===at&&!swimmers.includes(other);});
 }
 function lifeProfile(id,clock){
  const day=Math.floor(clock/1440),today=itinerary(id,day),current=life(id,clock);
  const recent=[...(day>0?itinerary(id,day-1):[]),...today].filter(part=>part.end<=clock&&part.kind!=='rest').slice(-4).reverse();
  const next=[...today,...itinerary(id,day+1)].filter(part=>part.start>=current.end&&part.kind!=='rest').slice(0,3);
  const nearby=current.public?publicNeighbors(id,current.at,clock).slice(0,4):[];
  const meetings=[];
  for(let offset=Math.max(0,day-2);offset<=day;offset++)for(const hour of [495,785,1100]){
   const time=offset*1440+hour;
   if(time>clock)continue;
   const stage=life(id,time);
   if(!stage.public)continue;
   const group=publicNeighbors(id,stage.at,time);
   if(group.length)meetings.unshift({time,at:stage.at,with:group.slice(0,2),label:hour===495?'Trò chuyện và chụp ảnh':hour===785?'Ăn trưa cùng nhau':'Góp chuyện và dựng clip'});
  }
  return {current,recent,next,nearby,meetings:meetings.slice(0,3),place:stagePlace(current)};
 }
 function bathing(s){
  const id=D.places[s.at].id,minute=s.clock%1440,day=dayOf(s);
  if(!['river','dog'].includes(id)||!((minute>=360&&minute<510)||(minute>=1020&&minute<1140)))return [];
  if((day*7+(id==='river'?0:4)+(minute<510?0:2))%11>=3)return [];
  return identities.filter(key=>creators[key].home===id&&life(key,s.clock).at===placeIndex.get(id)).slice(0,1+(day%2));
 }
 function appearance(s,id){
  const now=life(id,s.clock);
  if(now.public)return venues[D.places[now.at].id].name;
  const today=Math.floor(s.clock/1440);
  for(let offset=0;offset<=cycleDays;offset++)for(const hour of hours){
   const clock=(today+offset)*1440+hour,stage=life(id,clock);
   if(clock>s.clock&&stage.public)return venues[D.places[stage.at].id].name+' · ngày '+dayOf({clock})+' lúc '+E.time(clock);
  }
  return '';
 }
 function venue(s){
  const id=D.places[s.at].id;
  if(!owns(venues,id))return null;
  const swimmers=bathing(s);
  const guests=identities.filter(key=>{const stage=life(key,s.clock);return stage.public&&stage.at===s.at&&!swimmers.includes(key);});
  return {...venues[id],id,guests};
 }
 const contact=(s,id)=>s.social.contacts[id]??{bond:0,done:{},affection:0,dates:0,relationship:null,open:false,planFamily:false,privateDay:0};
 const romanticKeys=new Set(['flirt','date','confess','discussOpen','proposal','wedding','planFamily','pauseFamily','private','later','breakup']);
 const otherRelationships=(s,id)=>Object.entries(s.social.contacts).filter(([key,person])=>key!==id&&person.relationship);
 function visible(s,id,key){
  if(!romanticKeys.has(key))return true;
  if(!adultPartner(id))return false;
  const person=contact(s,id),{relationship,open,planFamily}=person;
  if(key==='breakup')return Boolean(relationship);
  if(key==='confess')return !relationship;
  if(key==='discussOpen')return !open;
  if(key==='proposal')return relationship==='dating';
  if(key==='wedding')return relationship==='engaged';
  if(key==='planFamily')return relationship==='married'&&!planFamily&&!s.social.family;
  if(key==='pauseFamily')return planFamily;
  if(key==='private'||key==='later')return Boolean(relationship)&&person.privateDay===dayOf(s);
  return true;
 }
 function requirements(s,id,key){
  const act=actions[key],person=contact(s,id);
  const min=key==='discussOpen'?creators[id].openAt??act.min:act.min??0;
  if(person.bond<min)return 'Cần thân thiết '+min;
  if(!person.relationship&&['flirt','date','confess'].includes(key)){
   const others=otherRelationships(s,id),exclusive=others.find(([,partner])=>!partner.open);
   if(exclusive)return 'Cần trao đổi với '+creators[exclusive[0]].name+' về hẹn hò mở';
   if(others.length&&!person.open)return 'Hãy trao đổi với '+creators[id].name+' về hẹn hò mở';
  }
  if(key==='proposal'&&otherRelationships(s,id).some(([,partner])=>['engaged','married'].includes(partner.relationship)))return 'Anh đang đính hôn hoặc đã kết hôn';
  if(person.affection<(act.interest??0))return 'Cần cảm tình '+act.interest;
  if(person.dates<(act.dates??0))return 'Cần '+act.dates+' buổi hẹn';
  if(key==='wedding'&&person.done.proposal===dayOf(s))return 'Có thể tổ chức từ ngày mai';
  if(person.done[key]===dayOf(s)&&!['breakup','planFamily','pauseFamily'].includes(key))return 'Đã làm hôm nay';
  if(s.money<(act.cost??0))return 'Cần '+act.cost+'k';
  return '';
 }
 function banter(s,spot){
  const [a,b]=spot.guests.map(id=>creators[id].name);
  if(!a)return 'Sân đang vắng. Khách sẽ ghé theo lịch trong ngày.';
  if(!b)return a+' đang đi dạo quanh '+spot.name.toLowerCase()+'.';
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
 function availableOnRoad(s,id,key){
  return owns(creators,id)&&['greet','chat'].includes(key)&&!s.social.detained&&life(id,s.clock).kind==='travel'&&!requirements(s,id,key);
 }
 function talkOnRoad(s,id,key){
  if(!availableOnRoad(s,id,key))return '';
  const stage=life(id,s.clock),person=contact(s,id),act=actions[key];
  s.social.contacts[id]=person;
  person.done[key]=dayOf(s);person.bond=limit(person.bond+act.gain,0,100);
  s.clock+=act.minutes;
  const name=creators[id].name,destination=D.places[stage.to].name;
  return key==='greet'?name+' nói “Chào anh! Tôi đang trên đường tới '+destination+'.”':name+' kể về công việc và dự định ở '+destination+'.';
 }
 function interact(s,id,key,random=Math.random){
  if(!owns(creators,id)||!owns(actions,key)||!available(s,id,key))return '';
  const act=actions[key],person=contact(s,id),{name,romance}=creators[id];
  s.social.contacts[id]=person;
  const day=dayOf(s);
  person.done[key]=day;person.bond=limit(person.bond+(act.gain??0),0,100);
  s.money-=act.cost??0;
  s.food=limit(s.food+(act.food??0),0,100);
  s.water=limit(s.water+(act.water??0),0,100);
  s.energy=limit(s.energy+(act.energy??0),0,100);
  s.clock+=act.minutes;
  if(romanticKeys.has(key)){
   if(key==='breakup'){
    const married=person.relationship==='married';
    person.relationship=null;person.planFamily=false;person.privateDay=0;person.affection=0;person.dates=0;person.open=false;
    return 'Anh và '+name+' đã nói chuyện và quyết định '+(married?'ly hôn.':'dừng hẹn hò.');
   }
   if(key==='confess'){
    if(person.dates<2||person.affection<50||person.bond<50)return name+' nói “Em có cảm tình, nhưng muốn có thêm thời gian tìm hiểu nhau.”';
    person.relationship='dating';
    return name+' nói “'+romance.yes+'” Cả hai đã thành một đôi.';
   }
   if(key==='flirt'||key==='date'){
    person.affection=limit(person.affection+act.affection,0,100);
    const message=name+' nói “'+romance[key]+'”';
    if(key==='flirt')return message;
    person.dates=Math.min(999,person.dates+1);
    if(person.relationship&&person.affection>=60&&random()<.38)person.privateDay=dayOf(s);
    return message;
   }
   if(key==='proposal'){
    person.relationship='engaged';return name+' nói “'+romance.proposal+'” Cả hai đã đính hôn.';
   }
   if(key==='wedding'){
    person.relationship='married';return 'Anh và '+name+' đã làm lễ cưới nhỏ cùng bạn bè ở '+venue(s).name+'.';
   }
   if(key==='discussOpen'){
    person.open=true;return name+' nói “Em đồng ý hẹn hò mở, miễn là mình nói rõ với những người liên quan.”';
   }
   if(key==='planFamily'){
    person.planFamily=true;return name+' nói “Em cũng muốn có con. Mình cùng chuẩn bị nhé.”';
   }
   if(key==='pauseFamily'){
    person.planFamily=false;return 'Hai người thống nhất tạm hoãn chuyện có con.';
   }
   person.privateDay=0;
   if(key==='later')return name+' nói “Ừ, để lúc cả hai thấy thoải mái nhé.”';
   if(person.planFamily&&!s.social.family&&random()<.28){
    s.social.family={parent:id,dueAt:s.clock+266*1440,lastCare:0};person.planFamily=false;
    return 'Hai người đã dành thời gian riêng bên nhau. Sau đó, '+name+' báo tin hai người sắp có em bé.';
   }
   return 'Hai người đã dành thời gian riêng bên nhau.';
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
 function familyStatus(s){
  const baby=s.social.family;
  if(!baby)return null;
  return {name:creators[baby.parent].name,days:Math.max(0,Math.ceil((baby.dueAt-s.clock)/1440)),cared:baby.lastCare===dayOf(s)};
 }
 function familyAction(s,key){
  const status=familyStatus(s);
  if(!status||s.social.detained||!D.places[s.at].services?.includes('rest'))return '';
  if(key==='wait'&&status.days){
   s.clock=s.social.family.dueAt;
   return 'Đã đến ngày dự sinh. Em bé của anh và '+status.name+' đã chào đời!';
  }
  if(key==='care'&&!status.days&&!status.cared){
   s.social.family.lastCare=dayOf(s);s.clock+=25;
   return 'Anh đã cho bé ăn, thay tã và ru bé ngủ.';
  }
  return '';
 }
 function conflict(s,spot=venue(s)){
  if(!spot?.guests.length||s.social.detained||s.social.incidents[spot.id]?.day===dayOf(s))return false;
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
 return {creators,actions,restore,venue,appearance,bathing,life,lifeProfile,stagePlace,travelAt,contact,banter,visible,requirements,available,interact,availableOnRoad,talkOnRoad,familyStatus,familyAction,conflict,resolve,settle};
})();
