"""
Centralized constants for hotel_connect project.
- Config directory
- Field names
- Hotel status values (see .gemini/HOTEL_STATUS.md)
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# --- Config directory and file paths (imported from hotel_config) ---
from hotel_config import HOTEL_CONFIG_DIR, HOTEL_SCHEMA_FILE_PATH, HOTEL_REQUESTS_FILE, HOTEL_REPORTS_FILE, CACHE_VERSION_FILE
# hotel_constants.py

# --- Field name constants ---
class HotelField:
    # API response key constants
    MESSAGE = "message"
    ERROR = "error"
    SUCCESS = "success"
    DATA = "data"
    NAME = "name"
    HOTEL_NAME = "hotelName"
    HOTEL_ID = "hotelId"
    REASON = "reason"
    DETAILS = "details"
    REPORTER_IP = "reporterIp"
    ID = "id"
    LAT = "lat"
    LNG = "lng"
    LOCATION = "locationName"
    LOCATION_ID = "locationId"
    FILE_PATH_ID = "filePathId"
    CREATED_AT = "createdAt"
    UPDATED_AT = "updatedAt"
    REPORT_ID = "reportId"
    STATUS = "status"
    REPORTED_AT = "reportedAt"
    RADIUS = "radius"



# --- Lightweight fields for bulk loading (không có image, description) ---
LIGHTWEIGHT_FIELDS = [
    "id", "name", "type", "address", "phone", "website", 
    "locationId", "status", "rating", "createdAt", "updatedAt", 
    "lat", "lng", "thumbnail"
]

# --- Hotel status enum ---
from enum import Enum

class HotelStatus(str, Enum):
	PENDING = "pending"
	APPROVED = "approved"
	REJECTED = "rejected"
	INACTIVE = "inactive"
	REPORTED = "reported"
	PENDING_REVIEW = "pending_review"
