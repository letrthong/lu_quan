import os
import json

from datetime import datetime
from .json_utils import read_json_file, write_json_file
from .hotel_constants import HotelField, HotelStatus, HOTEL_CONFIG_DIR, HOTEL_REQUESTS_FILE, HOTEL_REPORTS_FILE

HOTEL_REQUESTS_FILE_PATH = os.path.join(HOTEL_CONFIG_DIR, HOTEL_REQUESTS_FILE)
HOTEL_REPORTS_FILE_PATH = os.path.join(HOTEL_CONFIG_DIR, HOTEL_REPORTS_FILE)

def read_requests():
    return read_json_file(HOTEL_REQUESTS_FILE_PATH)

def write_requests(data):
    write_json_file(HOTEL_REQUESTS_FILE_PATH, data)

def read_reports():
    return read_json_file(HOTEL_REPORTS_FILE_PATH)

def write_reports(data):
    write_json_file(HOTEL_REPORTS_FILE_PATH, data)

def create_hotel_request(req_data):
    req = dict(req_data)
    req[HotelField.CREATED_AT] = datetime.now().strftime("%Y-%m-%d")
    req[HotelField.UPDATED_AT] = datetime.now().strftime("%Y-%m-%d")
    return req

def create_hotel_report(req_data, reporter_ip):
    import uuid
    from datetime import timezone
    report_id = str(uuid.uuid4())
    now_iso = datetime.now(timezone.utc).isoformat()
    return {
        HotelField.ID: report_id,
        HotelField.REPORT_ID: report_id,
        HotelField.HOTEL_ID: req_data.get(HotelField.HOTEL_ID),
        HotelField.REASON: req_data.get(HotelField.REASON),
        HotelField.DETAILS: req_data.get(HotelField.DETAILS, ""),
        HotelField.CREATED_AT: now_iso,
        HotelField.REPORTED_AT: now_iso,
        HotelField.REPORTER_IP: reporter_ip,
        HotelField.STATUS: HotelStatus.PENDING.value
    }
