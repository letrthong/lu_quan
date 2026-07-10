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

#### GET /api/hotelconnect/v1/hotels/bulk
Tải danh sách lữ quán cho nhiều khu vực cùng lúc (hoặc toàn bộ) để tối ưu số lượng request từ client. Trả về thông tin gọn nhẹ (lightweight) không chứa mô tả chi tiết hay ảnh cơ sở.
**Query Params:**
- `locationIds`: Danh sách ID tỉnh/thành phố cách nhau bằng dấu phẩy (VD: `id1,id2,id3`) hoặc `"all"` để lấy tất cả.
**Response:**
```json
{
    "success": true,
    "count": 2,
    "locationIds": ["all"],
    "data": [
        {
            "id": "hotel-uuid",
            "name": "Tên Khách Sạn",
            "type": "hotel",
            "lat": 10.123,
            "lng": 106.456,
            "status": "approved",
            "rating": 5,
            "locationId": "loc-uuid"
        }
    ]
}
```

#### GET /api/hotelconnect/v1/hotels/<hotel_id>/detail
Tải thông tin chi tiết đầy đủ (mô tả dạng Base64 và ảnh đại diện) của một lữ quán cụ thể (lazy load khi người dùng click xem chi tiết).
**Response:**
```json
{
    "success": true,
    "data": {
        "id": "hotel-uuid",
        "description": "TW8gdOG6oyBjaGkgdGnhur90...",
        "image": "https://images.unsplash.com/..."
    }
}
```

#### POST /api/hotelconnect/v1/sos
Gửi yêu cầu cứu hộ SOS khẩn cấp từ người dân (tự động kèm tọa độ GPS).
**Cơ chế chống spam:**
- **Không trùng lặp**: Nếu thiết bị đã có yêu cầu SOS đang chờ xử lý (`pending` hoặc `processing`), yêu cầu gửi mới sẽ cập nhật đè lên yêu cầu cũ (cập nhật tọa độ và nội dung) mà không tạo mới bản ghi.
- **Giới hạn 24 giờ**: Nếu thiết bị đã gửi yêu cầu và được đánh dấu hoàn thành (`resolved` hoặc `cancelled`) trong 24 giờ qua, hệ thống sẽ từ chối và phản hồi lỗi `400 Bad Request`.
- **Xác thực Trình duyệt (Browser Headers Verification)**: Hệ thống kiểm tra các Header đặc trưng của trình duyệt thật. Các yêu cầu thiếu `Origin` hoặc `Referer`, hoặc sử dụng các tác nhân tự động (`User-Agent` chứa `python`, `curl`, `wget`, `postman`, `httpclient`, `urllib`, `scrapy`...) sẽ bị từ chối với lỗi `403 Forbidden`.

**Request:**
```json
{
    "name": "Nguyễn Văn A",
    "phone": "0912345678",
    "lat": 21.0285,
    "lng": 105.8542,
    "message": "Nước dâng cao, nhà có 3 người cần di tản",
    "urgency": "high",
    "deviceId": "client-browser-uuid-string"
}
```
**Response (Thành công mới hoặc cập nhật):**
```json
{
    "success": true,
    "message": "Gửi yêu cầu cứu hộ SOS thành công",
    "data": {
        "id": "sos-uuid-string",
        "name": "Nguyễn Văn A",
        "phone": "0912345678",
        "lat": 21.0285,
        "lng": 105.8542,
        "message": "Nước dâng cao, nhà có 3 người cần di tản",
        "urgency": "high",
        "status": "pending",
        "createdAt": "2026-07-09T15:17:00Z",
        "updatedAt": "2026-07-09T15:17:00Z",
        "reporterIp": "127.0.0.1",
        "deviceId": "client-browser-uuid-string"
    }
}
```

**Response (Bị giới hạn 24h - Lỗi 400 Bad Request):**
```json
{
    "error": "Thiết bị này đã gửi yêu cầu cứu nạn trong vòng 24 giờ qua. Yêu cầu trước đó đã được giải quyết hoặc lưu trữ."
}
```

