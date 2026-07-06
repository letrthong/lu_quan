import sys
import os
os.environ['HOTEL_DISABLE_CACHE_WARMUP'] = 'true'
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from hotel_constants import HotelField, HotelStatus
import unittest
from unittest.mock import patch, mock_open, MagicMock
import json
from datetime import datetime

# Import các module cần test
import hotel_request_report_service as req_report_service
import hotel_schema_service as schema_service
import json_utils
import geo_utils
import hotel_helpers

class TestJsonUtils(unittest.TestCase):
    def test_read_json_file_not_exist(self):
        with patch('os.path.exists', return_value=False):
            self.assertEqual(json_utils.read_json_file('notfound.json'), [])

    def test_read_json_file_invalid_json(self):
        m = mock_open(read_data='invalid json')
        with patch('os.path.exists', return_value=True), \
             patch('builtins.open', m):
            self.assertEqual(json_utils.read_json_file('bad.json'), [])

    def test_read_json_file_valid(self):
        m = mock_open(read_data='[1,2,3]')
        with patch('os.path.exists', return_value=True), \
             patch('builtins.open', m):
            self.assertEqual(json_utils.read_json_file('ok.json'), [1,2,3])

    def test_write_json_file(self):
        m = mock_open()
        with patch('os.makedirs'), patch('builtins.open', m):
            json_utils.write_json_file('file.json', [1,2,3])
            m().write.assert_called()

class TestHotelSchemaService(unittest.TestCase):
    @patch('hotel_schema_service.read_json_file', return_value=[{HotelField.ID: "1"}])
    def test_read_schema(self, mock_read):
        self.assertEqual(schema_service.read_schema(), [{HotelField.ID: "1"}])

    @patch('hotel_schema_service.write_json_file')
    def test_write_schema(self, mock_write):
        schema_service.write_schema([{HotelField.ID: "2"}])
        mock_write.assert_called()

    def test_create_schema_item(self):
        data = {
            HotelField.FILE_PATH_ID: "f.json",
            HotelField.LOCATION: "Loc",
            HotelField.LAT: 10.0,
            HotelField.LNG: 20.0
        }
        item = schema_service.create_schema_item(data)
        self.assertIn(HotelField.ID, item)
        self.assertEqual(item[HotelField.FILE_PATH_ID], "f.json")
        self.assertEqual(item[HotelField.LOCATION], "Loc")
        self.assertEqual(item[HotelField.LAT], 10.0)
        self.assertEqual(item[HotelField.LNG], 20.0)
        self.assertIn(HotelField.CREATED_AT, item)
        self.assertIn(HotelField.UPDATED_AT, item)

    def test_update_schema_item(self):
        item = {
            HotelField.FILE_PATH_ID: "a",
            HotelField.LOCATION: "b",
            HotelField.LAT: 1.0,
            HotelField.LNG: 2.0,
            HotelField.UPDATED_AT: "x"
        }
        req = {
            HotelField.FILE_PATH_ID: "c",
            HotelField.LOCATION: "d",
            HotelField.LAT: 3.0,
            HotelField.LNG: 4.0
        }
        updated = schema_service.update_schema_item(item, req)
        self.assertEqual(updated[HotelField.FILE_PATH_ID], "a")
        self.assertEqual(updated[HotelField.LOCATION], "d")
        self.assertEqual(updated[HotelField.LAT], 3.0)
        self.assertEqual(updated[HotelField.LNG], 4.0)
        self.assertNotEqual(updated[HotelField.UPDATED_AT], "x")

    def test_delete_schema_item(self):
        data = [{HotelField.ID: "1"}, {HotelField.ID: "2"}]
        new_data = schema_service.delete_schema_item(data, "1")
        self.assertEqual(len(new_data), 1)
        self.assertEqual(new_data[0][HotelField.ID], "2")

