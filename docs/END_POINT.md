## Quy tắc đặt tên và cấu trúc endpoint RESTful

- Luôn bắt đầu endpoint với `/api/<module>/<version>/` để đảm bảo versioning và dễ mở rộng.
	- Ví dụ: `/api/hotelconnect/v1/`

- Các nhóm chức năng nên được phân tách rõ ràng:
	- `/schema`           : Quản lý cấu hình tỉnh/thành phố
	- `/hotels/request`   : Gửi và xem yêu cầu đăng ký khách sạn
	- `/requests/<request_id>/approve` : Phê duyệt yêu cầu
	- `/requests/<request_id>/reject`  : Từ chối yêu cầu
	- `/hotels/reports`    : Gửi và quản lý báo cáo lỗi về khách sạn
	- `/hotels/<hotel_id>`: Cập nhật thông tin khách sạn

- Sử dụng phương thức HTTP đúng chuẩn:
	- GET    : Lấy dữ liệu
	- POST   : Thêm mới
	- PUT    : Cập nhật
	- DELETE : Xoá

- Đặt tên endpoint rõ ràng, nhất quán, dùng tiếng Anh không dấu, phân tách bằng dấu gạch ngang hoặc gạch dưới nếu cần.

- Đảm bảo endpoint trả về dữ liệu JSON, có status code và thông báo lỗi rõ ràng.

- Luôn có version (v1, v2, ...) trong endpoint để dễ bảo trì về sau.

- Sử dụng config động từ js/config.json để chọn base URL backend (local/prod).
- Định nghĩa rõ các endpoint đăng ký, duyệt, lấy schema, phân trang...
- Tất cả các hàm gọi API phải sử dụng địa chỉ gốc đã được nạp.
- Xem ví dụ cấu trúc chuẩn cho js/api.js trong tài liệu chi tiết.

Ví dụ chuẩn:

```
/api/hotelconnect/v1/schema
/api/hotelconnect/v1/hotels/request
/api/hotelconnect/v1/requests/abc123/approve
/api/hotelconnect/v1/requests/abc123/reject
/api/hotelconnect/v1/hotels/xyz789
```

---

## Hướng dẫn chi tiết cấu trúc API & Schema Hotel Connect

### 1. Cấu hình động base URL
Tệp `js/config.json` chứa thông tin endpoint cho 2 môi trường:
- `local_api_base`: Dùng khi phát triển/test nội bộ (VD: `http://192.168.124.129:5000`)
- `production_api_base`: Dùng khi triển khai thực tế (VD: `https://telua.vn`)

### 2. Ví dụ cấu trúc chuẩn cho js/api.js
```javascript
const HotelAPI = {
    baseUrl: null,
    init: async () => {
        const res = await fetch('js/config.json');
        const config = await res.json();
        const host = window.location.hostname;
        const isLocal = host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.');
        HotelAPI.baseUrl = isLocal ? config.local_api_base : config.production_api_base;
    },
    fetchHotels: async () => { /* ... */ }
}
```

### 3. Định nghĩa API quản lý schema & yêu cầu khách sạn

#### POST /api/hotelconnect/v1/hotels/request
Gửi yêu cầu đăng ký khách sạn mới (user hoặc admin đều có thể gửi).
**Request:**
```json
{
    "id": "uuid-string",
    "name": "Tên khách sạn",
    "address": "Địa chỉ",
    "phone": "Số điện thoại",
    "website": "https://...",
    "lat": 10.1234,
    "lng": 106.5678,
    "rating": 4.5,
    "createdAt": "2026-03-26",
    "updatedAt": "2026-03-26",
    "description": "Mô tả",
    "image": "https://...",
    "locationId": "e9f0a1b2-c3d4-5e6f-8a7b-9c8d0e1f2a3b",
    "status": "pending"
}
```
**Response:**
```json
{
    "success": true,
    "message": "Gửi yêu cầu đăng ký thành công",
    "data": { /* hotel object */ }
}
```

#### POST /api/hotelconnect/v1/requests/<request_id>/approve
Phê duyệt một yêu cầu đăng ký khách sạn (chỉ admin).
**Response:**
```json
{
    "success": true,
    "message": "Phê duyệt khách sạn thành công",
    "data": { /* hotel object */ }
}
```

#### POST /api/hotelconnect/v1/requests/<request_id>/reject
Từ chối một yêu cầu đăng ký khách sạn (chỉ admin).
**Response:**
```json
{
    "success": true,
    "message": "Từ chối yêu cầu thành công"
}
```

#### GET /api/hotelconnect/v1/schema
Trả về danh sách schema (các cấu hình tỉnh/thành phố).
**Response:**
```json
[
    {
        "id": "uuid-string",
        "filePathId": "hotel_e4b3c9d1.json",
        "locationName": "Hà Nội",
        "lat": 21.0285,
        "lng": 105.8542,
        "createdAt": "2024-03-01",
        "updatedAt": "2024-03-01"
    },
    {
        "id": "e9f0a1b2-c3d4-5e6f-8a7b-9c8d0e1f2a3b",
        "filePathId": "hotel_e9f0a1b2.json",
        "locationName": "Hồ Chí Minh",
        "lat": 10.7725,
        "lng": 106.7055,
        "createdAt": "2024-05-31",
        "updatedAt": "2024-05-31"
    }
]
```

#### POST /api/hotelconnect/v1/schema
Thêm mới một schema.
**Request:**
```json
{
    "filePathId": "hotel_e4b3c9d1.json",
    "locationName": "Hà Nội",
    "lat": 21.0285,
    "lng": 105.8542
}
```
**Response:**
```json
{
    "message": "Thêm mới thành công",
    "data": {
        "id": "uuid-string",
        "filePathId": "ha_noi.json",
        "locationName": "Hà Nội",
        "lat": 21.0285,
        "lng": 105.8542,
        "createdAt": "2024-03-01",
        "updatedAt": "2024-03-01"
    }
}
```

#### PUT /api/hotelconnect/v1/schema/<item_id>
Cập nhật thông tin một schema theo id.
**Request:**
```json
{
    "filePathId": "hotel_e4b3c9d1.json",
    "locationName": "Hà Nội"
}
```
**Response:**
```json
{
    "message": "Cập nhật thành công",
    "data": {
        "id": "uuid-string",
        "filePathId": "ha_noi.json",
        "locationName": "Hà Nội",
        "createdAt": "2024-03-01",
        "updatedAt": "2024-03-26"
    }
}
```

#### DELETE /api/hotelconnect/v1/schema/<item_id>
Xóa một schema theo id.
**Response:**
```json
{
    "message": "Xóa thành công"
}
```

> **Lưu ý:** Các trường `lat` và `lng` rất quan trọng để hiển thị bản đồ và tìm kiếm khách sạn theo vị trí. `filePathId` phải có định dạng: `hotel_<uuid>.json`. Khi xoá schema, các file dữ liệu khách sạn vẫn còn trên hệ thống, cần quản lý thủ công nếu muốn xoá hoàn toàn.
