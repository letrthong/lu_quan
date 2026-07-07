import sys
import os
import unittest
from unittest.mock import patch, mock_open

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import json_utils

class TestJsonUtils(unittest.TestCase):
    def test_read_json_file_not_exist(self):
        """Đọc file không tồn tại trả về list rỗng"""
        with patch('os.path.exists', return_value=False):
            self.assertEqual(json_utils.read_json_file('notfound.json'), [])

    def test_read_json_file_invalid_json(self):
        """Đọc file chứa JSON lỗi trả về list rỗng"""
        m = mock_open(read_data='invalid json')
        with patch('os.path.exists', return_value=True), \
             patch('builtins.open', m):
            self.assertEqual(json_utils.read_json_file('bad.json'), [])

    def test_read_json_file_valid(self):
        """Đọc file JSON hợp lệ thành công"""
        m = mock_open(read_data='[{"id": 1, "name": "test"}]')
        with patch('os.path.exists', return_value=True), \
             patch('builtins.open', m):
            self.assertEqual(json_utils.read_json_file('ok.json'), [{"id": 1, "name": "test"}])

    def test_write_json_file(self):
        """Ghi dữ liệu JSON thành công (tự tạo thư mục nếu chưa có)"""
        m = mock_open()
        with patch('os.makedirs') as mock_makedirs, \
             patch('builtins.open', m):
             
            json_utils.write_json_file('dir/file.json', {"data": "test"})
            
            # Kiểm tra tạo thư mục cha
            mock_makedirs.assert_called_once_with('dir', exist_ok=True)
            # Kiểm tra xem có ghi file
            m().write.assert_called()


if __name__ == '__main__':
    unittest.main()
