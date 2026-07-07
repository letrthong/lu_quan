import sys
import os
import time
import threading
import unittest
from unittest.mock import patch, MagicMock

# Đảm bảo import được restful_blueprint_hotel_connect
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Tắt cache warmup tự động khi import để tránh nhiễu test
os.environ['HOTEL_DISABLE_CACHE_WARMUP'] = 'true'

import restful_blueprint_hotel_connect as hc


class TestCacheMultithreading(unittest.TestCase):
    def setUp(self):
        # Reset các biến trạng thái cache trước mỗi test
        with hc._cache_lock:
            hc._hotels_cache['data'] = {}
            hc._hotels_cache['all_hotels'] = []
            hc._hotels_cache['timestamp'] = 0
            hc._hotels_cache['data_version'] = 0
            
        with hc._geohash_lock:
            hc._geohash_index_timestamp = 0
            hc._geohash_index_data_version = 0

        hc._last_version_check_time = 0
        hc._cached_file_version = 0

    def test_cache_stampede_protection(self):
        """Kiểm tra cơ chế Double-Checked Locking chống Cache Stampede dưới multithreading"""
        build_call_count = 0
        build_lock = threading.Lock()

        # Giả lập hàm build cache chậm (để mô phỏng I/O)
        def mock_build_cache():
            nonlocal build_call_count
            with build_lock:
                build_call_count += 1
            time.sleep(0.1)  # Giả lập I/O đọc đĩa mất 100ms
            
            # Cập nhật version trong cache để các check tiếp theo thấy cache hợp lệ
            with hc._cache_lock:
                hc._hotels_cache['data_version'] = 1
                hc._hotels_cache['data'] = {"loc1": [{"id": "hotel1", "locationId": "loc1"}]}
                hc._hotels_cache['all_hotels'] = [{"id": "hotel1", "locationId": "loc1"}]
            return {"loc1": [{"id": "hotel1", "locationId": "loc1"}]}, [{"id": "hotel1", "locationId": "loc1"}]

        # Giả lập _is_cache_valid: trả về False nếu version của cache chưa đạt tới 1
        def mock_is_cache_valid():
            with hc._cache_lock:
                return hc._hotels_cache['data_version'] >= 1

        # Patch các hàm liên quan
        with patch('restful_blueprint_hotel_connect._build_hotels_cache', side_effect=mock_build_cache), \
             patch('restful_blueprint_hotel_connect._is_cache_valid', side_effect=mock_is_cache_valid):
            
            threads = []
            results = []

            def worker():
                res = hc._get_cached_hotels(['loc1'])
                results.append(res)

            # Spawn 10 thread đồng thời truy vấn cache
            for _ in range(10):
                t = threading.Thread(target=worker)
                threads.append(t)
                t.start()

            # Chờ tất cả thread hoàn thành
            for t in threads:
                t.join()

            # Xác minh:
            # 1. Hàm build cache chỉ được gọi duy nhất 1 lần (Double-Checked Locking hoạt động)
            self.assertEqual(build_call_count, 1, "Hàm build cache bị gọi nhiều hơn 1 lần! Cache stampede xảy ra.")
            # 2. Tất cả các luồng đều lấy được dữ liệu khách sạn chính xác
            self.assertEqual(len(results), 10)
            for res in results:
                self.assertEqual(res, [{"id": "hotel1", "locationId": "loc1"}])

    def test_geohash_index_concurrency(self):
        """Kiểm tra tính an toàn luồng và tránh deadlock khi rebuild geohash index đồng thời"""
        rebuild_call_count = 0
        rebuild_lock = threading.Lock()

        def mock_rebuild():
            nonlocal rebuild_call_count
            with rebuild_lock:
                rebuild_call_count += 1
            time.sleep(0.05)  # Giả lập I/O xử lý geohash
            with hc._geohash_lock:
                hc._geohash_index_data_version = 1
            return 5

        # Giả lập check fresh để chạy rebuild nếu version khác nhau
        def mock_read_version():
            return 1

        with patch('restful_blueprint_hotel_connect.rebuild_geohash_index', side_effect=mock_rebuild), \
             patch('restful_blueprint_hotel_connect._read_data_version', side_effect=mock_read_version):
            
            threads = []
            
            def worker():
                hc._ensure_geohash_index_fresh()

            # Chạy đồng thời 10 luồng yêu cầu index fresh
            for _ in range(10):
                t = threading.Thread(target=worker)
                threads.append(t)
                t.start()

            for t in threads:
                t.join()

            # Đảm bảo rebuild chỉ chạy 1 lần và không có deadlock xảy ra
            self.assertEqual(rebuild_call_count, 1, "Index bị rebuild nhiều lần dưới môi trường đồng thời!")

    def test_version_ttl_cache(self):
        """Kiểm tra cơ chế TTL hoạt động đúng và giảm số lần truy cập file đĩa"""
        # Sử dụng patch để đếm số lần thực thi của hàm đọc file trong _read_data_version
        with patch('json.load', return_value={"version": 123}) as mock_json_load, \
             patch('builtins.open', mock_open(read_data='{"version": 123}')), \
             patch('os.path.exists', return_value=True):
             
             # Lần gọi đầu tiên -> đọc đĩa
             v1 = hc._read_data_version()
             self.assertEqual(v1, 123)
             self.assertEqual(mock_json_load.call_count, 1)
             
             # Lần gọi thứ hai ngay lập tức -> dùng cache
             v2 = hc._read_data_version()
             self.assertEqual(v2, 123)
             self.assertEqual(mock_json_load.call_count, 1) # Không tăng call count
             
             # Giả lập trôi qua 1.5 giây
             hc._last_version_check_time -= 1.5
             
             # Lần gọi thứ ba sau 1.5s -> đọc lại đĩa
             v3 = hc._read_data_version()
             self.assertEqual(v3, 123)
             self.assertEqual(mock_json_load.call_count, 2)

    def test_invalidate_cache_forces_immediate_read(self):
        """Kiểm tra invalidate_hotels_cache xóa bỏ bộ nhớ đệm TTL và buộc đọc lại đĩa ngay lập tức"""
        with patch('json.load', return_value={"version": 200}) as mock_json_load, \
             patch('builtins.open', mock_open(read_data='{"version": 200}')), \
             patch('os.path.exists', return_value=True), \
             patch('restful_blueprint_hotel_connect._update_data_version') as mock_update_ver:
             
             # Lần gọi đầu tiên -> đọc đĩa
             v1 = hc._read_data_version()
             self.assertEqual(v1, 200)
             self.assertEqual(mock_json_load.call_count, 1)
             
             # Gọi invalidate_hotels_cache (simulating update)
             hc.invalidate_hotels_cache()
             mock_update_ver.assert_called_once()
             
             # Lần gọi tiếp theo ngay sau đó -> BẮT BUỘC phải đọc đĩa lại ngay lập tức (call_count tăng lên 2)
             # dù chưa trôi qua khoảng thời gian TTL (1.0s)
             v2 = hc._read_data_version()
             self.assertEqual(v2, 200)
             self.assertEqual(mock_json_load.call_count, 2)


# Helper mock open hỗ trợ đọc data
def mock_open(read_data):
    mock = MagicMock()
    mock.return_value.__enter__.return_value.read.return_value = read_data
    return mock


if __name__ == '__main__':
    unittest.main()
