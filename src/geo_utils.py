from math import radians, sin, cos, sqrt, atan2

def haversine(lat1, lng1, lat2, lng2):
    """Hàm tính khoảng cách giữa 2 điểm lat/lng trên Trái Đất (công thức Haversine)"""
    R = 6371  # Bán kính Trái Đất (km)
    dlat = radians(lat2 - lat1)
    dlng = radians(lng2 - lng1)
    a = sin(dlat/2)**2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlng/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a))
    distance = R * c
    return distance
