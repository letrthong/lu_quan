### Popup/Detail Overlay & chống spam báo lỗi

- Khi nhấp vào khách sạn, hiển thị popup chi tiết với đầy đủ thông tin.
- Có nút “Báo sai thông tin” với nhiều lựa chọn lý do, ghi chú bổ sung.
- Backend cần rate limit, kiểm tra trùng lặp, log IP/user-agent, không tự động cập nhật mà phải qua admin kiểm duyệt.
- Lưu lịch sử xử lý report, ưu tiên hiển thị các khách sạn bị report lên đầu danh sách admin.
