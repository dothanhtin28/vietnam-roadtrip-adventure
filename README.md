# Đường Về Phía Gió · Vietnam Roadtrip Adventure

Mở `index.html` sau khi pull. Game mở ở góc nhìn 3D và chạy bằng HTML, CSS và JavaScript. Sơ đồ và cảnh chơi dùng được ngoại tuyến. Bản đồ thật và ảnh check-in Wikimedia Commons cần mạng.

## Điều khiển khi đi 3D
- Game mở ở góc nhìn thứ ba. Giữ **W / ↑** để tiến, **S / ↓** để lùi, **A / ←** hoặc **D / →** để đánh lái. Điện thoại dùng bốn nút giữ dưới khung cảnh. Nhả phím để dừng; khi tới điểm dừng, nhả rồi nhấn lại để sang chặng kế.
- Bấm **Q** hoặc **Quay đầu** giữa chặng, rồi giữ **W / ↑** để đi về hướng vừa quay. Khi thấy nút **Nhặt**, bấm nút đó hoặc phím **E** để lấy vật phẩm bên cạnh. Đi sát vật phẩm cũng tự nhặt.
- Kéo ngang để xoay camera, kéo dọc hoặc bấm nút ngước nhìn và nhìn xuống để ngắm cảnh. Bấm **Tự đi** để đi một chặng. Game dừng ở điểm đến hoặc khi no bụng, nước, thể lực hay máu xuống dưới 30%. Khi đang dừng giữa chặng, có thể dùng đồ trong túi.
- Tuyến 3D giới hạn trong đường và lề, chưa phải thế giới mở. Né đá/gỗ bằng A/D, hoặc đi thẳng và chấp nhận va chạm. Lên dốc, bị thương, đói, khát và mệt đều ảnh hưởng tốc độ.
- Khi đi bộ với bộ **Cam đường đèo**, nhân vật chính dùng rig GLB và Three.js để chuyển giữa đứng, bước và xoay. Nhịp bước lấy theo quãng đường trong cảnh. Canvas tiếp tục vẽ thế giới, trang phục khác, hoạt động đặc biệt và dùng làm phương án dự phòng trên máy thiếu WebGL. Có thể tạo lại rig và bundle từ mã nguồn bằng `npm ci` rồi `npm run build:hiker`.

## Hoạt động dọc đường
- Nút ăn và uống trong túi có động tác riêng, kể cả khi dừng giữa chặng. Đi đường làm giảm sạch sẽ. Có thể tắm ở trạm nghỉ, hồ nhỏ ở Hà Giang, suối bên bến sông Lô hoặc ao đầu bản.
- Ghé sân cà phê Hà Giang, phố quán Yên Minh hoặc sân chợ Đồng Văn để giao lưu với các nhà sáng tạo hư cấu. Chào hỏi, ăn cùng và đi chơi giúp tăng độ thân thiết để mở quay clip. Nếu có cãi vã, can ngăn giúp tăng uy tín. Gây gổ có thể làm chuyến đi dừng ở trạm cảnh sát.
- Khách sáng tạo nội dung và người dân bản trưởng thành xuất hiện theo giờ trong game. Họ có lịch ghé từng điểm riêng. **Sổ liên lạc** trong nhật ký ghi lại những người đã chào hỏi và nơi có thể gặp lại. Ven suối hoặc ao đầu bản đôi lúc có người tắm sau bụi lau.
- Bấm **Điện thoại** hoặc **P** để xem hồ sơ, hoạt động hiện tại, lịch sắp tới và nhật ký gặp gỡ của các nhân vật. Có thể tìm theo tên, nghề hoặc lọc những người đã gặp. Các nhân vật đi giữa các điểm dừng, làm việc và gặp nhau theo thời gian trong game. Đồng hồ vẫn chạy khi người chơi đứng yên hoặc đang xem điện thoại.
- Trong mục **Giao lưu**, trò chuyện để tăng thân thiết rồi chọn **Tán tỉnh**, **Mời đi hẹn hò** và **Ngỏ lời yêu**. Khi đã yêu một người, dùng **Bàn về hẹn hò mở** với người ấy và người anh muốn tìm hiểu thêm. Khi những người liên quan đều đồng ý, anh có thể hẹn hò song song. Điểm cảm tình và tiến độ được lưu riêng cho từng người.
- Khi đã yêu và đủ thân thiết sau ba buổi hẹn, có thể **Cầu hôn**, rồi tổ chức đám cưới từ ngày hôm sau. Sau một buổi hẹn, hai người có thể ngẫu nhiên muốn dành thời gian riêng tư cùng nhau. Anh có thể đồng ý hoặc để dịp khác. Sau khi cưới, nếu cả hai đã bàn và muốn có con, mỗi lần đồng ý ở lại cùng nhau có cơ hội mang thai. Mục **Gia đình** theo dõi ngày dự sinh, cho nghỉ đến mốc đó tại trạm nghỉ và chăm bé sau khi chào đời.
- Mở **Trang phục** tại điểm dừng để mặc bộ đã sở hữu hoặc xem nhân vật ở góc gần. Cam đường đèo là bộ mặc định của chuyến mới. Xanh rêu và Chàm cao nguyên cũng có sẵn. Hà Giang, Yên Minh và Chợ Đồng Văn có bán trang phục mới.
- Kéo để dời bản đồ. Cuộn chuột, chụm hai ngón hoặc dùng nút +/− để zoom. Nút ◎ về vị trí hiện tại, ▣ mở toàn tuyến.
- Ghim mở thông tin điểm dừng. Có thể gõ cửa nhà dân để hỏi mua cơm nước, mua nước tăng lực ở quán hoặc thuê xe bò theo chặng tại trạm. Nấm, ngô và trái cây nhặt ven đường có thể ăn hoặc mang bán.
- Ở các điểm nghỉ phù hợp, bấm **Tự dựng lều**. Có thể **Chờ tối ngắm sao**, ngủ đến 06:00 rồi thu lều. Nút nhạc nền và toàn màn hình nằm cạnh tiêu đề.
- Từ Đồng Văn, đi đèo Mã Pí Lèng rồi đổi sang đi bộ để lên Sống lưng Khủng long và đến điểm ngắm Nho Quế. Nút **Đối chiếu trên bản đồ thật** mở ghim địa danh và sơ đồ tuyến ước tính.
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
