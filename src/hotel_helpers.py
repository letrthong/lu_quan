"""
hotel_helpers.py
Business logic helpers for hotel_connect Flask app.
- File read/write
- Validation
- Status changes
"""
import os
import json
from datetime import datetime
from threading import Lock
from .json_utils import read_json_file, write_json_file
from .hotel_constants import HOTEL_CONFIG_DIR, HotelField, HotelStatus, HOTEL_REQUESTS_FILE, HOTEL_REPORTS_FILE

# Locks for thread safety
schema_lock = Lock()
requests_lock = Lock()
reports_lock = Lock()

# --- File helpers ---
def get_hotel_file_path(location_name, schemas):
    for schema in schemas:
        if schema.get(HotelField.LOCATION) == location_name:
            file_path_id = schema.get(HotelField.FILE_PATH_ID)
            if not file_path_id:
                return None
            return os.path.join(HOTEL_CONFIG_DIR, file_path_id)
    return None

def read_requests():
    path = os.path.join(HOTEL_CONFIG_DIR, HOTEL_REQUESTS_FILE)
    if not os.path.exists(path):
        return []
    with open(path, 'r', encoding='utf-8') as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return []

def write_requests(data):
    path = os.path.join(HOTEL_CONFIG_DIR, HOTEL_REQUESTS_FILE)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=4)

def read_reports():
    path = os.path.join(HOTEL_CONFIG_DIR, HOTEL_REPORTS_FILE)
    if not os.path.exists(path):
        return []
    with open(path, 'r', encoding='utf-8') as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return []

def write_reports(data):
    path = os.path.join(HOTEL_CONFIG_DIR, HOTEL_REPORTS_FILE)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=4)

# --- Validation helpers ---
def validate_hotel_request(req_data):
    lat = req_data.get(HotelField.LAT)
    lng = req_data.get(HotelField.LNG)
    location_id = req_data.get(HotelField.LOCATION_ID)
    if not all([isinstance(lat, (int, float)), isinstance(lng, (int, float)), location_id]):
        return False, f"Thiếu thông tin {HotelField.LAT}, {HotelField.LNG} hoặc {HotelField.LOCATION_ID}"
    return True, None

def update_status(hotel, status: HotelStatus):
    hotel[HotelField.STATUS] = status.value
    hotel[HotelField.UPDATED_AT] = datetime.now().strftime("%Y-%m-%d")
    return hotel

def _find_hotel_details_by_id(hotel_id):
    """Find hotel details by ID across all hotel files."""
    from .hotel_schema_service import read_schema
    schemas = read_schema()
    for schema in schemas:
        file_path_id = schema.get(HotelField.FILE_PATH_ID)
        if not file_path_id:
            continue
        file_path = os.path.join(HOTEL_CONFIG_DIR, file_path_id)
        if os.path.exists(file_path):
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    hotels = json.load(f)
                for hotel in hotels:
                    if hotel.get(HotelField.ID) == hotel_id:
                        hotel[HotelField.LOCATION] = schema.get(HotelField.LOCATION, "Không rõ")
                        return hotel
            except Exception:
                pass
    return None
