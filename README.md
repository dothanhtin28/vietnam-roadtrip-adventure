# Đường Về Phía Gió · Vietnam Roadtrip Adventure

Game phiêu lưu cuộn cảnh 2D tiếng Việt. Chuyến đầu đi từ đồng bằng ven sông qua đồi chè đến đèo đá. Tuyến và tình huống là hư cấu, lấy cảm hứng từ cảnh quan Việt Nam, không phải bản đồ dẫn đường.

## Chạy thử

Mở `index.html` trong trình duyệt. Không cần cài thư viện hay build. Trên điện thoại dùng các nút bên dưới màn chơi.

| Điều khiển | Bàn phím |
| --- | --- |
| Đi trái / phải | A / D hoặc ← / → |
| Nhảy | Space, W hoặc ↑ |
| Lên / xuống xe đạp | E |
| Lưu bưu thiếp tại biển ngắm cảnh | F |

Xe đạp chạy nhanh trên đường khô, nhưng chậm hơn đi bộ trong bùn. Đi bộ nhảy cao hơn, hữu ích khi gặp đá hoặc gỗ chắn đường. Đến đỉnh đèo để kết thúc chuyến, hoặc quay lại lấy những bưu thiếp bỏ lỡ.

## Thư mục

- `index.html`, `ride.css`, `ride.js`: màn chơi 2D, dùng Canvas và không tải asset ngoài.
- `story/`: bản kể chuyện theo lựa chọn trước đó, giữ sáu điểm dừng lấy cảm hứng từ [cung đường Hà Giang](https://vietnam.travel/vi/things-to-do/ha-giang-loop-four-day-road-trip/).

## Kiểm thử

Chạy `node test/ride-smoke.cjs` để kiểm tra chuyển động, va chạm, bưu thiếp, nút cảm ứng và hoàn thành chặng.
