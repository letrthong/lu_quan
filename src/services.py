
from operator import index
import os
import json
from json_utils import read_json_file, write_json_file
from hotel_schema_service import read_schema, write_schema, create_schema_item, update_schema_item, delete_schema_item
import logging
import sys
import os
import threading
from flask import Flask, render_template, jsonify, request, abort, send_from_directory
from flask_cors import cross_origin  # Import đúng tên thư viện
import uuid
from math import radians, sin, cos, sqrt, atan2
from geo_utils import haversine
from datetime import datetime, timezone

# Import all constants from hotel_constants.py
from hotel_constants import CONFIG_DIR, HotelField, HotelStatus
from hotel_helpers import get_hotel_file_path, read_requests, write_requests, read_reports, write_reports, validate_hotel_request, update_status

# Cấu hình logging hiển thị ra terminal
logging.basicConfig(level=logging.INFO)
sys.stdout.reconfigure(line_buffering=True)

app = Flask(__name__, template_folder='/app')


# Đảm bảo đường dẫn này đúng với cấu trúc thư mục của bạn
template_dir = "/app/"
template_dir_base = "./"
os.makedirs(CONFIG_DIR, exist_ok=True)



## All constants are now imported from hotel_constants.py


# --- API Quản lý hotel_schema.json ---
schema_lock = threading.Lock()


@app.route('/api/hotelconnect/v1/schema', methods=['GET'])
@cross_origin()
def get_schema():
    with schema_lock:
        data = read_schema()
    return jsonify(data)

@app.route('/api/hotelconnect/v1/schema', methods=['POST'])
@cross_origin()
def add_schema():
    req_data = request.json
    if not req_data:
        return jsonify({HotelField.ERROR: "Dữ liệu không hợp lệ"}), 400
    try:
        new_item = create_schema_item(req_data)
    except Exception as e:
        return jsonify({HotelField.ERROR: str(e)}), 400
    with schema_lock:
        data = read_schema()
        data.append(new_item)
        data.sort(key=lambda x: str(x.get(HotelField.LOCATION, '')).lower())
        write_schema(data)
    return jsonify({HotelField.MESSAGE: "Thêm mới thành công", HotelField.DATA: new_item}), 201

@app.route('/api/hotelconnect/v1/schema/<item_id>', methods=['PUT'])
@cross_origin()
def update_schema(item_id):
    req_data = request.json
    if not req_data:
        return jsonify({HotelField.ERROR: "Dữ liệu không hợp lệ"}), 400
    with schema_lock:
        data = read_schema()
        for item in data:
            if item.get("id") == item_id:
                current_radius = float(item.get("radius", 10))
                new_radius = float(req_data.get("radius", 10))
                if new_radius < current_radius:
                    return jsonify({HotelField.ERROR: "Không thể giảm bán kính nhỏ hơn mức hiện tại"}), 400
                
                try:
                    updated = update_schema_item(item, req_data)
                except Exception as e:
                    return jsonify({HotelField.ERROR: str(e)}), 400
                write_schema(data)
                return jsonify({HotelField.MESSAGE: "Cập nhật thành công", HotelField.DATA: updated}), 200
    return jsonify({HotelField.ERROR: "Không tìm thấy item"}), 404

@app.route('/api/hotelconnect/v1/schema/<item_id>', methods=['DELETE'])
@cross_origin()
def delete_schema(item_id):
    with schema_lock:
        data = read_schema()
        new_data = delete_schema_item(data, item_id)
        if len(data) == len(new_data):
            return jsonify({HotelField.ERROR: "Không tìm thấy item"}), 404
        write_schema(new_data)
        return jsonify({HotelField.MESSAGE: "Xóa thành công"}), 200

