import sys
import os
import json
import unittest
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, MagicMock

# Setup path so we can import src modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import sos_service
from app import app
from hotel_constants import HotelField

class TestSosService(unittest.TestCase):
    @patch('sos_service.read_sos', return_value=[])
    @patch('sos_service.write_sos')
    def test_create_sos_success(self, mock_write, mock_read):
        data = {
            'name': 'Van A',
            'phone': '0987654321',
            'lat': 21.0285,
            'lng': 105.8542,
            'message': 'Cần cứu hộ nước dâng',
            'urgency': 'high',
            'deviceId': 'device123'
        }
        res = sos_service.create_sos(data, '127.0.0.1')
        self.assertEqual(res['name'], 'Van A')
        self.assertEqual(res['phone'], '0987654321')
        self.assertEqual(res['lat'], 21.0285)
        self.assertEqual(res['lng'], 105.8542)
        self.assertEqual(res['message'], 'Cần cứu hộ nước dâng')
        self.assertEqual(res['urgency'], 'high')
        self.assertEqual(res['status'], 'pending')
        self.assertEqual(res['deviceId'], 'device123')
        mock_write.assert_called_once()

    def test_create_sos_missing_fields(self):
        data = {'name': 'Van A'}
        with self.assertRaises(ValueError):
            sos_service.create_sos(data, '127.0.0.1')

    def test_create_sos_invalid_coords(self):
        data = {
            'name': 'Van A',
            'phone': '0987654321',
            'lat': 'not-a-number',
            'lng': 105.8542,
            'message': 'Help'
        }
        with self.assertRaises(ValueError):
            sos_service.create_sos(data, '127.0.0.1')

    @patch('sos_service.read_sos', return_value=[{'id': 'sos1', 'deviceId': 'dev1', 'message': 'help'}])
    @patch('sos_service.write_sos')
    def test_create_sos_duplicate_device_updates_active(self, mock_write, mock_read):
        data = {
            'name': 'New Name',
            'phone': '111222333',
            'lat': 10.0,
            'lng': 20.0,
            'message': 'new message',
            'urgency': 'high',
            'deviceId': 'dev1'
        }
        res = sos_service.create_sos(data, '127.0.0.1')
        self.assertEqual(res['name'], 'New Name')
        self.assertEqual(res['message'], 'new message')
        self.assertEqual(res['id'], 'sos1')
        mock_write.assert_called_once()

    @patch('sos_service.read_sos', return_value=[])
    @patch('sos_service.read_sos_history')
    def test_create_sos_resolved_device_rate_limit(self, mock_read_hist, mock_read):
        yesterday_iso = (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat()
        mock_read_hist.return_value = [{'id': 'sos_hist1', 'deviceId': 'dev1', 'updatedAt': yesterday_iso}]
        data = {
            'name': 'Name',
            'phone': '111',
            'lat': 10.0,
            'lng': 20.0,
            'message': 'message',
            'urgency': 'high',
            'deviceId': 'dev1'
        }
        with self.assertRaises(ValueError) as ctx:
            sos_service.create_sos(data, '127.0.0.1')
        self.assertIn("đã gửi yêu cầu cứu nạn trong vòng 24 giờ qua", str(ctx.exception))

    @patch('sos_service.read_sos', return_value=[{'id': 'sos1', 'status': 'pending'}])
    @patch('sos_service.write_sos')
    @patch('sos_service.read_sos_history', return_value=[])
    @patch('sos_service.write_sos_history')
    def test_update_sos_status_resolved_moves_to_history(self, mock_write_hist, mock_read_hist, mock_write, mock_read):
        updated = sos_service.update_sos_status('sos1', 'resolved')
        self.assertEqual(updated['status'], 'resolved')
        mock_write.assert_called_once_with([])
        mock_write_hist.assert_called_once()

    @patch('sos_service.read_sos', return_value=[{'id': 'sos1', 'status': 'pending'}])
    @patch('sos_service.write_sos')
    def test_update_sos_status_processing_remains_active(self, mock_write, mock_read):
        updated = sos_service.update_sos_status('sos1', 'processing')
        self.assertEqual(updated['status'], 'processing')
        mock_write.assert_called_once()

    @patch('sos_service.read_sos', return_value=[{'id': 'sos1', 'status': 'pending'}])
    def test_update_sos_status_invalid(self, mock_read):
        with self.assertRaises(ValueError):
            sos_service.update_sos_status('sos1', 'invalid_status')

    @patch('sos_service.read_sos', return_value=[])
    @patch('sos_service.read_sos_history', return_value=[])
    def test_update_sos_status_not_found(self, mock_read_hist, mock_read):
        with self.assertRaises(KeyError):
            sos_service.update_sos_status('sos1', 'resolved')

    @patch('sos_service.read_sos', return_value=[{'id': 'sos1'}, {'id': 'sos2'}])
    @patch('sos_service.write_sos')
    def test_delete_sos_active_success(self, mock_write, mock_read):
        res = sos_service.delete_sos('sos1')
        self.assertTrue(res)
        mock_write.assert_called_once_with([{'id': 'sos2'}])

    @patch('sos_service.read_sos', return_value=[])
    @patch('sos_service.read_sos_history', return_value=[{'id': 'sos3'}])
    @patch('sos_service.write_sos_history')
    def test_delete_sos_history_success(self, mock_write_hist, mock_read_hist, mock_read):
        res = sos_service.delete_sos('sos3')
        self.assertTrue(res)
        mock_write_hist.assert_called_once_with([])

class TestSosApi(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True

    @patch('sos_service.create_sos', return_value={"id": "sos1", "name": "A", "status": "pending"})
    def test_submit_sos_request_success(self, mock_create):
        data = {"name": "A", "phone": "123", "lat": 10.0, "lng": 20.0, "message": "help", "urgency": "high"}
        response = self.app.post('/api/hotelconnect/v1/sos',
                                 data=json.dumps(data),
                                 content_type='application/json')
        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.json["success"])
        self.assertEqual(response.json["data"]["id"], "sos1")

    @patch('sos_service.create_sos', side_effect=ValueError("Thiếu thông tin bắt buộc"))
    def test_submit_sos_request_invalid(self, mock_create):
        data = {"name": "A"}
        response = self.app.post('/api/hotelconnect/v1/sos',
                                 data=json.dumps(data),
                                 content_type='application/json')
        self.assertEqual(response.status_code, 400)
        self.assertIn("error", response.json)

    @patch('sos_service.read_sos', return_value=[{"id": "sos1", "name": "A"}])
    def test_get_sos_requests_active(self, mock_read):
        response = self.app.get('/api/hotelconnect/v1/sos')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json), 1)
        self.assertEqual(response.json[0]["id"], "sos1")

    @patch('sos_service.read_sos', return_value=[{"id": "sos1", "name": "A"}])
    @patch('sos_service.read_sos_history', return_value=[{"id": "sos2", "name": "B"}])
    def test_get_sos_requests_with_history(self, mock_read_hist, mock_read):
        response = self.app.get('/api/hotelconnect/v1/sos?include_history=true')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json), 2)
        self.assertEqual(response.json[0]["id"], "sos1")
        self.assertEqual(response.json[1]["id"], "sos2")

    @patch('sos_service.update_sos_status', return_value={"id": "sos1", "status": "resolved"})
    def test_update_sos_request_success(self, mock_update):
        data = {"status": "resolved"}
        response = self.app.put('/api/hotelconnect/v1/sos/sos1',
                                data=json.dumps(data),
                                content_type='application/json')
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json["success"])
        self.assertEqual(response.json["data"]["status"], "resolved")

    @patch('sos_service.update_sos_status', side_effect=KeyError("Không tìm thấy"))
    def test_update_sos_request_not_found(self, mock_update):
        data = {"status": "resolved"}
        response = self.app.put('/api/hotelconnect/v1/sos/nonexistent',
                                data=json.dumps(data),
                                content_type='application/json')
        self.assertEqual(response.status_code, 404)

    @patch('sos_service.delete_sos', return_value=True)
    def test_delete_sos_request_success(self, mock_delete):
        response = self.app.delete('/api/hotelconnect/v1/sos/sos1')
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json["success"])

    @patch('sos_service.get_sos_image_path')
    def test_get_sos_image_success(self, mock_get_path):
        mock_get_path.return_value = (os.path.abspath(__file__), 'image/webp')
        response = self.app.get('/api/hotelconnect/v1/sos/sos1/image')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.mimetype, 'image/webp')

    @patch('sos_service.get_sos_image_path', return_value=(None, None))
    def test_get_sos_image_not_found(self, mock_get_path):
        response = self.app.get('/api/hotelconnect/v1/sos/sos1/image')
        self.assertEqual(response.status_code, 404)

    @patch('sos_service.get_sos_comments', return_value=[{"id": "c1", "message": "hello"}])
    def test_get_sos_comments_success(self, mock_get):
        response = self.app.get('/api/hotelconnect/v1/sos/sos1/comments')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json), 1)

    @patch('sos_service.add_sos_comment', return_value={"id": "c1", "message": "hello"})
    def test_add_sos_comment_success(self, mock_add):
        data = {"message": "hello", "deviceId": "dev1"}
        response = self.app.post('/api/hotelconnect/v1/sos/sos1/comments?is_admin=true',
                                 data=json.dumps(data),
                                 content_type='application/json')
        self.assertEqual(response.status_code, 201)

if __name__ == "__main__":
    unittest.main()
