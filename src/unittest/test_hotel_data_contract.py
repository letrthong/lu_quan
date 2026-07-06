"""
Test file sử dụng dữ liệu thực từ config/hotel_connect.
Các test này đảm bảo khi thay đổi data schema hoặc mapping sẽ được phát hiện ngay.
"""
import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import unittest
import json
import glob
import base64
from hotel_constants import HotelField, HotelStatus, LIGHTWEIGHT_FIELDS

# Đường dẫn tới config/hotel_connect
HOTEL_CONNECT_DIR = os.path.abspath(os.path.join(
    os.path.dirname(__file__), '..', '..', 'config', 'hotel_connect'
))


class TestHotelDataContract(unittest.TestCase):
    """
    Contract tests để đảm bảo dữ liệu trong config/hotel_connect
    đúng schema mong đợi. Nếu thay đổi mapping hoặc data structure,
    các test này sẽ fail.
    """
    
    @classmethod
    def setUpClass(cls):
        """Load tất cả hotel data files một lần"""
        cls.hotel_files = glob.glob(os.path.join(HOTEL_CONNECT_DIR, 'hotel_*.json'))
        # Exclude schema files
        cls.hotel_files = [f for f in cls.hotel_files if 'hotel_schema' not in os.path.basename(f)]
        cls.all_hotels = []
        cls.file_hotels_map = {}
        
        for file_path in cls.hotel_files:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    hotels = json.load(f)
                    if isinstance(hotels, list):
                        cls.all_hotels.extend(hotels)
                        cls.file_hotels_map[file_path] = hotels
            except (json.JSONDecodeError, IOError) as e:
                print(f"Warning: Could not load {file_path}: {e}")
    
    def test_hotel_files_exist(self):
        """Đảm bảo có ít nhất một file hotel data"""
        self.assertGreater(len(self.hotel_files), 0, 
            "Không tìm thấy file hotel_*.json trong config/hotel_connect")
    
    def test_hotel_data_not_empty(self):
        """Đảm bảo có ít nhất một hotel trong data"""
        self.assertGreater(len(self.all_hotels), 0,
            "Không có hotel nào trong các file config")


class TestHotelRequiredFields(unittest.TestCase):
    """
    Test các required fields của hotel.
    Nếu ai đó đổi tên field hoặc xóa field, test sẽ fail.
    """
    
    # Fields bắt buộc cho mỗi hotel với status=approved
    REQUIRED_FIELDS = ['id', 'name', 'type', 'locationId', 'status', 'lat', 'lng']
    
    # Fields có thể rỗng nhưng phải tồn tại
    OPTIONAL_FIELDS = ['address', 'phone', 'website', 'description', 'image', 'rating', 
                       'createdAt', 'updatedAt', 'thumbnail']
    
    @classmethod
    def setUpClass(cls):
        cls.hotel_files = glob.glob(os.path.join(HOTEL_CONNECT_DIR, 'hotel_*.json'))
        # Exclude schema files
        cls.hotel_files = [f for f in cls.hotel_files if 'hotel_schema' not in os.path.basename(f)]
        cls.all_hotels = []
        for file_path in cls.hotel_files:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    hotels = json.load(f)
                    if isinstance(hotels, list):
                        # Only include records that look like hotels (have id and name)
                        for h in hotels:
                            if h.get('id') and h.get('name'):
                                cls.all_hotels.append(h)
            except:
                pass
    
    def test_required_fields_exist(self):
        """Mỗi hotel approved phải có đầy đủ required fields"""
        for hotel in self.all_hotels:
            # Only check approved hotels for required fields
            if hotel.get('status') != 'approved':
                continue
            for field in self.REQUIRED_FIELDS:
                self.assertIn(field, hotel, 
                    f"Hotel '{hotel.get('name', 'unknown')}' thiếu required field: {field}")
    
    def test_id_format(self):
        """ID phải là UUID format hoặc string không rỗng"""
        for hotel in self.all_hotels:
            hotel_id = hotel.get('id')
            # Already filtered in setUpClass
            self.assertIsInstance(hotel_id, str, f"ID phải là string")
            self.assertGreater(len(hotel_id), 0, f"ID không được rỗng")
    
    def test_name_not_empty(self):
        """Tên hotel không được rỗng"""
        for hotel in self.all_hotels:
            name = hotel.get('name')
            # Already filtered in setUpClass
            self.assertGreater(len(name.strip()), 0, 
                f"Hotel ID '{hotel.get('id')}' có tên rỗng")
    
    def test_type_valid_values(self):
        """Type phải là giá trị hợp lệ"""
        # Sync với HOTEL_TYPES trong js/constants.js
        VALID_TYPES = [
            'hotel', 'restaurant', 'entertainment', 'homestay', 'resort', 
            'villa', 'motel', 'shop', 'coffee', 'transport', 'local_food',
            'car', 'medical', 'religion', 'gas_station', 'ev_station', 'other',
            # Legacy types (có thể tồn tại trong data cũ)
            'hostel', 'apartment', 'bungalow', 'camping', 'guesthouse', 
            'historical', 'landmark'
        ]
        for hotel in self.all_hotels:
            hotel_type = hotel.get('type')
            # Skip hotels without type (might be schema or incomplete data)
            if hotel_type is None:
                continue
            self.assertIn(hotel_type, VALID_TYPES, 
                f"Hotel '{hotel.get('name')}' có type không hợp lệ: {hotel_type}")
    
    def test_status_valid_values(self):
        """Status phải là giá trị hợp lệ từ HotelStatus enum"""
        valid_statuses = [s.value for s in HotelStatus]
        for hotel in self.all_hotels:
            status = hotel.get('status')
            # Skip hotels without status (might be schema or incomplete data)
            if status is None:
                continue
            self.assertIn(status, valid_statuses, 
                f"Hotel '{hotel.get('name')}' có status không hợp lệ: {status}")


