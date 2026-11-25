(() => {
'use strict';
const alpine = ['#f4c886','#eeb389','#74937d','#48705d','#284f43','#669d83'];
const fog = ['#d5dbce','#a9bfb1','#98ad9d','#627f72','#36564d','#7fa59a'];
const gold = ['#fbda9c','#f2ac71','#928e73','#59674f','#3b5744','#73ab92'];
const stops = [
 {name:'Hà Giang',x:40,y:173,tag:'Điểm xuất phát', palette:alpine,
 event:'Chiếc xe cũ và tấm bản đồ',story:'Chìa khóa nằm cạnh ly trà. Chiếc xe đã sẵn sàng, còn danh sách nơi phải đến thì để trống. Anh quyết định bắt đầu thế nào?',
 go:'Lên đường tới Quản Bạ',cost:[55,2,1], side:{label:'Uống trà với chủ quán',hint:'+1 sức · +1 kỷ niệm · 15 phút',time:15,energy:1,entry:'Ly trà đầu chuyến',msg:'Chủ quán bảo: lên núi rồi đừng chỉ nhìn đồng hồ.'}},
 {name:'Quản Bạ',x:89,y:112,tag:'Cổng Trời', palette:fog,
 event:'Mây phủ ngang đèo',story:'Mây tràn qua mặt đường. Từ chỗ dừng, anh chỉ thấy bóng đôi núi thấp thoáng dưới thung lũng.',
 go:'Đợi mây tan rồi đi Yên Minh',cost:[80,2,1], alt:{label:'Đi đường vòng thoáng hơn',cost:[95,3,0],msg:'Đường vòng tốn thêm xăng, đổi lại có chỗ nghỉ chân.'}, side:{label:'Chụp đôi núi trong mây',hint:'+1 kỷ niệm · 10 phút',time:10,entry:'Đôi núi chìm trong mây',msg:'Hai đỉnh núi hiện ra trong vài giây, đúng lúc anh giơ máy.'}},
 {name:'Yên Minh',x:158,y:91,tag:'Bên rừng thông', palette:alpine,
 event:'Một tiếng lách cách',story:'Tiếng lách cách phát ra từ chiếc giá chở đồ. Con đường phía trước còn dài, nhưng bên kia đường có một tiệm sửa xe.',
 go:'Siết lại giá đồ rồi đi Đồng Văn',cost:[85,2,1], alt:{label:'Nhờ tiệm kiểm tra và đổ xăng',cost:[105,0,0],fuel:5,msg:'Xe êm hơn hẳn. Bình xăng được châm đầy trước khi đi.'}, side:{label:'Nghỉ dưới tán thông',hint:'+2 sức · +1 kỷ niệm · 20 phút',time:20,energy:2,entry:'Một khoảng rừng yên',msg:'Anh cất điện thoại. Trong vài phút chỉ còn tiếng gió qua tán thông.'}},
 {name:'Đồng Văn',x:230,y:44,tag:'Phố cổ', palette:gold,
 event:'Mùi đồ ăn trong ngõ',story:'Những mái nhà bắt đầu ngả vàng. Trong một ngõ nhỏ, ai đó vừa bắc nồi xuống bếp và gọi anh vào ăn cùng.',
 go:'Đi tiếp tới Mã Pì Lèng',cost:[45,2,1], side:{label:'Ăn tối và nghe kể chuyện',hint:'+2 sức · +2 xăng · +1 kỷ niệm · 35 phút',time:35,energy:2,fuel:2,entry:'Bữa cơm trong ngõ nhỏ',msg:'Anh đổi một câu chuyện nhà lấy một bữa cơm nóng. Trước khi đi, anh ghé đổ thêm xăng.'}},
 {name:'Mã Pì Lèng',x:267,y:107,tag:'Trên dòng Nho Quế', palette:fog,
 event:'Sông ở dưới, gió ở trên',story:'Dòng Nho Quế lộ ra giữa hai vách núi. Một cơn mưa vừa đi qua, mặt đường vẫn còn ướt.',
 go:'Chờ đường ráo rồi đi Mèo Vạc',cost:[65,1,1], alt:{label:'Nghỉ ở điểm dừng rồi đi',cost:[85,1,0],msg:'Anh lên đường lúc trời dịu hơn và tới nơi mà vẫn còn sức.'}, side:{label:'Ngắm sông từ điểm dừng',hint:'+1 kỷ niệm · 15 phút',time:15,entry:'Vệt xanh dưới vách đá',msg:'Anh không chụp gì cả. Màu xanh ấy đã ở lại trong sổ tay.'}},
 {name:'Mèo Vạc',x:276,y:169,tag:'Điểm đến của chuyến 01',palette:gold,event:'Tới nơi rồi.',story:''}
];
const fresh=()=>({i:0,time:450,fuel:9,energy:5,seen:[],entries:[],message:''});
const key='duong-ve-phia-gio-v1';
function restore(){
 try {const s=JSON.parse(localStorage.getItem(key));if(s && Number.isInteger(s.i) && stops[s.i] && ['time','fuel','energy'].every(k=>Number.isFinite(s[k])) && Array.isArray(s.seen) && Array.isArray(s.entries) && s.entries.every(x=>typeof x==='string'))return s;}catch{}
 return fresh();
}
let state=restore();
const $=s=>document.querySelector(s);
const put=(s,t)=>$(s).textContent=t;
const clock=mins=>String(Math.floor(mins/60)%24).padStart(2,'0')+':'+String(mins%60).padStart(2,'0');
function scene(stop,index){
 const [sky,light,back,middle,front,water]=stop.palette;
 const trees=Array.from({length:22},(_,i)=>{const x=24+i*36,y=252+Math.round(Math.sin(i*.83)*23),h=19+i%4*7;return `<path d="M${x-h*.32} ${y}l${h*.32} -${h} ${h*.32} ${h}zM${x} ${y}v8" fill="#234536" stroke="#234536" stroke-width="2"/>`;}).join('');
 const town=Array.from({length:9},(_,i)=>{const x=45+i*74,y=247+Math.round(Math.sin(i*.85)*28);return `<g transform="translate(${x} ${y})"><path fill="#d7c6a1" d="M0 0h45v24H0z"/><path fill="${i%2?'#8d5444':'#aa664a'}" d="M-6 1l15-17h28L52 1z"/><path fill="#537265" d="M17 8h10v16H17z"/></g>`;}).join('');
 const local=[
  `<path d="M0 264q133-95 259 7M29 279q107-79 205-1M56 292q84-66 158-8" fill="none" stroke="#91a66c" stroke-width="9"/>`,
  `<path d="M110 258q77-126 147 0m13 9q79-127 166 0" fill="#507762"/><path fill="none" stroke="#e7e3ce" opacity=".6" stroke-width="12" d="M75 209q110 17 248 3t208 0"/>`,
  trees,town,
  `<path fill="none" stroke="${water}" stroke-width="20" d="M374 299q88 4 49 26t69 29q82 7 58 46"/><path d="M532 247l74-46 76-16 118 47v168H624l-30-76z" fill="#274c40" opacity=".85"/>`,
  town
 ][index];
 return `<defs><linearGradient id="sky" x2="0" y2="1" gradientUnits="objectBoundingBox"><stop stop-color="${sky}"/><stop offset="1" stop-color="${light}"/></linearGradient><pattern id="grain" width="11" height="13" patternUnits="userSpaceOnUse"><path d="M1 3h1m5 4h2m-6 4h1" stroke="#fff" opacity=".135"/></pattern></defs>
 <path fill="url(#sky)" d="M0 0h800v400H0z"/><circle cx="${620-index*43}" cy="88" r="39" fill="#fcdf9a" opacity=".8"/>
 <path fill="${back}" d="M0 185L75 117l64 49 85-69 64 66 63-37 52 53 82-74 70 33 54-45 104 101 87-48v254H0z"/>
 <path fill="${middle}" d="M0 236l72-88 37 37 57-19 42 68 55-28 75-60 61 72 52 4 65 63 73-92 62-25 41-43 108 78v197H0z"/>
 <path fill="${front}" d="M0 230l96 10 103 52 88-16 35-15 52 24 32 23 63-27 72-3 112-61 147 13v170H0z"/>
 ${local}
 ${index===4?'':`<path fill="none" stroke="#d4b38b" stroke-width="8" d="M173 401q100-68 184-69t98-18q17-13-43-27"/>`}
 <path fill="url(#grain)" d="M0 0h800v400H0z"/>`;
}
function map(){
 const route=stops.map(s=>s.x+','+s.y);
 return `<path d="M0 155q60-112 124-95t186-28M0 171q80-113 147-102t163-19M20 194q68-101 145-115t145-15" fill="none" stroke="#daddbd" stroke-width="11"/><polyline points="${route.join(' ')}" fill="none" stroke="#8b9277" stroke-dasharray="4 4" stroke-width="2"/><polyline points="${route.slice(0,state.i+1).join(' ')}" fill="none" stroke="#28543e" stroke-width="3"/>${stops.map((s,i)=>`<circle cx="${s.x}" cy="${s.y}" r="${i===state.i?7:5}" fill="${i===state.i?'#b74420':i<state.i?'#28543e':'#f4f1de'}" stroke="#3c5b47"/><text x="${s.x}" y="${s.y+(i===3?-12:18)}" text-anchor="middle" fill="#243829" font-size="11" font-weight="${i===state.i?800:550}">${s.name}</text>`).join('')}`;
}
function save(){try{localStorage.setItem(key,JSON.stringify(state));}catch{}}
function action(label,hint,fn,disabled=false){
 const b=document.createElement('button'), small=document.createElement('small');
 b.type='button';b.className='choice';b.textContent=label;small.textContent=hint;b.append(small);b.disabled=disabled;
 b.addEventListener('click',()=>{fn();save();render();$('#event').focus({preventScroll:true});});$('#choices').append(b);
}
const able=(cost)=>state.fuel>=cost[1]&&state.energy>=cost[2];
function travel(label,cost,extra){
 action(label,`${cost[0]} phút · −${cost[1]} xăng · −${cost[2]} sức`,()=>{
  state.time+=cost[0];state.fuel=Math.min(9,state.fuel-cost[1]+(extra?.fuel||0));state.energy-=cost[2];state.i++;state.message=extra?.msg||'Anh đã tới '+stops[state.i].name+'.';
 },!able(cost));
}
function render(){
 const stop=stops[state.i];
 put('#title',stop.name);put('#km',`CHẶNG ${String(state.i+1).padStart(2,'0')} / 06 · ${stop.tag}`);
 put('#time','◷ '+clock(state.time));put('#fuel','Xăng '+state.fuel+'/9');put('#energy','Sức '+state.energy+'/5');
 put('#event',stop.event);put('#story',stop.story);put('#result',state.message);$('#result').hidden=!state.message;
 $('#scenery').innerHTML=scene(stop,state.i);$('#map').innerHTML=map();$('#map').setAttribute('aria-label','Sơ đồ hành trình. Đang ở '+stop.name);
 put('#journal-title','Sổ tay · '+state.entries.length+' kỷ niệm');
 $('#entries').replaceChildren();
 for(const entry of state.entries){const li=document.createElement('li');li.textContent=entry;$('#entries').append(li);}
 $('#choices').replaceChildren();$('#reset').hidden=state.i===stops.length-1;
 if(!stop.go){
  put('#story',state.entries.length>=3?'Anh tới Mèo Vạc lúc '+clock(state.time)+'. Trong sổ tay có '+state.entries.length+' kỷ niệm. Có lẽ chuyến đi đáng nhớ nhất không phải chuyến đi nhanh nhất.':'Anh tới Mèo Vạc lúc '+clock(state.time)+'. Cung đường đã hoàn thành. Những điểm dừng bỏ lỡ vẫn còn đó cho một chuyến khác.');
  action('Bắt đầu chuyến mới','Thử một nhịp đi khác',()=>state=fresh());$('#journal').open=true;return;
 }
 travel(stop.go,stop.cost);
 if(stop.alt)travel(stop.alt.label,stop.alt.cost,stop.alt);
 if(stop.side){
  const s=stop.side, done=state.seen.includes(state.i);
  action(s.label,done?'Đã ghi vào sổ tay':s.hint,()=>{state.time+=s.time;state.energy=Math.min(5,state.energy+(s.energy||0));state.fuel=Math.min(9,state.fuel+(s.fuel||0));state.seen.push(state.i);state.entries.push(s.entry);state.message=s.msg;$('#journal').open=true;},done);
 }
 if(!able(stop.cost)&&(!stop.alt||!able(stop.alt.cost))){
  action('Tìm chỗ nghỉ và tiếp tế','+4 xăng · +3 sức · 45 phút',()=>{state.time+=45;state.fuel=Math.min(9,state.fuel+4);state.energy=Math.min(5,state.energy+3);state.message='Anh tìm được một điểm dừng để nghỉ và tiếp tế.';});
 }
}
$('#reset').addEventListener('click',()=>{if(confirm('Bắt đầu lại và xóa tiến độ chuyến hiện tại?')){state=fresh();save();render();$('#event').focus();}});
render();
})();
