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

## Cơ chế Caching & Tối ưu hóa hiệu năng

Để giảm thiểu Disk I/O và tối ưu tốc độ phản hồi cho frontend, Backend Flask sử dụng cơ chế lưu cache trong bộ nhớ kết hợp geohash index:

### 1. Memory Cache (`_hotels_cache`)
- Toàn bộ danh sách lữ quán từ tất cả các tỉnh thành được đọc và lưu trữ trực tiếp trong bộ nhớ RAM (`data` và `all_hotels`).
- Khi client gọi API tải lữ quán, backend sẽ trả về ngay từ cache thay vì đọc file JSON từ đĩa.

### 2. Đồng bộ Cache đa tiến trình/đa máy chủ
- Phiên bản dữ liệu hiện tại được lưu trong tệp tin `/app/config/cache_version.json` dạng timestamp mili-giây.
- Mỗi khi có thay đổi dữ liệu (duyệt, từ chối, chỉnh sửa, xóa khách sạn), backend sẽ cập nhật giá trị phiên bản mới vào `cache_version.json` và đồng thời vô hiệu hóa cache cục bộ (`invalidate_hotels_cache()`).
- Trước mỗi lần phục vụ request, backend sẽ thực hiện so sánh phiên bản lưu trữ trong cache với phiên bản đọc từ `cache_version.json`. Nếu phát hiện phiên bản trên đĩa mới hơn, cache cục bộ sẽ được tự động rebuild.

### 3. Tối ưu hóa bộ nhớ & Loại bỏ TTL
- Cache **không sử dụng** cơ chế hết hạn theo thời gian (TTL - ví dụ 5 phút) để tránh việc đọc ghi đĩa vô ích khi dữ liệu không thay đổi. Cache sẽ được lưu giữ vĩnh viễn trong RAM và chỉ được làm mới khi thực sự có hành động chỉnh sửa dữ liệu của Admin.

### 4. Bỏ Warm Cache khi chạy Unit Test
- Khi chạy unit test, luồng chạy ngầm warm-cache có thể gây tranh chấp tài nguyên với Mock. Để tắt tính năng warmup khi test, hãy thiết lập biến môi trường:
  ```bash
  HOTEL_DISABLE_CACHE_WARMUP=true
  ```