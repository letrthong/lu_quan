### Quy trình duyệt/phê duyệt khách sạn mới

1. Người dùng gửi yêu cầu đăng ký khách sạn mới (API: POST /api/hotelconnect/v1/hotels/request, trạng thái mặc định là pending).
2. Admin kiểm tra, có thể chỉnh sửa lại thông tin, phê duyệt (approve) hoặc từ chối (reject).
3. Sau khi phê duyệt, khách sạn chuyển sang trạng thái approved và xuất hiện trên bản đồ/public. Nếu bị từ chối, lưu lý do để phản hồi cho người đăng ký.

- Trường email không bắt buộc, nếu có sẽ dùng để gửi thông báo trạng thái (pending, approve, reject, sắp xóa).
- Các trường name, address, phone, description, website, status phải mã hóa base64 khi lưu.
- Không duyệt tự động, mọi yêu cầu đều phải qua kiểm duyệt thủ công của admin.
- Có thể kiểm tra trùng lặp (theo tên, địa chỉ, số điện thoại) để tránh spam hoặc đăng ký nhiều lần cùng một khách sạn.
- Nên log lại lịch sử duyệt, ai duyệt, thời gian duyệt để truy vết.
