def auto_inactive(hotel):

# 📚 MỤC LỤC TÀI LIỆU KỸ THUẬT HOTEL_CONNECT (.gemini)

> **Luôn cập nhật khi có file mới/tách!**

---

## Tổng quan
- [END_POINT.md](END_POINT.md): Quy tắc đặt tên, cấu trúc endpoint API
- [ADMIN_RULES.md](ADMIN_RULES.md): Quy tắc quản trị, phân quyền, bảo mật
- [APPROVAL_WORKFLOW.md](APPROVAL_WORKFLOW.md): Quy trình duyệt/phê duyệt khách sạn
- [INACTIVE_RULES.md](INACTIVE_RULES.md): Quy tắc tự động chuyển trạng thái "không hoạt động"
- [LOCATION_RULES.md](LOCATION_RULES.md): Kiểm tra vị trí khách sạn với khu vực
- [MAP_MARKER_RULES.md](MAP_MARKER_RULES.md): Quy tắc hiển thị marker, cluster map
- [PAGINATION_RULES.md](PAGINATION_RULES.md): Quy tắc phân trang dữ liệu lớn
- [POPUP_REPORT_RULES.md](POPUP_REPORT_RULES.md): Quy tắc popup báo lỗi, anti-spam
- [REPORT_RULES.md](REPORT_RULES.md): Quản lý & cảnh báo khách sạn bị report
- [URL_QUERY_RULES.md](URL_QUERY_RULES.md): Quy tắc truyền tham số qua URL/query
- [WEBSITE_RULES.md](WEBSITE_RULES.md): Kiểm tra website hợp lệ khi đăng ký
- [HOTEL_STATUS.md](HOTEL_STATUS.md): Danh sách trạng thái (status) của khách sạn
- [FLASK_BACKEND.md](FLASK_BACKEND.md): Đường dẫn cấu hình backend Flask
- [FRONTEND.md](FRONTEND.md): Tổng quan cấu trúc, công nghệ, quy tắc phát triển frontend (React, Vite, Tailwind, ...)
- [UNITTEST.md](UNITTEST.md): Quy tắc & hướng dẫn viết unit test cho frontend (Vitest, React Testing Library)
- **Thư mục `config/`: Chứa dữ liệu mẫu khách sạn từng thành phố (file .json, ví dụ: dalat_hotels.json, hotel_schema.json...)**
  
---

## Hướng dẫn sử dụng
- Mỗi file là một chủ đề độc lập, không trùng lặp nội dung.
- Khi thêm/tách file mới, cập nhật lại mục lục này.
- Đọc file này đầu tiên khi cần tra cứu tài liệu kỹ thuật hệ thống.

---

## Ghi chú
- Nếu phát hiện file cũ, trùng lặp, báo lại để xóa.
- Đặt file này làm mặc định khi mở thư mục `.gemini`.
