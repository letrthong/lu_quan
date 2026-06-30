"""
Centralized constants for hotel_connect project.
- Config directory
- Field names
- Hotel status values (see .gemini/HOTEL_STATUS.md)
"""


# --- Config directory and file paths (không hardcode) ---
CONFIG_DIR = "/app/config/hotel_connect"
HOTEL_SCHEMA_FILE_PATH = f"{CONFIG_DIR}/hotel_schema.json"

# --- Data file names ---
HOTEL_REQUESTS_FILE = "hotel_requests.json"
HOTEL_REPORTS_FILE = "hotel_reports.json"
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



# --- Hotel status enum ---
from enum import Enum

class HotelStatus(str, Enum):
	PENDING = "pending"
	APPROVED = "approved"
	REJECTED = "rejected"
	INACTIVE = "inactive"
	REPORTED = "reported"
	PENDING_REVIEW = "pending_review"
