# Đường Về Phía Gió

Bản chơi thử của game phiêu lưu phượt Việt Nam. Chương 01 đi qua Hà Giang, Quản Bạ, Yên Minh, Đồng Văn, Mã Pì Lèng và Mèo Vạc.

## Chạy thử
Mở `index.html` trong trình duyệt. Không cần thư viện, tài khoản, máy chủ hay kết nối mạng. Có thể dùng máy chủ tĩnh nếu muốn kiểm tra việc lưu tiến độ theo tên miền:

    python3 -m http.server 8000

## Thiết kế
- Chọn cách vượt trở ngại hoặc dừng lại ngắm cảnh, nghỉ hay ghi một kỷ niệm vào sổ tay.
- Quyết định ảnh hưởng giờ đến, xăng và sức. Không bị kẹt khi hết tài nguyên: game mở lựa chọn tiếp tế.
- Bản hiện tại là game kể chuyện tương tác, không có điều khiển lái xe, GPS hay bản đồ đường bộ. Sơ đồ dùng tọa độ minh họa, không dùng để dẫn đường.
- [Vietnam Tourism: Vòng cung Hà Giang](https://vietnam.travel/vi/things-to-do/ha-giang-loop-four-day-road-trip/) là nguồn tham khảo địa danh. Tình huống, nhân vật và tài nguyên trong game đều hư cấu.

## Hướng phát triển
Tách dữ liệu tuyến thành các điểm có kinh/vĩ độ và đoạn đường; tạo lớp địa hình và nền cảnh riêng. Thử một màn vượt đèo với phím hoặc cảm ứng, giữ sổ tay và các lựa chọn dừng chân. Chỉ sau khi vòng chơi ngắn đủ thú vị mới mở sang vùng khác.