# --- API Quản lý Yêu cầu Đăng ký Khách sạn ---
requests_lock = threading.Lock()

 
@app.route('/api/hotelconnect/v1/hotels/request', methods=['POST'])
@cross_origin()
def submit_hotel_request():
    req_data = request.json
    if not req_data:
        return jsonify({HotelField.ERROR: "Dữ liệu không hợp lệ"}), 400
    
    # --- START VALIDATION: Kiểm tra khoảng cách vị trí đăng ký so với trung tâm khu vực ---
    hotel_lat = req_data.get(HotelField.LAT)
    hotel_lng = req_data.get(HotelField.LNG)
    location_id = req_data.get(HotelField.LOCATION_ID)

    # Đảm bảo có đủ thông tin vị trí
    valid, error = validate_hotel_request(req_data)
    if not valid:
        return jsonify({HotelField.ERROR: error}), 400

    # Lấy tọa độ trung tâm của khu vực từ schema
    with schema_lock:
        schemas = read_schema()
    area_center = next((s for s in schemas if s.get("id") == location_id), None)

    # Kiểm tra xem khu vực có tồn tại và có tọa độ không
    if not area_center or HotelField.LAT not in area_center or HotelField.LNG not in area_center:
        return jsonify({HotelField.ERROR: f"Không tìm thấy thông tin vị trí cho khu vực (ID: {location_id})"}), 400

    area_lat = area_center[HotelField.LAT]
    area_lng = area_center[HotelField.LNG]
    location_name = area_center.get(HotelField.LOCATION, "Không rõ")
    area_radius = float(area_center.get("radius", 10))

    # Tính khoảng cách bằng công thức Haversine
    distance = haversine(hotel_lat, hotel_lng, area_lat, area_lng)

    # Áp dụng quy tắc: khoảng cách không quá bán kính đã cấu hình (mặc định 10km)
    if distance > area_radius:
        error_message = f"Vị trí khách sạn phải cách trung tâm {location_name} không quá {area_radius:g}km. Khoảng cách hiện tại là {distance:.2f}km."
        return jsonify({HotelField.ERROR: error_message}), 400
    # --- END VALIDATION ---

    with requests_lock:
        data = read_requests()
        data.append(req_data)
        write_requests(data)
    return jsonify({HotelField.SUCCESS: True, HotelField.MESSAGE: "Gửi yêu cầu đăng ký thành công", HotelField.DATA: req_data}), 201

@app.route('/api/hotelconnect/v1/hotels/request', methods=['GET'])
@cross_origin()
def get_hotel_requests():
    with requests_lock:
        data = read_requests()
    return jsonify(data)

@app.route('/api/hotelconnect/v1/requests/<request_id>/approve', methods=['POST'])
@cross_origin()
def approve_hotel_request(request_id):
    with requests_lock:
        all_requests = read_requests()
        hotel_to_approve = None
        other_requests = []
        for req in all_requests:
            if req.get('id') == request_id:
                hotel_to_approve = req
            else:
                other_requests.append(req)

        if not hotel_to_approve:
            return jsonify({HotelField.ERROR: "Không tìm thấy yêu cầu"}), 404

        location_id = hotel_to_approve.get(HotelField.LOCATION_ID)
        if not location_id:
            return jsonify({HotelField.ERROR: f"Yêu cầu thiếu thông tin {HotelField.LOCATION_ID}"}), 400

        schemas = read_schema()
        target_schema = next((s for s in schemas if s.get("id") == location_id), None)
        target_file = get_hotel_file_path(target_schema.get(HotelField.LOCATION), schemas) if target_schema else None

        if not target_file:
            return jsonify({HotelField.ERROR: f"Không tìm thấy cấu hình cho khu vực ID: {location_id}"}), 400

        # Cập nhật trạng thái và ngày tháng trước khi lưu
        hotel_to_approve = update_status(hotel_to_approve, HotelStatus.APPROVED)
        
        try:
            city_hotels = []
            if os.path.exists(target_file):
                with open(target_file, 'r', encoding='utf-8') as f:
                    city_hotels = json.load(f)
            
            city_hotels.append(hotel_to_approve)
            
            # 1. Sắp xếp danh sách lữ quán đã duyệt trong khu vực theo tên (A-Z)
            city_hotels.sort(key=lambda x: str(x.get(HotelField.NAME, '')).lower())
            
            with open(target_file, 'w', encoding='utf-8') as f:
                json.dump(city_hotels, f, ensure_ascii=False, indent=4)
        except Exception as e:
            return jsonify({HotelField.ERROR: f"Lỗi khi ghi file khách sạn: {str(e)}"}), 500

        # Nếu ghi file thành công, cập nhật lại danh sách chờ duyệt
        
        # 2. Sắp xếp các yêu cầu còn lại trong hàng đợi theo ID khu vực (để gom nhóm theo tỉnh)
        other_requests.sort(key=lambda x: str(x.get(HotelField.LOCATION_ID, '')))
        write_requests(other_requests)

    return jsonify({HotelField.SUCCESS: True, HotelField.MESSAGE: "Phê duyệt khách sạn thành công", HotelField.DATA: hotel_to_approve})

