import os
from pathlib import Path

# Root directory of the workspace
ROOT_DIR = Path(__file__).resolve().parent.parent

# Source directory
SRC_DIR = ROOT_DIR / 'src'

# Root Database / Config directory (can be overridden by environment variable)
CONFIG_DIR = Path(os.environ.get('CONFIG_DIR', ROOT_DIR / 'config' / 'hotel_connect'))

# Schema file path
HOTEL_SCHEMA_FILE_PATH = CONFIG_DIR / 'hotel_schema.json'

# Data file names
HOTEL_REQUESTS_FILE = "hotel_requests.json"
HOTEL_REPORTS_FILE = "hotel_reports.json"