#### GET /api/hotelconnect/v1/sos
Lấy danh sách toàn bộ các yêu cầu cứu hộ SOS đang hoạt động.
**Bảo mật thông tin:**
- **Mã hóa Số điện thoại**: Theo mặc định, số điện thoại của nạn nhân sẽ bị che/mã hóa ở 4 số giữa (ví dụ: `0912****78`) đối với người dùng công cộng.
- **Quyền Admin**: Để lấy số điện thoại gốc, cần truyền thêm tham số truy vấn `is_admin=true`.

**Response:**
```json
[
    {
        "id": "sos-uuid-string",
        "name": "Nguyễn Văn A",
        "phone": "0912****78",
        "lat": 21.0285,
        "lng": 105.8542,
        "message": "Nước dâng cao, nhà có 3 người cần di tản",
        "urgency": "high",
        "status": "pending",
        "createdAt": "2026-07-09T15:17:00Z",
        "updatedAt": "2026-07-09T15:17:00Z",
        "reporterIp": "127.0.0.1"
    }
]
```

#### PUT /api/hotelconnect/v1/sos/<sos_id>
Cập nhật trạng thái của một yêu cầu cứu hộ (ví dụ: đánh dấu là đã cứu nạn thành công).
**Bảo mật:** Chỉ lực lượng Cứu hộ/Admin mới được phép đổi trạng thái. Yêu cầu truyền tham số truy vấn `is_admin=true` trên URL.

**Request:**
```json
{
    "status": "resolved"
}
```
**Response:**
```json
{
    "success": true,
    "message": "Cập nhật trạng thái thành công sang resolved",
    "data": {
        "id": "sos-uuid-string",
        "status": "resolved",
        "updatedAt": "2026-07-09T15:20:00Z"
        /* ... other fields ... */
    }
}
```

#### DELETE /api/hotelconnect/v1/sos/<sos_id>
Xóa yêu cầu cứu hộ khỏi danh sách lưu trữ.
**Bảo mật:** Yêu cầu tham số truy vấn `is_admin=true` trên URL.

**Response:**
```json
{
    "success": true,
    "message": "Xóa yêu cầu cứu hộ thành công"
}
```

#### GET /api/hotelconnect/v1/sos/<sos_id>/comments
Lấy danh sách nhật ký cập nhật tình hình (bình luận) của một ca cứu hộ.
**Response:**
```json
[
    {
        "id": "comment-uuid-string",
        "author": "Người báo tin",
        "message": "Nước đã dâng lên sàn tầng 2",
        "createdAt": "2026-07-10T08:40:00Z",
        "isAdmin": false
    }
]
```

#### POST /api/hotelconnect/v1/sos/<sos_id>/comments
Gửi một cập nhật tình hình mới cho ca cứu hộ.
**Phân quyền chặt chẽ:** Chỉ Admin (`is_admin=true` trên URL) hoặc chính thiết bị gửi SOS (`deviceId` trong body khớp với ca SOS gốc) mới có quyền tạo bình luận.

**Request:**
```json
{
    "message": "Nước đã ngập ngang bắp chân ở tầng 2",
    "deviceId": "client-browser-uuid-string"
}
```
**Response:**
```json
{
    "success": true,
    "message": "Gửi bình luận thành công",
    "data": {
        "id": "comment-uuid-string",
        "author": "Người báo tin",
        "message": "Nước đã ngập ngang bắp chân ở tầng 2",
        "createdAt": "2026-07-10T08:42:00Z",
        "isAdmin": false
    }
}
```

> **Lưu ý:** Các trường `lat` và `lng` rất quan trọng để hiển thị bản đồ và tìm kiếm khách sạn theo vị trí. `filePathId` phải có định dạng: `hotel_<uuid>.json`. Khi xoá schema, các file dữ liệu khách sạn vẫn còn trên hệ thống, cần quản lý thủ công nếu muốn xoá hoàn toàn.