class TestHotelCoordinates(unittest.TestCase):
    """Test tọa độ lat/lng của hotel"""
    
    # Giới hạn tọa độ Việt Nam
    VN_LAT_MIN, VN_LAT_MAX = 8.0, 24.0
    VN_LNG_MIN, VN_LNG_MAX = 102.0, 110.0
    
    @classmethod
    def setUpClass(cls):
        cls.hotel_files = glob.glob(os.path.join(HOTEL_CONNECT_DIR, 'hotel_*.json'))
        cls.hotel_files = [f for f in cls.hotel_files if 'hotel_schema' not in os.path.basename(f)]
        cls.all_hotels = []
        for file_path in cls.hotel_files:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    hotels = json.load(f)
                    if isinstance(hotels, list):
                        for h in hotels:
                            if h.get('id') and h.get('name') and h.get('status') == 'approved':
                                cls.all_hotels.append(h)
            except:
                pass
    
    def test_lat_is_number(self):
        """Latitude phải là số"""
        for hotel in self.all_hotels:
            lat = hotel.get('lat')
            if lat is None:
                continue
            self.assertIsInstance(lat, (int, float), 
                f"Hotel '{hotel.get('name')}' có lat không phải số: {type(lat)}")
    
    def test_lng_is_number(self):
        """Longitude phải là số"""
        for hotel in self.all_hotels:
            lng = hotel.get('lng')
            if lng is None:
                continue
            self.assertIsInstance(lng, (int, float), 
                f"Hotel '{hotel.get('name')}' có lng không phải số: {type(lng)}")
    
    def test_lat_in_vietnam_range(self):
        """Latitude phải nằm trong phạm vi Việt Nam"""
        for hotel in self.all_hotels:
            lat = hotel.get('lat')
            if lat is not None:
                self.assertTrue(self.VN_LAT_MIN <= lat <= self.VN_LAT_MAX,
                    f"Hotel '{hotel.get('name')}' có lat={lat} ngoài phạm vi Việt Nam ({self.VN_LAT_MIN}-{self.VN_LAT_MAX})")
    
    def test_lng_in_vietnam_range(self):
        """Longitude phải nằm trong phạm vi Việt Nam"""
        for hotel in self.all_hotels:
            lng = hotel.get('lng')
            if lng is not None:
                self.assertTrue(self.VN_LNG_MIN <= lng <= self.VN_LNG_MAX,
                    f"Hotel '{hotel.get('name')}' có lng={lng} ngoài phạm vi Việt Nam ({self.VN_LNG_MIN}-{self.VN_LNG_MAX})")


class TestHotelBase64Fields(unittest.TestCase):
    """
    Test các fields được encode base64.
    Đảm bảo decode được và format đúng.
    """
    
    BASE64_FIELDS = ['address', 'phone', 'website', 'description']
    
    @classmethod
    def setUpClass(cls):
        cls.hotel_files = glob.glob(os.path.join(HOTEL_CONNECT_DIR, 'hotel_*.json'))
        cls.hotel_files = [f for f in cls.hotel_files if 'hotel_schema' not in os.path.basename(f)]
        cls.all_hotels = []
        for file_path in cls.hotel_files:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    hotels = json.load(f)
                    if isinstance(hotels, list):
                        for h in hotels:
                            if h.get('id') and h.get('name') and h.get('status') == 'approved':
                                cls.all_hotels.append(h)
            except:
                pass
    
    def _is_valid_base64(self, s):
        """Kiểm tra string có phải base64 hợp lệ không"""
        if not s or not isinstance(s, str):
            return True  # Empty or non-string is OK (optional field)
        try:
            # Thử decode
            decoded = base64.b64decode(s, validate=True)
            # Thử decode UTF-8
            decoded.decode('utf-8')
            return True
        except:
            return False
    
    def test_base64_fields_decodable(self):
        """Các fields base64 phải decode được"""
        for hotel in self.all_hotels:
            for field in self.BASE64_FIELDS:
                value = hotel.get(field, '')
                if value and isinstance(value, str) and not value.startswith('http'):
                    # Skip URL values (website có thể là URL trực tiếp)
                    is_valid = self._is_valid_base64(value)
                    self.assertTrue(is_valid,
                        f"Hotel '{hotel.get('name')}' có {field} không decode được base64")


