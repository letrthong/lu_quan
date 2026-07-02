### Kiểm tra website hợp lệ khi đăng ký

Khi người dùng đăng ký khách sạn mới, cần kiểm tra trường `website` (nếu có) phải là URL hợp lệ và có thể kết nối được (không phải link chết, lỗi DNS, hoặc trả về lỗi 4xx/5xx). Nếu không kết nối được, từ chối đăng ký.

**Gợi ý kiểm tra phía frontend (JavaScript):**
```javascript
// Kiểm tra website hợp lệ (frontend, chỉ kiểm tra cơ bản, không đủ an toàn):
async function checkWebsite(url) {
    try {
        const res = await fetch(url, { method: 'HEAD', mode: 'no-cors' });
        // Nếu không lỗi, coi như hợp lệ (lưu ý: mode no-cors sẽ không bắt được lỗi 4xx/5xx, chỉ kiểm tra được domain sống)
        return true;
    } catch (e) {
        return false;
    }
}

// Sử dụng:
const ok = await checkWebsite(website);
if (!ok) {
    alert('Website không hợp lệ hoặc không thể kết nối!');
    return;
}
```

> **Lưu ý:** Kiểm tra phía frontend chỉ mang tính tham khảo, không đủ an toàn do CORS và fake request. Backend phải kiểm tra lại.

**Gợi ý kiểm tra phía backend (Python/Flask):**
```python
import requests

def check_website(url):
        try:
                resp = requests.head(url, timeout=5, allow_redirects=True)
                # Chấp nhận mã 200-399 là hợp lệ
                return resp.status_code >= 200 and resp.status_code < 400
        except Exception:
                return False

# Sử dụng:
if not check_website(website):
        return { 'success': False, 'message': 'Website không hợp lệ hoặc không thể kết nối!' }, 400
```

> **Khuyến nghị:** Luôn kiểm tra website hợp lệ ở backend trước khi lưu dữ liệu. Nếu website không hợp lệ, từ chối đăng ký và trả về thông báo lỗi rõ ràng cho người dùng.
