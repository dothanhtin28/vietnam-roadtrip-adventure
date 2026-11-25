# Đường Về Phía Gió · Vietnam Roadtrip Adventure

Mở `index.html` sau khi pull. Bản mặc định là chuyến du mục trên **bản đồ nhìn từ trên xuống**. Game chạy bằng HTML/CSS/JS, không cần cài thư viện. Bản đồ chơi được ngoại tuyến; ảnh thật trên Wikimedia Commons cần mạng.

## Điều khiển khi đi 3D
- Game mở ở góc nhìn thứ ba. Giữ **W / ↑** để tiến, **S / ↓** để lùi, **A / ←** hoặc **D / →** để đánh lái. Điện thoại dùng bốn nút giữ dưới khung cảnh. Nhả phím để dừng; khi tới điểm dừng, nhả rồi nhấn lại để sang chặng kế.
- Kéo ngang hoặc bấm ↶ / ↷ để xoay camera. Bản đồ và bản đồ nhỏ chỉ theo dõi vị trí. Bấm ghim chỉ để xem thông tin, không tự chạy. Khi mở bản đồ, nhân vật đứng lại.
- Tuyến 3D giới hạn trong đường và lề, chưa phải thế giới mở. Né đá/gỗ bằng A/D, hoặc đi thẳng và chấp nhận va chạm. Lên dốc, bị thương, đói, khát và mệt đều ảnh hưởng tốc độ.
- Nhân vật dùng mesh 3D bo và khớp thủ tục trong `map/hiker3d.js`. Balo, dây đeo, bình nước, giày, tóc và gương mặt là hình học 3D, không dùng sprite; camera gần hơn và có độ trễ khi bám. Đi bộ, chạy nhẹ, xoay người, đứng thở, câu cá, ăn, uống, ngồi nghỉ và chụp ảnh có pose/hoạt ảnh riêng. Đây là renderer Canvas hiện tại, chưa dùng GLB hoặc skinning chuẩn glTF.

## Hoạt động dọc đường
- Kéo để dời bản đồ. Cuộn chuột, chụm hai ngón hoặc dùng nút +/− để zoom. Nút ◎ về vị trí hiện tại, ▣ mở toàn tuyến.
- Chọn ghim rồi bấm **Đi tới đây**. Người chơi di chuyển theo đường; các chặng tiêu hao độ no, nước uống và thể lực. Dừng nghỉ, mua cơm nước, phụ quán hoặc câu cá và đem bán ở chợ Đồng Văn.
- Đến ba ghim máy ảnh để check-in. Có thể làm quen chó và mèo bằng cách chờ rồi đặt thức ăn xuống. Thú tự đi theo nếu đã quen.
- Trạm có bán xe đạp, xe máy, ô tô và túi sơ cứu. Mỗi xe có tốc độ, mức tiêu hao và mức sát thương va chạm khác nhau. Xe máy và ô tô tốn tiền nhiên liệu. Khi gặp chướng ngại, tự đánh lái tránh hoặc mất máu khi đụng; dùng sơ cứu từ túi đồ để hồi máu.
- Tiến độ lưu trong trình duyệt ở những điểm dừng, không lưu giữa chặng. Giá cả, dịch vụ, chướng ngại, câu cá và đường đi là mô phỏng hư cấu, không dùng để dẫn đường ngoài đời.

## Nguồn ảnh
- Núi Đôi: [Thietkeweb123](https://commons.wikimedia.org/wiki/File:Ha_Giang_Province.jpg), [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
- Chợ Đồng Văn: [Zennysmile](https://commons.wikimedia.org/wiki/File:A_corner_in_Dong_Van_Market.jpg), [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
- Mã Pì Lèng: [minhphuc_99kdd](https://commons.wikimedia.org/wiki/File:M%C3%A3_P%C3%AD_L%C3%A8ng_by_minhphuc_99kdd.jpg), [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/).
- Ảnh chỉ thay đổi kích thước hiển thị; không chỉnh sửa nội dung.

## Các phiên bản trước
- `ride.html`: cuộn cảnh 2D. A/D hoặc ←/→ để đi, E đổi xe, Space nhảy, F ghi bưu thiếp.
- `story/index.html`: kể chuyện theo lựa chọn.

## Kiểm thử
Chạy `node test/map-smoke.cjs`, `node test/scene3d-smoke.cjs` và `node test/ride-smoke.cjs`.
