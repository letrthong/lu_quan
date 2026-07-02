### Quản lý và cảnh báo khách sạn bị báo lỗi (report)

**Quy tắc:**
- Khi một khách sạn bị người dùng báo lỗi (report), hệ thống sẽ hiển thị cảnh báo/badge nổi bật trong danh sách admin (ví dụ: "Bị báo lỗi", số lượt report, lý do gần nhất).
- Admin có thể lọc/sắp xếp danh sách khách sạn theo số lượt report, loại lỗi, thời gian report gần nhất.
- Lưu lại lịch sử xử lý từng report (ai xử lý, thời gian, kết quả: đã sửa, từ chối, v.v.). Admin có thể đánh dấu đã xử lý hoặc bỏ qua report.
- Nếu một khách sạn bị report quá nhiều lần trong thời gian ngắn (ví dụ 5 lần/tuần), hệ thống tự động chuyển trạng thái sang `pending_review` để admin kiểm tra lại trước khi tiếp tục hiển thị public.
- Khi có report mới, hệ thống gửi email/thông báo cho admin để không bỏ sót phản hồi người dùng.

> **Lưu ý:** Các khách sạn bị report sẽ được ưu tiên hiển thị lên đầu danh sách để admin kiểm tra/xử lý nhanh.