@app.route('/api/hotelconnect/v1/requests/<request_id>/reject', methods=['POST'])
@cross_origin()
def reject_hotel_request(request_id):
    with requests_lock:
        all_requests = read_requests()
        remaining_requests = [req for req in all_requests if req.get('id') != request_id]
        if len(remaining_requests) == len(all_requests):
            return jsonify({HotelField.ERROR: "Không tìm thấy yêu cầu"}), 404
        write_requests(remaining_requests)
    return jsonify({HotelField.SUCCESS: True, HotelField.MESSAGE: "Từ chối yêu cầu thành công"})

@app.route('/api/hotelconnect/v1/requests/<request_id>', methods=['PUT'])
@cross_origin()
def update_hotel_request(request_id):
    req_data = request.json
    if not req_data:
        return jsonify({HotelField.ERROR: "Dữ liệu không hợp lệ"}), 400

    with requests_lock:
        all_requests = read_requests()
        found = False
        updated_request = None
        for i, req in enumerate(all_requests):
            if req.get('id') == request_id:
                for k, v in req_data.items():
                    if k not in [HotelField.ID, HotelField.CREATED_AT]:
                        all_requests[i][k] = v
                all_requests[i][HotelField.UPDATED_AT] = datetime.now().strftime("%Y-%m-%d")
                found = True
                updated_request = all_requests[i]
                break
        if not found:
            return jsonify({HotelField.ERROR: "Không tìm thấy yêu cầu"}), 404
        write_requests(all_requests)

    return jsonify({HotelField.SUCCESS: True, HotelField.MESSAGE: "Cập nhật yêu cầu thành công", HotelField.DATA: updated_request})

# --- API Quản lý Báo cáo Lỗi ---
HOTEL_REPORTS_FILE_PATH = os.path.join(CONFIG_DIR, "hotel_reports.json")
reports_lock = threading.Lock()
history_lock = threading.Lock()

def _find_hotel_details_by_id(hotel_id):
    """Helper to find hotel details (name, locationName) across all hotel files."""
    schemas = read_schema()
    for schema in schemas:
        file_path = os.path.join(CONFIG_DIR, schema.get(HotelField.FILE_PATH_ID))
        if os.path.exists(file_path):
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    hotels_in_file = json.load(f)
                    for hotel in hotels_in_file:
                        if hotel.get(HotelField.ID) == hotel_id:
                            return {
                                "name": hotel.get("name", 'N/A'),
                                HotelField.LOCATION: hotel.get(HotelField.LOCATION, 'N/A')
                            }
            except Exception:
                continue
    return None


## Business logic moved to hotel_helpers.py