class TestLightweightFieldsContract(unittest.TestCase):
    """
    Test LIGHTWEIGHT_FIELDS contract.
    Đảm bảo mapping giữa constants và data nhất quán.
    """
    
    @classmethod
    def setUpClass(cls):
        cls.hotel_files = glob.glob(os.path.join(HOTEL_CONNECT_DIR, 'hotel_*.json'))
        cls.hotel_files = [f for f in cls.hotel_files if 'hotel_schema' not in os.path.basename(f)]
        cls.all_hotels = []
        for file_path in cls.hotel_files:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    hotels = json.load(f)
                    if isinstance(hotels, list):
                        for h in hotels:
                            if h.get('id') and h.get('name') and h.get('status') == 'approved':
                                cls.all_hotels.append(h)
            except:
                pass
    
    def test_lightweight_fields_exist_in_data(self):
        """
        Các fields trong LIGHTWEIGHT_FIELDS phải tồn tại trong data.
        Nếu đổi tên field trong constants mà không đổi trong data, test sẽ fail.
        """
        if not self.all_hotels:
            self.skipTest("Không có hotel data để test")
        
        # Use first approved hotel (already filtered in setUpClass)
        sample_hotel = self.all_hotels[0]
        
        for field in LIGHTWEIGHT_FIELDS:
            self.assertIn(field, sample_hotel,
                f"LIGHTWEIGHT_FIELDS chứa '{field}' nhưng không có trong data hotel")
    
    def test_data_has_no_extra_required_fields(self):
        """
        Kiểm tra xem có field quan trọng nào trong data mà chưa được định nghĩa không.
        """
        # Fields quan trọng thường có trong hotel
        EXPECTED_IMPORTANT_FIELDS = {'id', 'name', 'type', 'lat', 'lng', 'locationId', 'status'}
        
        if self.all_hotels:
            data_fields = set(self.all_hotels[0].keys())
            missing_in_lightweight = EXPECTED_IMPORTANT_FIELDS - set(LIGHTWEIGHT_FIELDS)
            self.assertEqual(missing_in_lightweight, set(),
                f"Các field quan trọng chưa có trong LIGHTWEIGHT_FIELDS: {missing_in_lightweight}")


class TestLocationIdConsistency(unittest.TestCase):
    """
    Test locationId nhất quán giữa các file.
    Đảm bảo một file chỉ chứa hotels của một location.
    """
    
    @classmethod
    def setUpClass(cls):
        cls.hotel_files = glob.glob(os.path.join(HOTEL_CONNECT_DIR, 'hotel_*.json'))
        # Exclude hotel_schema.json as it's not hotel data
        cls.hotel_files = [f for f in cls.hotel_files if 'hotel_schema' not in os.path.basename(f)]
        cls.file_hotels_map = {}
        for file_path in cls.hotel_files:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    cls.file_hotels_map[file_path] = json.load(f)
            except:
                pass
    
    def test_single_location_per_file(self):
        """Mỗi file hotel_*.json chỉ chứa hotels của một locationId"""
        for file_path, hotels in self.file_hotels_map.items():
            if not isinstance(hotels, list) or len(hotels) == 0:
                continue
            
            location_ids = set(h.get('locationId') for h in hotels if h.get('locationId'))
            self.assertEqual(len(location_ids), 1,
                f"File {os.path.basename(file_path)} chứa nhiều locationId: {location_ids}")


class TestCacheVersionFile(unittest.TestCase):
    """Test cache_version.json"""
    
    def test_cache_version_exists(self):
        """cache_version.json phải tồn tại"""
        cache_file = os.path.join(HOTEL_CONNECT_DIR, 'cache_version.json')
        self.assertTrue(os.path.exists(cache_file), 
            "cache_version.json không tồn tại trong config/hotel_connect")
    
    def test_cache_version_structure(self):
        """cache_version.json phải có cấu trúc đúng"""
        cache_file = os.path.join(HOTEL_CONNECT_DIR, 'cache_version.json')
        if os.path.exists(cache_file):
            with open(cache_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            self.assertIn('version', data, "cache_version.json thiếu field 'version'")
            self.assertIsInstance(data['version'], (int, float), 
                "version phải là số")
            
            if 'updated_at' in data:
                self.assertIsInstance(data['updated_at'], str, 
                    "updated_at phải là string")


if __name__ == '__main__':
    unittest.main()
