
import os
import json
import uuid
from datetime import datetime
from json_utils import read_json_file, write_json_file

from hotel_constants import HotelField, HOTEL_SCHEMA_FILE_PATH

def read_schema():
    return read_json_file(HOTEL_SCHEMA_FILE_PATH)

def write_schema(data):
    write_json_file(HOTEL_SCHEMA_FILE_PATH, data)

def create_schema_item(req_data):
    if not isinstance(req_data, dict):
        raise Exception("Input data must be a dict")
    if not req_data.get(HotelField.FILE_PATH_ID) or not req_data.get(HotelField.LOCATION) or req_data.get(HotelField.LAT) is None or req_data.get(HotelField.LNG) is None:
        raise Exception(f"Missing required fields: {HotelField.FILE_PATH_ID}, {HotelField.LOCATION}, {HotelField.LAT}, and {HotelField.LNG}")
    return {
        HotelField.ID: str(uuid.uuid4()),
        HotelField.FILE_PATH_ID: req_data[HotelField.FILE_PATH_ID],
        HotelField.LOCATION: req_data[HotelField.LOCATION],
        HotelField.LAT: req_data[HotelField.LAT],
        HotelField.LNG: req_data[HotelField.LNG],
        HotelField.RADIUS  : req_data.get(HotelField.RADIUS, 10),
        HotelField.CREATED_AT: datetime.now().strftime("%Y-%m-%d"),
        HotelField.UPDATED_AT: datetime.now().strftime("%Y-%m-%d")
    }

def update_schema_item(item, req_data):
    if not isinstance(req_data, dict):
        raise Exception("Input data must be a dict")
    # Frontend sends locationName, lat, lng for updates.
    if not req_data.get(HotelField.LOCATION) or req_data.get(HotelField.LAT) is None or req_data.get(HotelField.LNG) is None:
        raise Exception(f"Missing required fields: {HotelField.LOCATION}, {HotelField.LAT}, and {HotelField.LNG}")

    # Update fields from request data
    item[HotelField.LOCATION] = req_data[HotelField.LOCATION]
    item[HotelField.LAT] = req_data[HotelField.LAT]
    item[HotelField.LNG] = req_data[HotelField.LNG]
    if HotelField.RADIUS in req_data:
        item[HotelField.RADIUS] = req_data[HotelField.RADIUS]
    item[HotelField.UPDATED_AT] = datetime.now().strftime("%Y-%m-%d")
    return item

def delete_schema_item(data, item_id):
    new_data = [item for item in data if item.get(HotelField.ID) != item_id]
    return new_data