@app.route('/api/hotelconnect/v1/hotels/reports', methods=['POST'])
@cross_origin()
def submit_hotel_report():
    req_data = request.json
    if not req_data:
        return jsonify({HotelField.ERROR: "Dữ liệu không hợp lệ"}), 400
        
    hotel_id = req_data.get(HotelField.HOTEL_ID)
    reason = req_data.get(HotelField.REASON)
    
    if not hotel_id or not reason:
        return jsonify({HotelField.ERROR: "Thiếu ID khách sạn hoặc lý do"}), 400
        
    new_report = {
        HotelField.REPORT_ID: str(uuid.uuid4()),
        HotelField.HOTEL_ID: hotel_id,
        HotelField.REASON: reason,
        HotelField.DETAILS: req_data.get(HotelField.DETAILS, ""),
        HotelField.REPORTED_AT: datetime.now(timezone.utc).isoformat(),
        HotelField.REPORTER_IP: request.remote_addr,
        HotelField.STATUS: HotelStatus.PENDING.value
    }
    
    report_count_for_hotel = 0
    with reports_lock:
        reports = read_reports()
        reports.append(new_report)
        write_reports(reports)
        # Đếm tổng số báo cáo cho khách sạn này
        report_count_for_hotel = sum(1 for r in reports if r.get(HotelField.HOTEL_ID) == hotel_id)

    # --- START: Update hotel status to 'reported' ---
    hotel_to_update = None
    target_file = None
    city_hotels = None

    with schema_lock:
        schemas = read_schema()
        # Find hotel in all config files
        for schema in schemas:
            file_path = os.path.join(CONFIG_DIR, schema.get(HotelField.FILE_PATH_ID))
            if os.path.exists(file_path):
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        hotels_in_file = json.load(f)
                    for hotel in hotels_in_file:
                        if hotel.get(HotelField.ID) == hotel_id:
                            hotel_to_update = hotel
                            target_file = file_path
                            city_hotels = hotels_in_file
                            break
                except Exception as e:
                    logging.error(f"Error reading or parsing file {file_path}: {e}")
            if hotel_to_update:
                break
    
    if hotel_to_update and target_file and city_hotels:
        try:
            # Tự động chuyển sang PENDING_REVIEW nếu có từ 5 báo cáo trở lên
            if report_count_for_hotel >= 5:
                hotel_to_update[HotelField.STATUS] = HotelStatus.PENDING_REVIEW.value
            else:
                hotel_to_update[HotelField.STATUS] = HotelStatus.REPORTED.value

            hotel_to_update[HotelField.UPDATED_AT] = datetime.now().strftime("%Y-%m-%d")
            with open(target_file, 'w', encoding='utf-8') as f:
                json.dump(city_hotels, f, ensure_ascii=False, indent=4)
        except Exception as e:
            logging.error(f"Failed to write updated hotel status for {hotel_id} to {target_file}: {e}")
    # --- END: Update hotel status ---
        
    return jsonify({HotelField.SUCCESS: True, HotelField.MESSAGE: "Gửi báo cáo lỗi thành công", HotelField.DATA: new_report}), 201

@app.route('/api/hotelconnect/v1/hotels/reports', methods=['GET'])
@cross_origin()
def get_hotel_reports():
    with reports_lock:
        reports = read_reports()
    
    # Group reports by hotel_id
    grouped_by_hotel = {}
    for report in reports:
        hotel_id = report.get(HotelField.HOTEL_ID)
        if not hotel_id:
            continue
        if hotel_id not in grouped_by_hotel:
            grouped_by_hotel[hotel_id] = []
        grouped_by_hotel[hotel_id].append(report)

    # For each group, find the latest report and add a count
    unique_reports = []
    for hotel_id, hotel_reports in grouped_by_hotel.items():
        if not hotel_reports:
            continue
        
        # Sort reports for this hotel to find the latest
        hotel_reports.sort(key=lambda r: r.get('reportedAt', ''), reverse=True)
        latest_report = hotel_reports[0]
        
        # Add the count
        latest_report['reportCount'] = len(hotel_reports)
        unique_reports.append(latest_report)

    # Enrich the unique reports with hotel names
    with schema_lock:
        for report in unique_reports:
            details = _find_hotel_details_by_id(report.get(HotelField.HOTEL_ID))
            if details:
                report[HotelField.HOTEL_NAME] = details['name']
                report[HotelField.LOCATION] = details.get(HotelField.LOCATION, "Không rõ")
            else:
                report[HotelField.HOTEL_NAME] = f"Không tìm thấy (ID: {report.get(HotelField.HOTEL_ID)})"
                report[HotelField.LOCATION] = "Không rõ"

    # Sort the final list by the date of the latest report
    unique_reports.sort(key=lambda r: r.get('reportedAt', ''), reverse=True)
    return jsonify(unique_reports)

