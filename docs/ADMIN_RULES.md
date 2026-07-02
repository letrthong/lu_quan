### Quản lý tài khoản quản trị viên (Admin)

- Hỗ trợ nhiều admin, phân quyền, đổi mật khẩu, log lịch sử thao tác.
- Mật khẩu lưu dạng hash, không lưu plain text. **File lưu hash đặt tại `/app/key/userlist.json` trong container.**
- Nếu chưa có file password, mặc định password admin là `1234` (bắt buộc đổi sau khi đăng nhập lần đầu).
- Có thể mở rộng để hỗ trợ nhiều admin nếu cần.
- Có API đăng nhập, đổi mật khẩu, thêm/xóa admin, lấy danh sách admin.
- Có thể log lại lịch sử đổi mật khẩu, thao tác duyệt, v.v.
- Admin có quyền tạo, sửa, xóa các khu vực (locationName) thông qua API quản lý schema (`/api/hotelconnect/v1/schema`).
