# Ghi chú đường dẫn cấu hình backend Hotel Connect

## Đường dẫn cấu hình chính

- `CONFIG_FILE_PATH = "/app/config/hotel_schema.json"`
    - Đây là file lưu cấu hình schema các tỉnh/thành phố (dùng cho API `/api/hotelconnect/v1/schema`).
    - Được sử dụng trong backend Flask (services.py) để đọc/ghi cấu hình schema.

- `HOTEL_REQUESTS_FILE_PATH = "/app/config/hotel_requests.json"`
    - File lưu các yêu cầu đăng ký khách sạn chờ duyệt.

- Các file khách sạn từng thành phố sẽ nằm trong thư mục `/app/config/` với tên lấy từ trường `filePathId` trong schema, ví dụ:
    - `/app/config/hotel_e4b3c9d1.json`
    - `/app/config/hotel_abc123.json`

## Lưu ý khi deploy Docker
- Đường dẫn `/app/config/` là đường dẫn tuyệt đối bên trong container Docker.
- Khi mount volume hoặc copy dữ liệu, cần đảm bảo thư mục này tồn tại và có quyền ghi.
- Nếu chạy local, có thể sửa lại đường dẫn cho phù hợp với môi trường phát triển (ví dụ: `./config/`).

## Tổng kết
- Tất cả dữ liệu cấu hình, yêu cầu, danh sách khách sạn đều lưu trong `/app/config/`.
- Đảm bảo backup, phân quyền và đồng bộ thư mục này khi deploy thực tế.