@app.route('/api/hotelconnect/v1/hotels/<hotel_id>/reports', methods=['GET'])
@cross_origin()
def get_all_reports_for_hotel(hotel_id):
    with reports_lock:
        all_reports = read_reports()
    
    hotel_reports = [r for r in all_reports if r.get(HotelField.HOTEL_ID) == hotel_id]
    
    if not hotel_reports:
        return jsonify([])

    # Enrich with hotel name (it will be the same for all)
    with schema_lock:
        details = _find_hotel_details_by_id(hotel_id)
        hotel_name = "Không tìm thấy"
        if details:
            hotel_name = details.get('name', "Không tìm thấy")

    for report in hotel_reports:
        report[HotelField.HOTEL_NAME] = hotel_name

    hotel_reports.sort(key=lambda r: r.get('reportedAt', ''), reverse=True)
    
    return jsonify(hotel_reports)

@app.route('/api/hotelconnect/v1/hotels/reports/<report_id>', methods=['DELETE'])
@cross_origin()
def delete_hotel_report(report_id):
    with reports_lock:
        reports = read_reports()
        new_reports = [r for r in reports if r.get(HotelField.REPORT_ID) != report_id]
        if len(reports) == len(new_reports):
            return jsonify({HotelField.ERROR: "Không tìm thấy báo cáo"}), 404
        write_reports(new_reports)
        
    return jsonify({HotelField.SUCCESS: True, HotelField.MESSAGE: "Xóa báo cáo thành công"})

@app.route('/api/hotelconnect/v1/hotels/status/<status_name>', methods=['GET'])
@cross_origin()
def get_hotels_by_status(status_name):
    valid_statuses = [s.value for s in HotelStatus] + ["deleted"]
    if status_name not in valid_statuses:
        return jsonify({HotelField.ERROR: "Trạng thái không hợp lệ"}), 400

    hotels_with_status = []
    with schema_lock:
        schemas = read_schema()
        for schema in schemas:
            file_path = os.path.join(CONFIG_DIR, schema.get(HotelField.FILE_PATH_ID))
            if os.path.exists(file_path):
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        hotels_in_file = json.load(f)
                    for hotel in hotels_in_file:
                        if hotel.get(HotelField.STATUS) == status_name:
                            hotels_with_status.append(hotel)
                except Exception as e:
                    logging.error(f"Error processing file {file_path} for status '{status_name}': {e}")
    
    hotels_with_status.sort(key=lambda h: h.get(HotelField.UPDATED_AT, ''), reverse=True)
    return jsonify(hotels_with_status)
    
@app.route('/api/hotelconnect/v1/hotels/<hotel_id>/status', methods=['POST'])
@cross_origin()
def set_hotel_status(hotel_id):
    req_data = request.json
    new_status = req_data.get(HotelField.STATUS)
    if not new_status:
        return jsonify({HotelField.ERROR: "Thiếu trạng thái mới"}), 400
    
    valid_statuses = [s.value for s in HotelStatus] + ["deleted"]
    if new_status not in valid_statuses:
        return jsonify({HotelField.ERROR: "Trạng thái không hợp lệ"}), 400

    with schema_lock:
        schemas = read_schema()
        hotel_found, target_file, city_hotels, updated_hotel = False, None, [], None

        for schema in schemas:
            file_path = os.path.join(CONFIG_DIR, schema.get(HotelField.FILE_PATH_ID))
            if os.path.exists(file_path):
                with open(file_path, 'r', encoding='utf-8') as f:
                    hotels = json.load(f)
                for i, h in enumerate(hotels):
                    if h.get(HotelField.ID) == hotel_id:
                        hotel_found, target_file, city_hotels = True, file_path, hotels
                        city_hotels[i][HotelField.STATUS] = new_status
                        city_hotels[i][HotelField.UPDATED_AT] = datetime.now().strftime("%Y-%m-%d")
                        updated_hotel = city_hotels[i]
                        break
            if hotel_found: break
        
        if not hotel_found:
            return jsonify({HotelField.ERROR: "Không tìm thấy khách sạn"}), 404

        try:
            with open(target_file, 'w', encoding='utf-8') as f:
                json.dump(city_hotels, f, ensure_ascii=False, indent=4)
        except Exception as e:
            return jsonify({HotelField.ERROR: f"Lỗi khi ghi file: {str(e)}"}), 500

        # --- START: TỰ ĐỘNG LƯU TRỮ VÀ XÓA BÁO CÁO CŨ KHI REVIEW ---
        if new_status in [HotelStatus.APPROVED.value, HotelStatus.INACTIVE.value, "deleted"]:
            with reports_lock:
                reports = read_reports()
                reports_to_keep = []
                reports_to_archive = []
                for r in reports:
                    if r.get(HotelField.HOTEL_ID) == hotel_id:
                        r['archivedAt'] = datetime.now(timezone.utc).isoformat()
                        r['resolution'] = f'{new_status}_by_admin'
                        reports_to_archive.append(r)
                    else:
                        reports_to_keep.append(r)
                
                if reports_to_archive:
                    write_reports(reports_to_keep) # Cập nhật lại file chính
                    
                    # Backup sang file history riêng cho khách sạn
                    with history_lock:
                        history = []
                        history_file = os.path.join(CONFIG_DIR, f"hotel_report_{hotel_id}.json")
                        if os.path.exists(history_file):
                            try:
                                with open(history_file, 'r', encoding='utf-8') as f:
                                    history = json.load(f)
                            except Exception:
                                pass
                        history.extend(reports_to_archive)
                        try:
                            with open(history_file, 'w', encoding='utf-8') as f:
                                json.dump(history, f, ensure_ascii=False, indent=4)
                        except Exception as e:
                            logging.error(f"Failed to write history: {e}")
        # --- END: TỰ ĐỘNG LƯU TRỮ ---

    return jsonify({HotelField.SUCCESS: True, HotelField.MESSAGE: f"Cập nhật trạng thái thành công sang '{new_status}'", HotelField.DATA: updated_hotel})

