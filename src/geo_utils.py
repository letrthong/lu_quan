from math import radians, sin, cos, sqrt, atan2
import pygeohash as pgh
import threading

from hotel_constants import LIGHTWEIGHT_FIELDS

def haversine(lat1, lng1, lat2, lng2):
    """Hàm tính khoảng cách giữa 2 điểm lat/lng trên Trái Đất (công thức Haversine)"""
    R = 6371  # Bán kính Trái Đất (km)
    dlat = radians(lat2 - lat1)
    dlng = radians(lng2 - lng1)
    a = sin(dlat/2)**2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlng/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a))
    distance = R * c
    return distance


# ============== GEOHASH INDEX ==============
# Cache dict: geohash -> [hotels]
# Precision 5 ~ 5km x 5km cells, phù hợp cho nearby search
GEOHASH_INDEX = {}
GEOHASH_PRECISION = 5
_index_lock = threading.Lock()


def encode_geohash(lat, lng, precision=GEOHASH_PRECISION):
    """Encode tọa độ thành geohash string"""
    try:
        return pgh.encode(lat, lng, precision=precision)
    except Exception:
        return None


def get_neighbor_hashes(lat, lng, precision=GEOHASH_PRECISION):
    """
    Lấy 9 ô geohash (ô hiện tại + 8 ô xung quanh) để cover vùng bán kính.
    Điều này đảm bảo không bỏ sót hotels ở biên ô.
    """
    try:
        center = pgh.encode(lat, lng, precision=precision)
        # pgh.neighbors trả về dict với keys: n, ne, e, se, s, sw, w, nw
        neighbors = pgh.neighbors(center)
        return [center] + list(neighbors.values())
    except Exception:
        return []


def build_geohash_index(hotels, precision=GEOHASH_PRECISION):
    """
    Xây dựng geohash index từ danh sách hotels.
    Gọi hàm này khi:
    - Server khởi động
    - Có hotel mới được approve
    - Hotel bị xóa hoặc cập nhật vị trí
    """
    global GEOHASH_INDEX
    new_index = {}
    
    for hotel in hotels:
        try:
            lat = float(hotel.get('lat', 0))
            lng = float(hotel.get('lng', 0))
            if lat == 0 or lng == 0:
                continue
                
            gh = encode_geohash(lat, lng, precision)
            if gh:
                if gh not in new_index:
                    new_index[gh] = []
                new_index[gh].append(hotel)
        except (ValueError, TypeError):
            continue
    
    with _index_lock:
        GEOHASH_INDEX = new_index
    
    return len(new_index)


def add_hotel_to_index(hotel, precision=GEOHASH_PRECISION):
    """Thêm một hotel vào index (dùng khi approve hotel mới)"""
    global GEOHASH_INDEX
    try:
        lat = float(hotel.get('lat', 0))
        lng = float(hotel.get('lng', 0))
        if lat == 0 or lng == 0:
            return False
            
        gh = encode_geohash(lat, lng, precision)
        if gh:
            with _index_lock:
                if gh not in GEOHASH_INDEX:
                    GEOHASH_INDEX[gh] = []
                # Tránh duplicate
                if not any(h.get('id') == hotel.get('id') for h in GEOHASH_INDEX[gh]):
                    GEOHASH_INDEX[gh].append(hotel)
            return True
    except (ValueError, TypeError):
        pass
    return False


def remove_hotel_from_index(hotel_id, precision=GEOHASH_PRECISION):
    """Xóa hotel khỏi index (dùng khi delete hoặc hide hotel)"""
    global GEOHASH_INDEX
    with _index_lock:
        for gh in GEOHASH_INDEX:
            GEOHASH_INDEX[gh] = [h for h in GEOHASH_INDEX[gh] if h.get('id') != hotel_id]


def find_nearby_fast(lat, lng, radius_km, precision=GEOHASH_PRECISION):
    """
    Tìm hotels gần vị trí cho trước trong bán kính radius_km.
    
    Thuật toán:
    1. Lấy 9 ô geohash xung quanh vị trí
    2. Lấy tất cả hotels trong các ô đó (candidates)
    3. Filter chính xác bằng Haversine để loại bỏ false positives
    4. Sắp xếp theo khoảng cách
    
    Hiệu suất: O(n) với n là số hotels trong ~9 ô thay vì toàn bộ dataset.
    Ví dụ: 100,000 hotels → chỉ scan ~100-500 hotels thay vì 100,000.
    """
    try:
        lat = float(lat)
        lng = float(lng)
        radius_km = float(radius_km)
    except (ValueError, TypeError):
        return []
    
    # Lấy các geohash cells cần scan
    hashes = get_neighbor_hashes(lat, lng, precision)
    
    # Thu thập candidates từ index
    candidates = []
    with _index_lock:
        for gh in hashes:
            candidates.extend(GEOHASH_INDEX.get(gh, []))
    
    # Filter chính xác và tính khoảng cách
    results = []
    seen_ids = set()  # Tránh duplicate nếu hotel xuất hiện ở biên
    
    for hotel in candidates:
        hotel_id = hotel.get('id')
        if hotel_id in seen_ids:
            continue
        seen_ids.add(hotel_id)
        
        try:
            h_lat = float(hotel.get('lat', 0))
            h_lng = float(hotel.get('lng', 0))
            
            # Chỉ lấy hotels có status approved hoặc reported
            status = hotel.get('status', 'approved')
            if status not in ('approved', 'reported'):
                continue
                
            dist = haversine(lat, lng, h_lat, h_lng)
            if dist <= radius_km:
                # Chỉ trả về lightweight fields + distance (không có image, description)
                lightweight_hotel = {k: v for k, v in hotel.items() if k in LIGHTWEIGHT_FIELDS}
                lightweight_hotel['distance'] = round(dist, 2)
                results.append(lightweight_hotel)
        except (ValueError, TypeError):
            continue
    
    # Sắp xếp theo khoảng cách
    results.sort(key=lambda x: x['distance'])
    return results


def get_index_stats():
    """Trả về thông tin thống kê về index (debug/monitoring)"""
    with _index_lock:
        total_cells = len(GEOHASH_INDEX)
        total_hotels = sum(len(hotels) for hotels in GEOHASH_INDEX.values())
        return {
            'total_cells': total_cells,
            'total_hotels': total_hotels,
            'precision': GEOHASH_PRECISION
        }
