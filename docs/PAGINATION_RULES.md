### Phân trang khi lấy danh sách khách sạn

- Backend Flask nên hỗ trợ API phân trang, chỉ trả về 20-30 khách sạn mỗi lần.
- Frontend có thể dùng nút “Xem thêm” hoặc cuộn để tải tiếp các trang sau.
- Khi hết dữ liệu, frontend ẩn nút “Xem thêm” hoặc báo “Đã tải hết”.
- Các trường name, address, phone, description, website, status phải mã hóa base64 khi lưu vào file JSON.