@app.route('/api/hotelconnect/v1/hotels/<hotel_id>', methods=['PUT'])
@cross_origin()
def update_hotel(hotel_id):
    req_data = request.json
    if not req_data:
        return jsonify({HotelField.ERROR: "Dữ liệu không hợp lệ"}), 400

    with schema_lock:
        schemas = read_schema()
        hotel_found = False
        target_file = None
        city_hotels = []

        # Tìm khách sạn trong toàn bộ các tệp cấu hình
        for schema in schemas:
            file_path = os.path.join(CONFIG_DIR, schema.get(HotelField.FILE_PATH_ID))
            if os.path.exists(file_path):
                with open(file_path, 'r', encoding='utf-8') as f:
                    try:
                        hotels = json.load(f)
                        for i, h in enumerate(hotels):
                            if h.get(HotelField.ID) == hotel_id:
                                hotel_found = True
                                target_file = file_path
                                city_hotels = hotels
                                # Cập nhật các trường thông tin cho phép
                                for k, v in req_data.items():
                                    if k not in [HotelField.ID, HotelField.CREATED_AT]: # Cho phép cập nhật status
                                        city_hotels[i][k] = v
                                city_hotels[i][HotelField.UPDATED_AT] = datetime.now().strftime("%Y-%m-%d")
                                updated_hotel = city_hotels[i]
                                break
                    except Exception:
                        pass
            if hotel_found:
                break
        
        if not hotel_found:
            return jsonify({HotelField.ERROR: "Không tìm thấy khách sạn"}), 404

        try:
            with open(target_file, 'w', encoding='utf-8') as f:
                json.dump(city_hotels, f, ensure_ascii=False, indent=4)
        except Exception as e:
            return jsonify({HotelField.ERROR: f"Lỗi khi ghi file: {str(e)}"}), 500

    return jsonify({HotelField.SUCCESS: True, HotelField.MESSAGE: "Cập nhật khách sạn thành công", HotelField.DATA: updated_hotel})

