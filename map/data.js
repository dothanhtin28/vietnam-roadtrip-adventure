'use strict';
globalThis.TripData = (() => {
const commons='https://commons.wikimedia.org/wiki/File:';
const lic='https://creativecommons.org/licenses/by-sa/4.0/';
const places=[
 {id:'start',x:192,y:870,icon:'⌂',name:'Hà Giang',kind:'Trạm xuất phát',description:'Đường lên cao nguyên bắt đầu ở đây. Trạm có nước, cơm và chỗ nghỉ.',services:['shop','garage','rest','help']},
 {id:'river',x:333,y:736,icon:'🎣',name:'Bến sông Lô',kind:'Câu cá',description:'Thả câu, đợi phao chìm rồi giật đúng lúc. Mang cá tới chợ để bán.',services:['fish']},
 {id:'dog',x:456,y:621,icon:'🐕',name:'Lối qua bản',kind:'Gặp bạn đường',description:'Một chú chó đứng xa bên bờ ruộng. Đừng vội lại gần, để nó quen với anh trước.',pet:'dog'},
 {id:'quan',x:532,y:505,icon:'📷',name:'Núi Đôi Quản Bạ',kind:'Check-in · thiên nhiên',description:'Hai đỉnh núi tròn nổi lên giữa thung lũng. Ghé tới để lưu ảnh vào hành trình.',photo:{url:'https://upload.wikimedia.org/wikipedia/commons/3/36/Ha_Giang_Province.jpg',file:commons+'Ha_Giang_Province.jpg',author:'Thietkeweb123',license:'CC BY-SA 4.0',licenseUrl:lic}},
 {id:'yen',x:790,y:385,icon:'♨',name:'Yên Minh',kind:'Trạm tiếp tế · việc làm',description:'Quán ven đường cần người phụ dọn bàn. Có thể kiếm tiền, mua đồ và nghỉ qua đêm.',services:['job','shop','garage','rest','help']},
 {id:'cat',x:934,y:264,icon:'🐈',name:'Ngõ nhỏ cao nguyên',kind:'Gặp bạn đường',description:'Một con mèo đang nằm trên tường đá. Ngồi yên một lúc thay vì đuổi theo nó.',pet:'cat'},
 {id:'dong',x:1065,y:178,icon:'📷',name:'Chợ Đồng Văn',kind:'Check-in · chợ',description:'Dừng ăn một bữa, bán cá, phụ quán hoặc ngắm một góc chợ vùng cao.',services:['shop','sell','job','garage','rest','help'],photo:{url:'https://upload.wikimedia.org/wikipedia/commons/7/79/A_corner_in_Dong_Van_Market.jpg',file:commons+'A_corner_in_Dong_Van_Market.jpg',author:'Zennysmile',license:'CC BY-SA 4.0',licenseUrl:lic}},
 {id:'ma',x:1199,y:339,icon:'📷',name:'Mã Pì Lèng',kind:'Check-in · đèo núi',description:'Điểm dừng cuối chuyến. Thu đủ ba ảnh để hoàn thành bộ ảnh Hà Giang.',photo:{url:'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/83/M%C3%A3_P%C3%AD_L%C3%A8ng_by_minhphuc_99kdd.jpg/960px-M%C3%A3_P%C3%AD_L%C3%A8ng_by_minhphuc_99kdd.jpg',file:commons+'M%C3%A3_P%C3%AD_L%C3%A8ng_by_minhphuc_99kdd.jpg',author:'minhphuc_99kdd',license:'CC0 1.0',licenseUrl:'https://creativecommons.org/publicdomain/zero/1.0/'}}
];
const roads=[
 {from:0,to:1,bends:[[225,848],[229,799],[290,800],[297,758]],slope:1},
 {from:1,to:2,bends:[[382,718],[375,686],[427,677],[430,641]],slope:1},
 {from:2,to:3,bends:[[491,621],[532,595],[493,567],[555,549]],slope:1.18,hazard:'Đá rơi trên đường',obstacle:'rock'},
 {from:3,to:4,bends:[[584,488],[594,439],[660,440],[691,399],[734,414]],slope:1.04},
 {from:4,to:5,bends:[[830,368],[822,326],[870,318],[883,277]],slope:1.17,hazard:'Rãnh bùn sau mưa',obstacle:'mud'},
 {from:5,to:6,bends:[[960,230],[1006,249],[1017,203]],slope:1.05},
 {from:6,to:7,bends:[[1110,207],[1092,243],[1160,266],[1137,298],[1180,303]],slope:1.2,hazard:'Cành cây chắn đèo',obstacle:'branch'}
];
const modes={
 walk:{name:'Đi bộ',icon:'🚶',price:0,energy:47,kmh:6.2,fuel:0,impact:10},
 bike:{name:'Xe đạp',icon:'🚲',price:40,energy:34,kmh:17,fuel:0,impact:20},
 moto:{name:'Xe máy',icon:'🛵',price:95,energy:76,kmh:37,fuel:1,impact:28},
 car:{name:'Ô tô',icon:'🚙',price:160,energy:108,kmh:46,fuel:2,impact:15}
};
const legKilometers=[7,15,22,46,27,18,17];
// Latitude and longitude anchors for the game's compressed route. Fictional
// stops sit between the actual landmarks rather than representing addresses.
const geoAnchors=[
 [22.8233,104.9849], [22.8612,104.9855], [22.9584,104.9928],
 [23.0390,105.0042], [23.1176,105.1433], [23.2302,105.2744],
 [23.2763,105.3612], [23.1955,105.4127]
];
const companions={
 linh:{name:'Linh',bio:'Một người mê chụp ảnh, đang tìm đường lên cao nguyên.',chance:.68,outfit:'fern'},
 minh:{name:'Minh',bio:'Một phượt thủ đang nghỉ chân và cân nhắc chặng tiếp theo.',chance:.52,outfit:'indigo'},
 thao:{name:'Thảo',bio:'Một bạn đi bộ đường dài đang ngắm cảnh bên đường.',chance:.60,outfit:'plum'},
 mai:{name:'Mai',bio:'Nữ phượt thủ thích săn mây và biết vài lối ngắm ruộng bậc thang.',chance:.57,outfit:'azure',weight:.32,portrait:'assets/companion-mai.webp'},
 vy:{name:'Vy',bio:'Cô gái đi bộ một mình, mang theo cuốn sổ ký họa phong cảnh.',chance:.64,outfit:'gold',weight:.32,portrait:'assets/companion-vy.webp'}
};
const petPrices={dog:38,cat:30};
return {places,roads,modes,geoAnchors,legKilometers,companions,petPrices};
})();
