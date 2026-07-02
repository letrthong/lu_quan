import unittest
import json
from unittest.mock import patch
from flask import Flask
from services import app
from hotel_constants import HotelField

class HotelConnectServiceTestCase(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True

    @patch('services.read_schema', return_value=[])
    def test_get_schema_empty(self, mock_read_schema):
        response = self.app.get('/api/hotelconnect/v1/schema')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json, [])

    @patch('services.write_schema')
    @patch('services.read_schema', return_value=[])
    def test_add_schema(self, mock_read_schema, mock_write_schema):
        data = {
            HotelField.FILE_PATH_ID: "test.json",
            HotelField.LOCATION: "Test City",
            HotelField.LAT: 10.0,
            HotelField.LNG: 20.0
        }
        response = self.app.post('/api/hotelconnect/v1/schema',
                                 data=json.dumps(data),
                                 content_type='application/json')
        self.assertEqual(response.status_code, 201)
        self.assertIn('data', response.json)
        self.assertEqual(response.json['data'][HotelField.LOCATION], "Test City")

    @patch('services.read_schema', return_value=[{
        HotelField.ID: "1",
        HotelField.FILE_PATH_ID: "a.json",
        HotelField.LOCATION: "A",
        HotelField.LAT: 10.0,
        HotelField.LNG: 20.0,
        HotelField.RADIUS: 10.0
    }])
    @patch('services.write_schema')
    def test_update_schema(self, mock_write_schema, mock_read_schema):
        data = {
            HotelField.FILE_PATH_ID: "b.json",
            HotelField.LOCATION: "B",
            HotelField.LAT: 10.0,
            HotelField.LNG: 20.0,
            HotelField.RADIUS: 15.0
        }
        response = self.app.put('/api/hotelconnect/v1/schema/1',
                                data=json.dumps(data),
                                content_type='application/json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json['data'][HotelField.LOCATION], "B")

    @patch('services.read_schema', return_value=[{
        HotelField.ID: "1",
        HotelField.FILE_PATH_ID: "a.json",
        HotelField.LOCATION: "A",
        HotelField.LAT: 10.0,
        HotelField.LNG: 20.0
    }])
    @patch('services.write_schema')
    def test_delete_schema(self, mock_write_schema, mock_read_schema):
        response = self.app.delete('/api/hotelconnect/v1/schema/1')
        self.assertEqual(response.status_code, 200)
        self.assertIn('message', response.json)

if __name__ == '__main__':
    unittest.main()
