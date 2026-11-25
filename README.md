# Đường Về Phía Gió · Vietnam Roadtrip Adventure

Mở `index.html` sau khi pull. Bản mặc định là chuyến du mục trên **bản đồ nhìn từ trên xuống**. Game chạy bằng HTML/CSS/JS, không cần cài thư viện. Bản đồ chơi được ngoại tuyến; ảnh thật trên Wikimedia Commons cần mạng.

## Chơi bản đồ
- Kéo để dời bản đồ. Cuộn chuột, chụm hai ngón hoặc dùng nút +/− để zoom. Nút ◎ về vị trí hiện tại, ▣ mở toàn tuyến.
- Chọn ghim rồi bấm **Đi tới đây**. Người chơi di chuyển theo đường; các chặng tiêu hao độ no, nước uống và thể lực. Dừng nghỉ, mua cơm nước, phụ quán hoặc câu cá và đem bán ở chợ Đồng Văn.
- Đến ba ghim máy ảnh để check-in. Có thể làm quen chó và mèo bằng cách chờ rồi đặt thức ăn xuống. Thú tự đi theo nếu đã quen.
- Trạm có bán xe đạp, xe máy, ô tô và túi sơ cứu. Mỗi xe có tốc độ, mức tiêu hao và mức sát thương va chạm khác nhau. Xe máy và ô tô tốn tiền nhiên liệu. Khi gặp chướng ngại, chọn vòng qua hoặc chấp nhận mất máu; dùng sơ cứu từ túi đồ để hồi máu.
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
Chạy `node test/map-smoke.cjs` và `node test/ride-smoke.cjs`.
