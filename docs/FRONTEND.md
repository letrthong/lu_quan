# Frontend Overview

## Mục đích
Tài liệu này mô tả cấu trúc, vai trò và các quy tắc phát triển của phần frontend (giao diện người dùng) trong dự án hotel_connect.

## Công nghệ sử dụng
- React 18
- Vite
- JavaScript/TypeScript
- Tailwind CSS
- Leaflet.js (bản đồ)
- Lucide Icons

## Cấu trúc thư mục chính
- `js/`           : Chứa toàn bộ mã nguồn frontend.
- `js/components/`: Các React component giao diện thuần túy (GUI), chỉ nhận props và phát sự kiện.
- `js/api.js`     : Logic giao tiếp backend (fetch, post, ...).
- `js/hotel_connect.js`: File chính, quản lý state, điều phối các component, xử lý logic nghiệp vụ.
- `js/utils/`     : (Khuyến nghị) Chứa các hàm tiện ích, xử lý dữ liệu, constants.

## Quy tắc phát triển
- Component trong `components/` chỉ xử lý hiển thị, không gọi API trực tiếp.
- Logic gọi API, quản lý state phức tạp nên để ở file chính hoặc custom hook.
- Ưu tiên tách nhỏ component để dễ bảo trì, tái sử dụng.
- Đặt tên file, tên component rõ ràng, nhất quán.

## Quy trình build & chạy
- Sử dụng Vite để phát triển và build.
- Có thể đóng gói bằng Docker nếu cần.

## Ghi chú
- Luôn cập nhật tài liệu khi thay đổi cấu trúc hoặc quy tắc phát triển frontend.
