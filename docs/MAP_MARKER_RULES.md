### Hiển thị dữ liệu khách sạn trên bản đồ & marker cluster

- Backend chỉ trả về danh sách marker (id, name, lat, lng, status...), frontend tự gom cluster bằng thư viện như Leaflet.markercluster, Google Maps MarkerClusterer, Mapbox Supercluster...
- API hỗ trợ lấy danh sách rút gọn hoặc chi tiết theo vùng/zoom.
- Khi load map lần đầu: chỉ lấy dữ liệu rút gọn cho tất cả marker.
- Khi zoom gần/click: chỉ tải chi tiết khi cần (lazy load), giúp tối ưu hiệu năng và trải nghiệm người dùng.
