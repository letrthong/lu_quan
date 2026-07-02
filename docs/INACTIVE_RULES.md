### Quy tắc tự động chuyển trạng thái "không hoạt động" (inactive)

**Quy tắc:**
- Nếu trường `updatedAt` của khách sạn đã quá 6 tháng (180 ngày) so với ngày hiện tại, hệ thống sẽ tự động chuyển trường `status` thành `inactive` (không hoạt động).
- Nếu không có trường `email` và không cập nhật trong 6 tháng, dữ liệu sẽ bị xóa khỏi hệ thống.
- Trước khi xóa vĩnh viễn, admin sẽ thấy danh sách các khách sạn có trạng thái `inactive` trong vòng 1 tháng gần nhất để review/xác nhận lại (có thể khôi phục hoặc xóa thủ công nếu cần).

Điều này giúp loại bỏ các khách sạn không còn cập nhật, tránh hiển thị thông tin cũ/lỗi thời, đồng thời đảm bảo admin có cơ hội kiểm tra lại trước khi xóa vĩnh viễn.

**Gợi ý code kiểm tra (Python):**
```python
from datetime import datetime, timedelta

def auto_inactive(hotel):
        updated = datetime.strptime(hotel['updatedAt'], '%Y-%m-%d')
        if datetime.now() - updated > timedelta(days=180):
                hotel['status'] = 'inactive'
        return hotel
```

**Gợi ý code kiểm tra (JavaScript):**
```js
function autoInactive(hotel) {
    const updated = new Date(hotel.updatedAt);
    const now = new Date();
    const diff = (now - updated) / (1000 * 60 * 60 * 24); // số ngày
    if (diff > 180) hotel.status = 'inactive';
    return hotel;
}
```

> **Lưu ý:** Có thể chạy kiểm tra này định kỳ (cronjob backend) hoặc khi load dữ liệu lên frontend/backend đều được. Nên log lại các khách sạn bị chuyển trạng thái để admin kiểm tra lại nếu cần.
