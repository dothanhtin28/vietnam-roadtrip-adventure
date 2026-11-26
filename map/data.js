'use strict';
globalThis.TripData = (() => {
const commons='https://commons.wikimedia.org/wiki/File:';
const lic='https://creativecommons.org/licenses/by-sa/4.0/';
const places=[
 {id:'start',x:192,y:870,icon:'⌂',name:'Hà Giang',kind:'Trạm xuất phát',description:'Đường lên cao nguyên bắt đầu ở đây. Trạm có nước, cơm và chỗ nghỉ.',services:['shop','garage','rest','help']},
 {id:'river',x:333,y:736,icon:'🎣',name:'Bến sông Lô',kind:'Câu cá',description:'Thả câu, đợi phao chìm rồi giật đúng lúc. Mang cá tới chợ để bán.',services:['fish']},
 {id:'dog',x:456,y:621,icon:'🐕',name:'Lối qua bản',kind:'Gặp bạn đường',description:'Một chú chó đứng xa bên bờ ruộng. Bên đường có nhà bác Mẩy, nơi khách qua bản có thể ghé hỏi mua cơm nước.',pet:'dog',services:['shop'],host:{name:'bác Mẩy',greeting:'Đi đường xa à? Nhà bác có cơm, nước và ít đồ tiếp sức.'}},
 {id:'quan',x:532,y:505,icon:'📷',name:'Núi Đôi Quản Bạ',kind:'Check-in · thiên nhiên',description:'Hai đỉnh núi tròn nổi lên giữa thung lũng. Ghé tới để lưu ảnh vào hành trình.',photo:{url:'https://upload.wikimedia.org/wikipedia/commons/3/36/Ha_Giang_Province.jpg',file:commons+'Ha_Giang_Province.jpg',author:'Thietkeweb123',license:'CC BY-SA 4.0',licenseUrl:lic}},
 {id:'yen',x:790,y:385,icon:'♨',name:'Yên Minh',kind:'Trạm tiếp tế · việc làm',description:'Quán ven đường cần người phụ dọn bàn. Có thể kiếm tiền, mua đồ và nghỉ qua đêm.',services:['job','shop','garage','rest','help']},
 {id:'cat',x:934,y:264,icon:'🐈',name:'Ngõ nhỏ cao nguyên',kind:'Gặp bạn đường',description:'Một con mèo nằm trên tường đá cạnh nhà cô Lan. Cô có bán cơm nước cho người đi đường.',pet:'cat',services:['shop'],host:{name:'cô Lan',greeting:'Mời ghé nghỉ chân. Cô có cơm nóng, nước và đồ tiếp sức cho chặng đèo.'}},
 {id:'dong',x:1065,y:178,icon:'📷',name:'Chợ Đồng Văn',kind:'Check-in · chợ',description:'Dừng ăn một bữa, bán cá, phụ quán hoặc ngắm một góc chợ vùng cao.',services:['shop','sell','job','garage','rest','help'],photo:{url:'https://upload.wikimedia.org/wikipedia/commons/7/79/A_corner_in_Dong_Van_Market.jpg',file:commons+'A_corner_in_Dong_Van_Market.jpg',author:'Zennysmile',license:'CC BY-SA 4.0',licenseUrl:lic}},
 {id:'ma',x:1199,y:339,icon:'📷',name:'Đèo Mã Pí Lèng',kind:'Check-in · đường bám vách đá',description:'Từ đoạn đèo nhìn xuống hẻm Tu Sản. Có thể dừng check-in rồi chuyển sang đi bộ để lên Sống lưng Khủng long.',photo:{url:'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/83/M%C3%A3_P%C3%AD_L%C3%A8ng_by_minhphuc_99kdd.jpg/960px-M%C3%A3_P%C3%AD_L%C3%A8ng_by_minhphuc_99kdd.jpg',file:commons+'M%C3%A3_P%C3%AD_L%C3%A8ng_by_minhphuc_99kdd.jpg',author:'minhphuc_99kdd',license:'CC0 1.0',licenseUrl:'https://creativecommons.org/publicdomain/zero/1.0/'}},
 {id:'ridge',icon:'▲',name:'Sống lưng Khủng long',kind:'Đường mòn · điểm ngắm hẻm Tu Sản',description:'Lối đá hẹp trên sống núi, chỉ đi bộ. Từ đây có thể nhìn xuống dòng Nho Quế rồi men lối xuống điểm ngắm sông.'},
 {id:'nho-que',icon:'≈',name:'Sông Nho Quế',kind:'Điểm ngắm sông · hẻm Tu Sản',description:'Dừng ở điểm ngắm dòng nước xanh dưới lớp vách đá vôi. Lối trở về đi qua Sống lưng Khủng long.'}
];
const roads=[
 {from:0,to:1,bends:[[225,848],[229,799],[290,800],[297,758]],slope:1},
 {from:1,to:2,bends:[[382,718],[375,686],[427,677],[430,641]],slope:1},
 {from:2,to:3,bends:[[491,621],[532,595],[493,567],[555,549]],slope:1.18,hazard:'Đá rơi trên đường',obstacle:'rock'},
 {from:3,to:4,bends:[[584,488],[594,439],[660,440],[691,399],[734,414]],slope:1.04},
 {from:4,to:5,bends:[[830,368],[822,326],[870,318],[883,277]],slope:1.17,hazard:'Rãnh bùn sau mưa',obstacle:'mud'},
 {from:5,to:6,bends:[[960,230],[1006,249],[1017,203]],slope:1.05},
 {from:6,to:7,slope:1.15,hazard:'Cành cây chắn đèo',obstacle:'branch',region:'pass'},
 {from:7,to:8,slope:1.1,footOnly:true,region:'ridge'},
 {from:8,to:9,slope:1.1,footOnly:true,region:'river'}
];
const modes={
 walk:{name:'Đi bộ',icon:'🚶',price:0,energy:47,kmh:6.2,fuel:0,impact:10},
 bike:{name:'Xe đạp',icon:'🚲',price:40,energy:34,kmh:17,fuel:0,impact:20},
 moto:{name:'Xe máy',icon:'🛵',price:95,energy:76,kmh:37,fuel:1,impact:28},
 car:{name:'Ô tô',icon:'🚙',price:160,energy:108,kmh:46,fuel:2,impact:15},
 cart:{name:'Xe bò thuê',icon:'🐂',energy:150,kmh:8.6,fuel:0,impact:12}
};
const legKilometers=[7,15,22,46,27,18,17,1.4,2.6];
const cartFare=18,energyDrinkPrice=15;
// Latitude and longitude anchors for the game's compressed route. Fictional
// stops sit between the actual landmarks rather than representing addresses.
const geoAnchors=[
 [22.8233,104.9849], [22.8612,104.9855], [22.9584,104.9928],
 [23.0390,105.0042], [23.1176,105.1433], [23.2302,105.2744],
 [23.2763,105.3612], [23.2418,105.4070], [23.2494,105.4118], [23.2295,105.4284]
];
// Interpreted landmark waypoints and river corridor. These are approximate
// geographic references for gameplay, with no surveyed trail or elevation data.
const landmarkTraces=[
 [geoAnchors[6],[23.2695,105.3662],[23.2675,105.3758],[23.2620,105.3831],[23.2566,105.3881],
 [23.2530,105.3980],[23.2475,105.3984],[23.2501,105.4024],[23.2461,105.4042],geoAnchors[7]],
 [geoAnchors[7],[23.2437,105.4079],[23.2458,105.4088],[23.2475,105.4102],geoAnchors[8]],
 [geoAnchors[8],[23.2482,105.4141],[23.2439,105.4160],[23.2401,105.4177],[23.2363,105.4230],
 [23.2325,105.4201],[23.2285,105.4244],geoAnchors[9]]
];
const nhoQue=[[23.289,105.424],[23.268,105.420],[23.259,105.431],[23.247,105.428],
 [23.241,105.425],[23.233,105.435],[23.219,105.444],[23.200,105.454]];
function toWorld([lat,lon]){
 return [places[6].x+(lon-geoAnchors[6][1])*3850,places[6].y-(lat-geoAnchors[6][0])*4300];
}
function toGeo(x,z){
 return [geoAnchors[6][0]-(z-places[6].y)/4300,geoAnchors[6][1]+(x-places[6].x)/3850];
}
for(const [i,trace] of landmarkTraces.entries()){
 const stop=places[7+i];
 [stop.x,stop.y]=toWorld(trace.at(-1));
 roads[6+i].bends=trace.slice(1,-1).map(toWorld);
}
const riverPath=nhoQue.map(toWorld);
const companions={
 linh:{name:'Linh',bio:'Một người mê chụp ảnh, đang tìm đường lên cao nguyên.',chance:.68,outfit:'fern'},
 minh:{name:'Minh',bio:'Một phượt thủ đang nghỉ chân và cân nhắc chặng tiếp theo.',chance:.52,outfit:'indigo'},
 thao:{name:'Thảo',bio:'Một bạn đi bộ đường dài đang ngắm cảnh bên đường.',chance:.60,outfit:'plum'},
 mai:{name:'Mai',bio:'Nữ phượt thủ thích săn mây và biết vài lối ngắm ruộng bậc thang.',chance:.57,outfit:'azure',weight:.32,portrait:'assets/companion-mai.webp'},
 vy:{name:'Vy',bio:'Cô gái đi bộ một mình, mang theo cuốn sổ ký họa phong cảnh.',chance:.64,outfit:'gold',weight:.32,portrait:'assets/companion-vy.webp'}
};
const petPrices={dog:38,cat:30};
const forage={
 mushrooms:{name:'Nấm ăn được',icon:'🍄',food:14,water:0,price:7},
 corn:{name:'Ngô',icon:'🌽',food:22,water:0,price:9},
 fruit:{name:'Trái cây rừng',icon:'🍐',food:15,water:10,price:8}
};
const clothing={
 trail:{name:'Cam đường đèo',accent:'#cf721e',colors:{jacket:[218,113,29],light:[241,154,52],cuff:[166,72,25],scarf:[63,56,55],pants:[70,65,63],pantsEdge:[85,78,72],shoe:[136,89,49]}},
 moss:{name:'Xanh rêu',accent:'#596442',colors:{jacket:[93,106,67],light:[125,135,88],pants:[106,86,66],pantsEdge:[91,78,64]}},
 indigo:{name:'Chàm cao nguyên',accent:'#465872',colors:{jacket:[69,88,115],light:[96,115,138],cuff:[48,59,79],scarf:[61,78,90],pants:[90,92,83],pantsEdge:[72,77,74]}},
 ochre:{name:'Áo mưa vàng đất',price:28,accent:'#b18847',colors:{jacket:[169,126,59],light:[194,156,86],cuff:[112,83,48],scarf:[108,96,64],pants:[67,78,78],pantsEdge:[58,68,67]}},
 brick:{name:'Áo khoác đỏ gạch',price:36,accent:'#9b5244',colors:{jacket:[141,71,59],light:[174,103,86],cuff:[96,57,50],scarf:[113,83,67],pants:[83,90,86],pantsEdge:[70,78,71]}}
};
const clothingShops=['start','yen','dong'];
return {places,roads,modes,geoAnchors,legKilometers,nhoQue,riverPath,toGeo,companions,petPrices,cartFare,energyDrinkPrice,forage,clothing,clothingShops};
})();