@app.route('/api/hotelconnect/v1/hotels/<hotel_id>', methods=['DELETE'])
@cross_origin()
def delete_hotel(hotel_id):
    with schema_lock:
        schemas = read_schema()
        hotel_found = False
        target_file = None
        city_hotels = []

        # Tìm và xóa khách sạn trong các tệp cấu hình
        for schema in schemas:
            file_path = os.path.join(CONFIG_DIR, schema.get(HotelField.FILE_PATH_ID))
            if os.path.exists(file_path):
                with open(file_path, 'r', encoding='utf-8') as f:
                    try:
                        hotels = json.load(f)
                        for i, h in enumerate(hotels):
                            if h.get(HotelField.ID) == hotel_id:
                                hotel_found = True
                                target_file = file_path
                                city_hotels = hotels
                                city_hotels.pop(i) # Loại bỏ khách sạn khỏi danh sách
                                break
                    except Exception:
                        pass
            if hotel_found:
                break
        
        if not hotel_found:
            return jsonify({HotelField.ERROR: "Không tìm thấy khách sạn"}), 404

        try:
            with open(target_file, 'w', encoding='utf-8') as f:
                json.dump(city_hotels, f, ensure_ascii=False, indent=4)
        except Exception as e:
            return jsonify({HotelField.ERROR: f"Lỗi khi ghi file: {str(e)}"}), 500

        # --- START: XÓA BÁO CÁO LIÊN QUAN KHI XÓA VĨNH VIỄN LỮ QUÁN ---
        # 1. Xóa các báo cáo đang chờ xử lý trong hotel_reports.json (nếu có)
        with reports_lock:
            reports = read_reports()
            new_reports = [r for r in reports if r.get(HotelField.HOTEL_ID) != hotel_id]
            if len(reports) != len(new_reports):
                write_reports(new_reports)
                
        # 2. Xóa file lịch sử báo cáo (hotel_report_<hotel_id>.json)
        history_file = os.path.join(CONFIG_DIR, f"hotel_report_{hotel_id}.json")
        if os.path.exists(history_file):
            try:
                os.remove(history_file)
            except Exception as e:
                logging.error(f"Lỗi khi xóa file lịch sử {history_file}: {e}")
        # --- END: XÓA BÁO CÁO LIÊN QUAN ---

    return jsonify({HotelField.SUCCESS: True, HotelField.MESSAGE: "Xóa khách sạn thành công"})

@app.route('/api/hotelconnect/v1/config/<filename>', methods=['GET'])
@cross_origin()
def get_config_file(filename):
    # Đảm bảo chỉ phục vụ file JSON để tránh lỗi bảo mật (Directory Traversal)
    if '.json' not in filename:
        return jsonify({HotelField.ERROR: "Chỉ hỗ trợ tải file JSON"}), 400
        
    directory = CONFIG_DIR
    full_path = os.path.join(directory, filename)
    if not os.path.exists(full_path):
        logging.warning(f"File không tồn tại (404): {full_path}")
        return jsonify([]), 404
        
    return send_from_directory(directory, filename)

@app.route('/luquan/')
@app.route('/luquan/<path:page_name>')
@cross_origin()
def hotel_connect_resource_sub(page_name=None):
    # 1. Xử lý mặc định cho index
    if not page_name or page_name.strip() == "/":
        return render_template("index.html")

    # Đường dẫn gốc tới thư mục hotel_connect
    # Đảm bảo template_dir của bạn trỏ đúng vào thư mục templates
    directory = os.path.join(template_dir, "")

    try:
        # 2. Xử lý các file tài nguyên tĩnh (js, json, css, png, v.v.)
        static_extensions = ('.js', '.json', '.css', '.png', '.jpg', '.svg', '.ico')

        # Kiểm tra xem page_name có kết thúc bằng đuôi file tĩnh không
        if any(page_name.endswith(ext) for ext in static_extensions):
            # page_name lúc này sẽ là "js/components/Icon.js" (nhờ có <path:>)
            # send_from_directory sẽ tìm đúng file trong sub-folder
            return send_from_directory(directory, page_name)

        # 3. Xử lý các route điều hướng (không có dấu chấm - giả định là page .html)
        if '.' not in page_name:
            return render_template(f"{page_name}.html")

        # 4. Nếu có đuôi file khác (như .html cụ thể)
        return render_template(f"{page_name}")

    except Exception as e:
        print(f"Lỗi truy cập file: {page_name} - Error: {e}")
        abort(404)


   


if __name__ == "__main__":
    # Tắt debug để tránh Werkzeug Reloader quét file liên tục gây tràn RAM
    app.run(host="0.0.0.0", port=5000, threaded=True)
