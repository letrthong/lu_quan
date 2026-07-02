### Kiểm tra vị trí khách sạn đăng ký với khu vực

Khi người dùng đăng ký khách sạn mới, backend cần kiểm tra vị trí (lat, lng) của khách sạn so với tọa độ trung tâm của khu vực (lấy từ hotel_schema.json thông qua locationId).

- **Quy tắc:** Nếu khoảng cách giữa khách sạn và trung tâm khu vực lớn hơn giới hạn bán kính cho phép của khu vực đó (trường `radius` trong schema, mặc định là 2km) thì từ chối đăng ký hoặc cảnh báo cho admin/người đăng ký.
- **Cách tính:** Sử dụng công thức Haversine để tính khoảng cách giữa 2 điểm lat/lng trên trái đất.
- **Mục đích:** Đảm bảo khách sạn thực sự thuộc khu vực đăng ký, tránh đăng ký nhầm hoặc spam sai địa lý.

**Gợi ý code kiểm tra (Python/Flask):**
```python
from math import radians, sin, cos, sqrt, atan2

def haversine(lat1, lng1, lat2, lng2):
    R = 6371  # Bán kính Trái Đất (km)
    dlat = radians(lat2 - lat1)
    dlng = radians(lng2 - lng1)
    a = sin(dlat/2)**2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlng/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a))
    return R * c

# Ví dụ sử dụng:
area_radius = float(schema.get('radius', 2)) # Lấy bán kính cấu hình từ schema, mặc định 2km
distance = haversine(hotel_lat, hotel_lng, area_lat, area_lng)
if distance > area_radius:
    # Từ chối đăng ký hoặc cảnh báo
```

> **Lưu ý:** Có thể cho phép admin override nếu thực sự hợp lệ, nhưng mặc định nên cảnh báo/từ chối khi vượt quá 2km.
