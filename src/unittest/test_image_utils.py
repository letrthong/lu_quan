import sys
import os
import unittest
from unittest.mock import patch, MagicMock

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import image_utils

class TestImageUtils(unittest.TestCase):
    def setUp(self):
        # 1x1 transparent PNG base64 representation
        self.valid_png_b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
        self.valid_png_b64_with_header = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="

    def test_create_thumbnail_no_pillow(self):
        """Kiểm tra khi không có thư viện Pillow"""
        with patch('image_utils.PILLOW_AVAILABLE', False):
            res = image_utils.create_thumbnail_from_base64(self.valid_png_b64)
            self.assertIsNone(res)

    def test_create_thumbnail_empty_input(self):
        """Kiểm tra khi đầu vào rỗng"""
        self.assertIsNone(image_utils.create_thumbnail_from_base64(""))
        self.assertIsNone(image_utils.create_thumbnail_from_base64(None))

    def test_create_thumbnail_invalid_base64(self):
        """Kiểm tra khi base64 không hợp lệ"""
        with patch('image_utils.PILLOW_AVAILABLE', True):
            res = image_utils.create_thumbnail_from_base64("not-a-valid-base64-string!!!")
            self.assertIsNone(res)

    def test_create_thumbnail_success(self):
        """Kiểm tra tạo thumbnail thành công (nếu Pillow được cài đặt)"""
        if not image_utils.PILLOW_AVAILABLE:
            self.skipTest("Pillow không khả dụng trong môi trường hiện tại")
            
        # Thử với ảnh có header
        res1 = image_utils.create_thumbnail_from_base64(self.valid_png_b64_with_header)
        self.assertIsNotNone(res1)
        self.assertTrue(res1.startswith("data:image/webp;base64,"))
        
        # Thử với ảnh không có header
        res2 = image_utils.create_thumbnail_from_base64(self.valid_png_b64)
        self.assertIsNotNone(res2)
        self.assertTrue(res2.startswith("data:image/webp;base64,"))

    def test_ensure_thumbnail_no_image(self):
        """Đảm bảo không chỉnh sửa nếu hotel_data không có image"""
        hotel = {"name": "Hotel A"}
        res = image_utils.ensure_thumbnail(hotel)
        self.assertEqual(res, {"name": "Hotel A"})
        self.assertNotIn("thumbnail", res)

    def test_ensure_thumbnail_existing_no_force(self):
        """Giữ nguyên thumbnail cũ nếu đã tồn tại và force_regenerate=False"""
        hotel = {
            "name": "Hotel A",
            "image": self.valid_png_b64,
            "thumbnail": "existing_thumb"
        }
        res = image_utils.ensure_thumbnail(hotel, force_regenerate=False)
        self.assertEqual(res["thumbnail"], "existing_thumb")

    @patch('image_utils.create_thumbnail_from_base64', return_value="new_thumb")
    def test_ensure_thumbnail_generate(self, mock_create):
        """Tạo thumbnail mới nếu chưa có"""
        hotel = {
            "name": "Hotel A",
            "image": "some_image_data"
        }
        res = image_utils.ensure_thumbnail(hotel)
        mock_create.assert_called_once_with("some_image_data")
        self.assertEqual(res["thumbnail"], "new_thumb")

    @patch('image_utils.create_thumbnail_from_base64', return_value="new_thumb")
    def test_ensure_thumbnail_force_regenerate(self, mock_create):
        """Buộc tạo lại thumbnail mới khi force_regenerate=True"""
        hotel = {
            "name": "Hotel A",
            "image": "some_image_data",
            "thumbnail": "old_thumb"
        }
        res = image_utils.ensure_thumbnail(hotel, force_regenerate=True)
        mock_create.assert_called_once_with("some_image_data")
        self.assertEqual(res["thumbnail"], "new_thumb")


if __name__ == '__main__':
    unittest.main()
