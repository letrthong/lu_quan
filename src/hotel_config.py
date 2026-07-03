import os
from pathlib import Path

# Root directory of the workspace
ROOT_DIR = Path(__file__).resolve().parent.parent

# Source directory
SRC_DIR = ROOT_DIR / 'src'

 
HOTEL_CONFIG_DIR = "/app/config/hotel_connect"
HOTEL_SCHEMA_FILE_PATH = f"{HOTEL_CONFIG_DIR}/hotel_schema.json"


# Data file names
HOTEL_REQUESTS_FILE = "hotel_requests.json"
HOTEL_REPORTS_FILE = "hotel_reports.json"
