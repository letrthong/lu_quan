# Các trạng thái (status) của một khách sạn trong hệ thống Hotel Connect

| Status         | Ý nghĩa                                                        |
|---------------|---------------------------------------------------------------|
| `pending`     | Đang chờ duyệt (mới đăng ký, chưa được admin phê duyệt)        |
| `approved`    | Đã được admin phê duyệt, hiển thị public trên hệ thống         |
| `rejected`    | Đã bị admin từ chối yêu cầu đăng ký                            |
| `inactive`    | Không hoạt động (do quá lâu không cập nhật hoặc bị khóa)        |
| `reported`    | Đang bị báo lỗi, cần admin kiểm tra                            |
| `pending_review` | Bị report nhiều > 10 lần trong 1 tuần, tạm ẩn chờ admin kiểm tra lại              |

## Lưu ý
- Trạng thái mặc định khi đăng ký mới là `pending`.
- Chỉ khách sạn `approved` mới hiển thị public hoặc `reported`.
- Admin có thể chuyển trạng thái giữa các giá trị trên qua API/phần quản trị.
- Có thể bổ sung trạng thái khác nếu nghiệp vụ phát sinh thêm.
