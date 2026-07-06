import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import unittest
import json
from unittest.mock import patch, MagicMock
from app import app
from hotel_constants import HotelField

class HotelConnectApiTestCase(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True

    # --- SCHEMA API TESTS (đã có ở test_service.py, chỉ ví dụ) ---
    @patch('hotel_schema_service.read_schema', return_value=[])
    def test_get_schema_empty(self, mock_read_schema):
        response = self.app.get('/api/hotelconnect/v1/schema')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json, [])

    # --- HOTEL REQUEST API TESTS ---
    @patch('hotel_schema_service.read_schema', return_value=[{HotelField.LOCATION: "Test City", HotelField.LAT: 10.0, HotelField.LNG: 20.0, HotelField.FILE_PATH_ID: "test.json", "id": "loc1", HotelField.RADIUS: 10.0}])
    @patch('hotel_helpers.read_requests', return_value=[])
    @patch('hotel_helpers.write_requests')
    def test_submit_hotel_request_success(self, mock_write, mock_read_req, mock_read_schema):
        data = {HotelField.LAT: 10.0, HotelField.LNG: 20.0, HotelField.LOCATION: "Test City", HotelField.ID: "req1", HotelField.LOCATION_ID: "loc1"}
        response = self.app.post('/api/hotelconnect/v1/hotels/request',
                                 data=json.dumps(data),
                                 content_type='application/json')
        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.json["success"])

    @patch('hotel_schema_service.read_schema', return_value=[{HotelField.LOCATION: "Test City", HotelField.LAT: 10.0, HotelField.LNG: 20.0, HotelField.FILE_PATH_ID: "test.json", "id": "loc1", HotelField.RADIUS: 10.0}])
    def test_submit_hotel_request_missing_data(self, mock_read_schema):
        data = {HotelField.LAT: 10.0, HotelField.LOCATION: "Test City"}  # thiếu lng
        response = self.app.post('/api/hotelconnect/v1/hotels/request',
                                 data=json.dumps(data),
                                 content_type='application/json')
        self.assertEqual(response.status_code, 400)
        self.assertIn("error", response.json)

    @patch('hotel_schema_service.read_schema', return_value=[])
    def test_submit_hotel_request_no_area(self, mock_read_schema):
        data = {HotelField.LAT: 10.0, HotelField.LNG: 20.0, HotelField.LOCATION: "Unknown", HotelField.LOCATION_ID: "nonexistent"}
        response = self.app.post('/api/hotelconnect/v1/hotels/request',
                                 data=json.dumps(data),
                                 content_type='application/json')
        self.assertEqual(response.status_code, 400)
        self.assertIn("error", response.json)

    @patch('hotel_schema_service.read_schema', return_value=[{HotelField.LOCATION: "Test City", HotelField.LAT: 10.0, HotelField.LNG: 20.0, HotelField.FILE_PATH_ID: "test.json", "id": "loc1", HotelField.RADIUS: 10.0}])
    def test_submit_hotel_request_too_far(self, mock_read_schema):
        data = {HotelField.LAT: 50.0, HotelField.LNG: 50.0, HotelField.LOCATION: "Test City", HotelField.LOCATION_ID: "loc1"}
        response = self.app.post('/api/hotelconnect/v1/hotels/request',
                                 data=json.dumps(data),
                                 content_type='application/json')
        self.assertEqual(response.status_code, 400)
        self.assertIn("error", response.json)

    # --- GET HOTEL REQUESTS ---
    @patch('hotel_helpers.read_requests', return_value=[{HotelField.ID: "req1"}])
    def test_get_hotel_requests(self, mock_read):
        response = self.app.get('/api/hotelconnect/v1/hotels/request')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json, [{HotelField.ID: "req1"}])

    # --- APPROVE/REJECT ---
    @patch('hotel_schema_service.read_schema', return_value=[{HotelField.LOCATION: "Test City", HotelField.LAT: 10.0, HotelField.LNG: 20.0, HotelField.FILE_PATH_ID: "test.json", "id": "loc1"}])
    @patch('hotel_helpers.read_requests', return_value=[{HotelField.ID: "req1", HotelField.LOCATION: "Test City", HotelField.LOCATION_ID: "loc1"}])
    @patch('hotel_helpers.get_hotel_file_path', return_value="/tmp/test.json")
    @patch('hotel_helpers.write_requests')
    @patch('os.path.exists', return_value=False)
    @patch('builtins.open', new_callable=MagicMock)
    def test_approve_hotel_request_success(self, mock_open, mock_exists, mock_write, mock_get_file, mock_read, mock_read_schema):
        response = self.app.post('/api/hotelconnect/v1/requests/req1/approve')
        self.assertEqual(response.status_code, 200)
        self.assertIn("success", response.json)

    @patch('hotel_helpers.read_requests', return_value=[])
    def test_approve_hotel_request_not_found(self, mock_read):
        response = self.app.post('/api/hotelconnect/v1/requests/req1/approve')
        self.assertEqual(response.status_code, 404)
        self.assertIn("error", response.json)

    @patch('hotel_helpers.read_requests', return_value=[{HotelField.ID: "req1"}])
    def test_reject_hotel_request_success(self, mock_read):
        with patch('hotel_helpers.write_requests') as mock_write:
            response = self.app.post('/api/hotelconnect/v1/requests/req1/reject')
            self.assertEqual(response.status_code, 200)
            self.assertIn("success", response.json)

    @patch('hotel_helpers.read_requests', return_value=[])
    def test_reject_hotel_request_not_found(self, mock_read):
        response = self.app.post('/api/hotelconnect/v1/requests/req1/reject')
        self.assertEqual(response.status_code, 404)
        self.assertIn("error", response.json)

    # --- REPORT API (GET only, POST cần bổ sung nếu có route) ---
    @patch('hotel_helpers.read_reports', return_value=[{"hotelId": "h1", "reportedAt": "2024-01-01T00:00:00Z"}])
    @patch('hotel_helpers._find_hotel_details_by_id', return_value={"name": "Hotel1", "locationName": "Test City"})
    def test_get_hotel_reports(self, mock_find, mock_read):
        response = self.app.get('/api/hotelconnect/v1/hotels/reports')
        self.assertEqual(response.status_code, 200)
        self.assertTrue(isinstance(response.json, list))
        self.assertEqual(response.json[0][HotelField.HOTEL_NAME], "Hotel1")
        self.assertEqual(response.json[0][HotelField.LOCATION], "Test City")

if __name__ == "__main__":
    unittest.main()