class TestHotelRequestReportService(unittest.TestCase):
    @patch('hotel_request_report_service.read_json_file', return_value=[{HotelField.ID: "a"}])
    def test_read_requests(self, mock_read):
        self.assertEqual(req_report_service.read_requests(), [{HotelField.ID: "a"}])

    @patch('hotel_request_report_service.write_json_file')
    def test_write_requests(self, mock_write):
        req_report_service.write_requests([{HotelField.ID: "b"}])
        mock_write.assert_called()

    @patch('hotel_request_report_service.read_json_file', return_value=[{HotelField.ID: "r"}])
    def test_read_reports(self, mock_read):
        self.assertEqual(req_report_service.read_reports(), [{HotelField.ID: "r"}])

    @patch('hotel_request_report_service.write_json_file')
    def test_write_reports(self, mock_write):
        req_report_service.write_reports([{HotelField.ID: "c"}])
        mock_write.assert_called()

    def test_create_hotel_request(self):
        req = {"foo": "bar"}
        result = req_report_service.create_hotel_request(req)
        self.assertIn(HotelField.CREATED_AT, result)
        self.assertIn(HotelField.UPDATED_AT, result)
        self.assertEqual(result["foo"], "bar")

    def test_create_hotel_report(self):
        req = {HotelField.HOTEL_ID: "h1", HotelField.REASON: "bad", HotelField.DETAILS: ""}
        report = req_report_service.create_hotel_report(req, "1.2.3.4")
        self.assertIn(HotelField.REPORT_ID, report)
        self.assertEqual(report[HotelField.HOTEL_ID], "h1")
        self.assertEqual(report[HotelField.REASON], "bad")
        self.assertEqual(report[HotelField.REPORTER_IP], "1.2.3.4")
        self.assertEqual(report[HotelField.STATUS], HotelStatus.PENDING)
        self.assertIn(HotelField.REPORTED_AT, report)

class TestGeoUtils(unittest.TestCase):
    def test_haversine_same_point(self):
        distance = geo_utils.haversine(21.0285, 105.8542, 21.0285, 105.8542)
        self.assertAlmostEqual(distance, 0.0, places=4)

    def test_haversine_different_points(self):
        # Hanoi (21.0285, 105.8542) to Ho Chi Minh City (10.8231, 106.6297)
        # Expected distance is around 1160 km
        distance = geo_utils.haversine(21.0285, 105.8542, 10.8231, 106.6297)
        self.assertTrue(1100.0 < distance < 1200.0)

class TestHotelHelpers(unittest.TestCase):
    def test_validate_hotel_request_success(self):
        req_data = {
            HotelField.LAT: 10.0,
            HotelField.LNG: 20.0,
            HotelField.LOCATION_ID: "loc1"
        }
        valid, error = hotel_helpers.validate_hotel_request(req_data)
        self.assertTrue(valid)
        self.assertIsNone(error)

    def test_validate_hotel_request_missing_fields(self):
        # Missing location_id
        req_data1 = {
            HotelField.LAT: 10.0,
            HotelField.LNG: 20.0
        }
        valid, error = hotel_helpers.validate_hotel_request(req_data1)
        self.assertFalse(valid)
        self.assertIn("Thiếu thông tin", error)

        # Invalid type for lat
        req_data2 = {
            HotelField.LAT: "invalid",
            HotelField.LNG: 20.0,
            HotelField.LOCATION_ID: "loc1"
        }
        valid, error = hotel_helpers.validate_hotel_request(req_data2)
        self.assertFalse(valid)
        self.assertIn("Thiếu thông tin", error)

    def test_update_status(self):
        hotel = {
            HotelField.STATUS: "pending",
            HotelField.UPDATED_AT: "old_date"
        }
        updated = hotel_helpers.update_status(hotel, HotelStatus.APPROVED)
        self.assertEqual(updated[HotelField.STATUS], HotelStatus.APPROVED.value)
        self.assertNotEqual(updated[HotelField.UPDATED_AT], "old_date")

    def test_get_hotel_file_path(self):
        schemas = [
            {HotelField.LOCATION: "CityA", HotelField.FILE_PATH_ID: "a.json"},
            {HotelField.LOCATION: "CityB", HotelField.FILE_PATH_ID: "b.json"}
        ]
        path = hotel_helpers.get_hotel_file_path("CityA", schemas)
        self.assertIn("a.json", path)

        path_none = hotel_helpers.get_hotel_file_path("CityC", schemas)
        self.assertIsNone(path_none)

if __name__ == "__main__":
    unittest.main()
