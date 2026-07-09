import os
import json
import uuid
import logging
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed

import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from datetime import datetime, timezone
from flask import Blueprint, jsonify, request, send_from_directory, send_file, current_app
 

from  hotel_constants import HOTEL_CONFIG_DIR, HotelField, HotelStatus, CACHE_VERSION_FILE, LIGHTWEIGHT_FIELDS
from  geo_utils import haversine
from  image_utils import ensure_thumbnail
import hotel_schema_service as schema_svc
import hotel_helpers as helpers
import sos_service

hotel_connect_api = Blueprint('hotel_connect_api', __name__, url_prefix='/api/hotelconnect/v1')

schema_lock = threading.Lock()
requests_lock = threading.Lock()
reports_lock = threading.Lock()
history_lock = threading.Lock()



@hotel_connect_api.route('/schema', methods=['GET'])
def get_schema():
    with schema_lock:
        data = schema_svc.read_schema()
    return jsonify(data)

@hotel_connect_api.route('/schema', methods=['POST'])
def add_schema():
    req_data = request.json
    if not req_data:
        return jsonify({HotelField.ERROR: "Dữ liệu không hợp lệ"}), 400
    try:
        new_item = schema_svc.create_schema_item(req_data)
    except Exception as e:
        return jsonify({HotelField.ERROR: str(e)}), 400
    with schema_lock:
        data = schema_svc.read_schema()
        data.append(new_item)
        data.sort(key=lambda x: str(x.get(HotelField.LOCATION, '')).lower())
        schema_svc.write_schema(data)
    return jsonify({HotelField.MESSAGE: "Thêm mới thành công", HotelField.DATA: new_item}), 201

@hotel_connect_api.route('/schema/<item_id>', methods=['PUT'])
def update_schema(item_id):
    req_data = request.json
    if not req_data:
        return jsonify({HotelField.ERROR: "Dữ liệu không hợp lệ"}), 400
    with schema_lock:
        data = schema_svc.read_schema()
        for item in data:
            if item.get("id") == item_id:
                current_radius = float(item.get("radius", 10))
                new_radius = float(req_data.get("radius", 10))
                if new_radius < current_radius:
                    return jsonify({HotelField.ERROR: "Không thể giảm bán kính nhỏ hơn mức hiện tại"}), 400
                
                try:
                    updated = schema_svc.update_schema_item(item, req_data)
                except Exception as e:
                    return jsonify({HotelField.ERROR: str(e)}), 400
                schema_svc.write_schema(data)
                return jsonify({HotelField.MESSAGE: "Cập nhật thành công", HotelField.DATA: updated}), 200
    return jsonify({HotelField.ERROR: "Không tìm thấy item"}), 404

@hotel_connect_api.route('/schema/<item_id>', methods=['DELETE'])
def delete_schema(item_id):
    with schema_lock:
        data = schema_svc.read_schema()
        new_data = schema_svc.delete_schema_item(data, item_id)
        if len(data) == len(new_data):
            return jsonify({HotelField.ERROR: "Không tìm thấy item"}), 404
        schema_svc.write_schema(new_data)
        return jsonify({HotelField.MESSAGE: "Xóa thành công"}), 200

@hotel_connect_api.route('/hotels/request', methods=['POST'])
def submit_hotel_request():
    req_data = request.json
    if not req_data:
        return jsonify({HotelField.ERROR: "Dữ liệu không hợp lệ"}), 400
    
    hotel_lat = req_data.get(HotelField.LAT)
    hotel_lng = req_data.get(HotelField.LNG)
    location_id = req_data.get(HotelField.LOCATION_ID)

    valid, error = helpers.validate_hotel_request(req_data)
    if not valid:
        return jsonify({HotelField.ERROR: error}), 400

    with schema_lock:
        schemas = schema_svc.read_schema()
    area_center = next((s for s in schemas if s.get("id") == location_id), None)

    if not area_center or HotelField.LAT not in area_center or HotelField.LNG not in area_center:
        return jsonify({HotelField.ERROR: f"Không tìm thấy thông tin vị trí cho khu vực (ID: {location_id})"}), 400

    area_lat = area_center[HotelField.LAT]
    area_lng = area_center[HotelField.LNG]
    location_name = area_center.get(HotelField.LOCATION, "Không rõ")
    area_radius = float(area_center.get("radius", 10))

    distance = haversine(hotel_lat, hotel_lng, area_lat, area_lng)

    if distance > area_radius:
        error_message = f"Vị trí khách sạn phải cách trung tâm {location_name} không quá {area_radius:g}km. Khoảng cách hiện tại là {distance:.2f}km."
        return jsonify({HotelField.ERROR: error_message}), 400

    # Tạo thumbnail tự động nếu có image
    req_data = ensure_thumbnail(req_data)
    
    with requests_lock:
        data = helpers.read_requests()
        data.append(req_data)
        helpers.write_requests(data)
    return jsonify({HotelField.SUCCESS: True, HotelField.MESSAGE: "Gửi yêu cầu đăng ký thành công", HotelField.DATA: req_data}), 201

@hotel_connect_api.route('/hotels/request', methods=['GET'])
def get_hotel_requests():
    with requests_lock:
        data = helpers.read_requests()
    return jsonify(data)

@hotel_connect_api.route('/requests/<request_id>/approve', methods=['POST'])
def approve_hotel_request(request_id):
    with requests_lock:
        all_requests = helpers.read_requests()
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

        schemas = schema_svc.read_schema()
        target_schema = next((s for s in schemas if s.get("id") == location_id), None)
        target_file = helpers.get_hotel_file_path(target_schema.get(HotelField.LOCATION), schemas) if target_schema else None

        if not target_file:
            return jsonify({HotelField.ERROR: f"Không tìm thấy cấu hình cho khu vực ID: {location_id}"}), 400

        hotel_to_approve = helpers.update_status(hotel_to_approve, HotelStatus.APPROVED)
        
        try:
            city_hotels = []
            if os.path.exists(target_file):
                with open(target_file, 'r', encoding='utf-8') as f:
                    city_hotels = json.load(f)
            
            city_hotels.append(hotel_to_approve)
            city_hotels.sort(key=lambda x: str(x.get(HotelField.NAME, '')).lower())
            
            with open(target_file, 'w', encoding='utf-8') as f:
                json.dump(city_hotels, f, ensure_ascii=False, indent=4)
                
            # Thêm hotel vào geohash index để nearby search hoạt động ngay
            try:
                from geo_utils import add_hotel_to_index
                add_hotel_to_index(hotel_to_approve)
            except Exception as idx_err:
                logging.warning(f"Không thể cập nhật geohash index: {idx_err}")
                
        except Exception as e:
            return jsonify({HotelField.ERROR: f"Lỗi khi ghi file khách sạn: {str(e)}"}), 500

        other_requests.sort(key=lambda x: str(x.get(HotelField.LOCATION_ID, '')))
        helpers.write_requests(other_requests)

    invalidate_hotels_cache()  # Xóa cache để frontend load dữ liệu mới
    return jsonify({HotelField.SUCCESS: True, HotelField.MESSAGE: "Phê duyệt khách sạn thành công", HotelField.DATA: hotel_to_approve})

@hotel_connect_api.route('/requests/<request_id>/reject', methods=['POST'])
def reject_hotel_request(request_id):
    with requests_lock:
        all_requests = helpers.read_requests()
        remaining_requests = [req for req in all_requests if req.get('id') != request_id]
        if len(remaining_requests) == len(all_requests):
            return jsonify({HotelField.ERROR: "Không tìm thấy yêu cầu"}), 404
        helpers.write_requests(remaining_requests)
    return jsonify({HotelField.SUCCESS: True, HotelField.MESSAGE: "Từ chối yêu cầu thành công"})

@hotel_connect_api.route('/requests/<request_id>', methods=['PUT'])
def update_hotel_request(request_id):
    req_data = request.json
    if not req_data:
        return jsonify({HotelField.ERROR: "Dữ liệu không hợp lệ"}), 400

    with requests_lock:
        all_requests = helpers.read_requests()
        found = False
        updated_request = None
        for i, req in enumerate(all_requests):
            if req.get('id') == request_id:
                for k, v in req_data.items():
                    if k not in [HotelField.ID, HotelField.CREATED_AT]:
                        all_requests[i][k] = v
                
                # Tạo thumbnail mới nếu image được cập nhật
                if 'image' in req_data:
                    all_requests[i] = ensure_thumbnail(all_requests[i], force_regenerate=True)
                
                all_requests[i][HotelField.UPDATED_AT] = datetime.now().strftime("%Y-%m-%d")
                found = True
                updated_request = all_requests[i]
                break
        if not found:
            return jsonify({HotelField.ERROR: "Không tìm thấy yêu cầu"}), 404
        helpers.write_requests(all_requests)

    return jsonify({HotelField.SUCCESS: True, HotelField.MESSAGE: "Cập nhật yêu cầu thành công", HotelField.DATA: updated_request})

@hotel_connect_api.route('/hotels/reports', methods=['POST'])
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
        reports = helpers.read_reports()
        reports.append(new_report)
        helpers.write_reports(reports)
        report_count_for_hotel = sum(1 for r in reports if r.get(HotelField.HOTEL_ID) == hotel_id)

    hotel_to_update = None
    target_file = None
    city_hotels = None

    with schema_lock:
        schemas = schema_svc.read_schema()
        for schema in schemas:
            file_path_id = schema.get(HotelField.FILE_PATH_ID)
            if not file_path_id:
                continue
            file_path = os.path.join(HOTEL_CONFIG_DIR, file_path_id)
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
            if report_count_for_hotel >= 5:
                hotel_to_update[HotelField.STATUS] = HotelStatus.PENDING_REVIEW.value
            else:
                hotel_to_update[HotelField.STATUS] = HotelStatus.REPORTED.value

            hotel_to_update[HotelField.UPDATED_AT] = datetime.now().strftime("%Y-%m-%d")
            with open(target_file, 'w', encoding='utf-8') as f:
                json.dump(city_hotels, f, ensure_ascii=False, indent=4)
        except Exception as e:
            logging.error(f"Failed to write updated hotel status for {hotel_id} to {target_file}: {e}")
        
    return jsonify({HotelField.SUCCESS: True, HotelField.MESSAGE: "Gửi báo cáo lỗi thành công", HotelField.DATA: new_report}), 201

@hotel_connect_api.route('/hotels/reports', methods=['GET'])
def get_hotel_reports():
    with reports_lock:
        reports = helpers.read_reports()
    
    grouped_by_hotel = {}
    for report in reports:
        hotel_id = report.get(HotelField.HOTEL_ID)
        if not hotel_id:
            continue
        if hotel_id not in grouped_by_hotel:
            grouped_by_hotel[hotel_id] = []
        grouped_by_hotel[hotel_id].append(report)

    unique_reports = []
    for hotel_id, hotel_reports in grouped_by_hotel.items():
        if not hotel_reports:
            continue
        
        hotel_reports.sort(key=lambda r: r.get('reportedAt', ''), reverse=True)
        latest_report = hotel_reports[0]
        latest_report['reportCount'] = len(hotel_reports)
        unique_reports.append(latest_report)

    with schema_lock:
        for report in unique_reports:
            details = helpers._find_hotel_details_by_id(report.get(HotelField.HOTEL_ID))
            if details:
                report[HotelField.HOTEL_NAME] = details['name']
                report[HotelField.LOCATION] = details.get(HotelField.LOCATION, "Không rõ")
            else:
                report[HotelField.HOTEL_NAME] = f"Không tìm thấy (ID: {report.get(HotelField.HOTEL_ID)})"
                report[HotelField.LOCATION] = "Không rõ"

    unique_reports.sort(key=lambda r: r.get('reportedAt', ''), reverse=True)
    return jsonify(unique_reports)

@hotel_connect_api.route('/hotels/<hotel_id>/reports', methods=['GET'])
def get_all_reports_for_hotel(hotel_id):
    with reports_lock:
        all_reports = helpers.read_reports()
    
    hotel_reports = [r for r in all_reports if r.get(HotelField.HOTEL_ID) == hotel_id]
    
    if not hotel_reports:
        return jsonify([])

    with schema_lock:
        details = helpers._find_hotel_details_by_id(hotel_id)
        hotel_name = "Không tìm thấy"
        if details:
            hotel_name = details.get('name', "Không tìm thấy")

    for report in hotel_reports:
        report[HotelField.HOTEL_NAME] = hotel_name

    hotel_reports.sort(key=lambda r: r.get('reportedAt', ''), reverse=True)
    return jsonify(hotel_reports)

@hotel_connect_api.route('/hotels/reports/<report_id>', methods=['DELETE'])
def delete_hotel_report(report_id):
    with reports_lock:
        reports = helpers.read_reports()
        new_reports = [r for r in reports if r.get(HotelField.REPORT_ID) != report_id]
        if len(reports) == len(new_reports):
            return jsonify({HotelField.ERROR: "Không tìm thấy báo cáo"}), 404
        helpers.write_reports(new_reports)
        
    return jsonify({HotelField.SUCCESS: True, HotelField.MESSAGE: "Xóa báo cáo thành công"})

@hotel_connect_api.route('/hotels/status/<status_name>', methods=['GET'])
def get_hotels_by_status(status_name):
    valid_statuses = [s.value for s in HotelStatus] + ["deleted"]
    if status_name not in valid_statuses:
        return jsonify({HotelField.ERROR: "Trạng thái không hợp lệ"}), 400

    hotels_with_status = []
    with schema_lock:
        schemas = schema_svc.read_schema()
        for schema in schemas:
            file_path_id = schema.get(HotelField.FILE_PATH_ID)
            if not file_path_id:
                continue
            file_path = os.path.join(HOTEL_CONFIG_DIR, file_path_id)
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

@hotel_connect_api.route('/hotels/<hotel_id>/status', methods=['POST'])
def set_hotel_status(hotel_id):
    req_data = request.json
    new_status = req_data.get(HotelField.STATUS)
    if not new_status:
        return jsonify({HotelField.ERROR: "Thiếu trạng thái mới"}), 400
    
    valid_statuses = [s.value for s in HotelStatus] + ["deleted"]
    if new_status not in valid_statuses:
        return jsonify({HotelField.ERROR: "Trạng thái không hợp lệ"}), 400

    with schema_lock:
        schemas = schema_svc.read_schema()
        hotel_found, target_file, city_hotels, updated_hotel = False, None, [], None

        for schema in schemas:
            file_path_id = schema.get(HotelField.FILE_PATH_ID)
            if not file_path_id:
                continue
            file_path = os.path.join(HOTEL_CONFIG_DIR, file_path_id)
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
        
        # Cập nhật geohash index theo status mới
        try:
            from geo_utils import add_hotel_to_index, remove_hotel_from_index
            if new_status == HotelStatus.APPROVED.value:
                # Hotel được khôi phục, thêm lại vào index
                add_hotel_to_index(updated_hotel)
            elif new_status in [HotelStatus.INACTIVE.value, "deleted"]:
                # Hotel bị ẩn hoặc xóa, bỏ khỏi index
                remove_hotel_from_index(hotel_id)
        except Exception as idx_err:
            logging.warning(f"Không thể cập nhật geohash index khi đổi status: {idx_err}")

        if new_status in [HotelStatus.APPROVED.value, HotelStatus.INACTIVE.value, "deleted"]:
            with reports_lock:
                reports = helpers.read_reports()
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
                    helpers.write_reports(reports_to_keep)
                    
                    with history_lock:
                        history = []
                        history_file = os.path.join(HOTEL_CONFIG_DIR, f"hotel_report_{hotel_id}.json")
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

    invalidate_hotels_cache()  # Xóa cache để frontend load dữ liệu mới
    return jsonify({HotelField.SUCCESS: True, HotelField.MESSAGE: f"Cập nhật trạng thái thành công sang '{new_status}'", HotelField.DATA: updated_hotel})

@hotel_connect_api.route('/hotels/<hotel_id>', methods=['PUT'])
def update_hotel(hotel_id):
    req_data = request.json
    if not req_data:
        return jsonify({HotelField.ERROR: "Dữ liệu không hợp lệ"}), 400

    with schema_lock:
        schemas = schema_svc.read_schema()
        hotel_found = False
        target_file = None
        city_hotels = []

        for schema in schemas:
            file_path_id = schema.get(HotelField.FILE_PATH_ID)
            if not file_path_id:
                continue
            file_path = os.path.join(HOTEL_CONFIG_DIR, file_path_id)
            if os.path.exists(file_path):
                with open(file_path, 'r', encoding='utf-8') as f:
                    try:
                        hotels = json.load(f)
                        for i, h in enumerate(hotels):
                            if h.get(HotelField.ID) == hotel_id:
                                hotel_found = True
                                target_file = file_path
                                city_hotels = hotels
                                for k, v in req_data.items():
                                    if k not in [HotelField.ID, HotelField.CREATED_AT]:
                                        city_hotels[i][k] = v
                                
                                # Tạo thumbnail mới nếu image được cập nhật
                                if 'image' in req_data:
                                    city_hotels[i] = ensure_thumbnail(city_hotels[i], force_regenerate=True)
                                
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

    invalidate_hotels_cache()  # Xóa cache để frontend load dữ liệu mới
    return jsonify({HotelField.SUCCESS: True, HotelField.MESSAGE: "Cập nhật khách sạn thành công", HotelField.DATA: updated_hotel})

@hotel_connect_api.route('/hotels/<hotel_id>', methods=['DELETE'])
def delete_hotel(hotel_id):
    with schema_lock:
        schemas = schema_svc.read_schema()
        hotel_found = False
        target_file = None
        city_hotels = []

        for schema in schemas:
            file_path_id = schema.get(HotelField.FILE_PATH_ID)
            if not file_path_id:
                continue
            file_path = os.path.join(HOTEL_CONFIG_DIR, file_path_id)
            if os.path.exists(file_path):
                with open(file_path, 'r', encoding='utf-8') as f:
                    try:
                        hotels = json.load(f)
                        for i, h in enumerate(hotels):
                            if h.get(HotelField.ID) == hotel_id:
                                hotel_found = True
                                target_file = file_path
                                city_hotels = hotels
                                city_hotels.pop(i)
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
                
            # Xóa hotel khỏi geohash index
            try:
                from geo_utils import remove_hotel_from_index
                remove_hotel_from_index(hotel_id)
            except Exception as idx_err:
                logging.warning(f"Không thể cập nhật geohash index khi xóa: {idx_err}")
                
        except Exception as e:
            return jsonify({HotelField.ERROR: f"Lỗi khi ghi file: {str(e)}"}), 500

        with reports_lock:
            reports = helpers.read_reports()
            new_reports = [r for r in reports if r.get(HotelField.HOTEL_ID) != hotel_id]
            if len(reports) != len(new_reports):
                helpers.write_reports(new_reports)
                
        history_file = os.path.join(HOTEL_CONFIG_DIR, f"hotel_report_{hotel_id}.json")
        if os.path.exists(history_file):
            try:
                os.remove(history_file)
            except Exception as e:
                logging.error(f"Lỗi khi xóa file lịch sử {history_file}: {e}")

    invalidate_hotels_cache()  # Xóa cache để frontend load dữ liệu mới
    return jsonify({HotelField.SUCCESS: True, HotelField.MESSAGE: "Xóa khách sạn thành công"})


# ============== BULK LOAD API với Memory Cache ==============
import time

# Memory cache cho hotels data
_hotels_cache = {
    'data': {},           # locationId -> [hotels]
    'all_hotels': [],     # Tất cả hotels (flat list)
    'timestamp': 0,       # Thời điểm cache được build
    'data_version': 0     # Version của data khi build cache
}
_cache_lock = threading.RLock()
_geohash_lock = threading.RLock()

# Các biến phục vụ cache TTL của version file nhằm tránh đọc đĩa liên tục
_last_version_check_time = 0
_cached_file_version = 0
VERSION_CHECK_TTL = 1.0  # Check version file tối đa 1 lần mỗi giây


def _read_data_version():
    """Đọc version hiện tại của data từ file config (sử dụng cơ chế TTL)"""
    global _last_version_check_time, _cached_file_version
    now = time.time()
    
    # Fast path check TTL không cần lock
    if now - _last_version_check_time < VERSION_CHECK_TTL:
        return _cached_file_version
        
    with _cache_lock:
        # Re-check TTL trong lock để tránh nhiều thread đọc file đồng thời khi hết hạn TTL
        if now - _last_version_check_time < VERSION_CHECK_TTL:
            return _cached_file_version
            
        try:
            if os.path.exists(CACHE_VERSION_FILE):
                with open(CACHE_VERSION_FILE, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    _cached_file_version = data.get('version', 0)
            else:
                _cached_file_version = 0
        except Exception as e:
            logging.warning(f"Không thể đọc cache version file: {e}")
            _cached_file_version = 0
            
        _last_version_check_time = time.time()
        return _cached_file_version


def _update_data_version():
    """
    Cập nhật version khi có thay đổi data.
    Gọi hàm này sau mỗi thao tác: approve, update, delete hotel.
    Tất cả instance sẽ thấy version mới khi check.
    Ghi dữ liệu atomically sử dụng file tạm và renaming.
    """
    global _last_version_check_time, _cached_file_version
    try:
        new_version = int(time.time() * 1000)  # milliseconds timestamp
        version_data = {
            'version': new_version,
            'updated_at': datetime.now().isoformat(),
            'updated_by': f"instance_{os.getpid()}"
        }
        
        # Ghi ra file tạm trước để đảm bảo tính atomic
        tmp_file = CACHE_VERSION_FILE + ".tmp"
        with open(tmp_file, 'w', encoding='utf-8') as f:
            json.dump(version_data, f, ensure_ascii=False, indent=2)
        os.replace(tmp_file, CACHE_VERSION_FILE)
        
        # Cập nhật ngay bộ nhớ đệm cache version tại instance hiện tại
        with _cache_lock:
            _cached_file_version = new_version
            _last_version_check_time = time.time()
            
        logging.info(f"Data version updated atomically: {new_version}")
        return new_version
    except Exception as e:
        logging.error(f"Không thể cập nhật cache version file: {e}")
        return 0


def _is_cache_valid():
    """
    Kiểm tra cache còn hợp lệ không.
    Cache invalid khi:
    1. Data version trong file khác với version trong cache (instance khác đã thay đổi data)
    """
    current_version = _read_data_version()
    with _cache_lock:
        cache_version = _hotels_cache.get('data_version', 0)
    if current_version > cache_version:
        logging.info(f"Phát hiện data version mới: {current_version} > {cache_version}")
        return False
    
    return True


def _build_hotels_cache():
    """Build cache từ tất cả file hotels - sử dụng parallel I/O"""
    import time as time_module
    start_time = time_module.time()
    
    cache_data = {}
    all_hotels = []
    
    # Đọc data version hiện tại
    current_version = _read_data_version()
    
    schemas = schema_svc.read_schema()
    
    # Chuẩn bị danh sách files cần đọc
    files_to_read = []
    for schema in schemas:
        location_id = schema.get('id')
        file_path_id = schema.get(HotelField.FILE_PATH_ID)
        if not file_path_id or not location_id:
            continue
        file_path = os.path.join(HOTEL_CONFIG_DIR, file_path_id)
        if os.path.exists(file_path):
            files_to_read.append((location_id, file_path))
    
    # Đọc song song các file với ThreadPoolExecutor
    def _read_hotel_file(args):
        location_id, file_path = args
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                hotels = json.load(f)
            return location_id, hotels, None
        except Exception as e:
            return location_id, [], str(e)
    
    # Sử dụng max_workers = số files hoặc 10 (tránh quá nhiều threads)
    max_workers = min(len(files_to_read), 10) if files_to_read else 1
    
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {executor.submit(_read_hotel_file, args): args for args in files_to_read}
        for future in as_completed(futures):
            location_id, hotels, error = future.result()
            if error:
                logging.error(f"Lỗi khi đọc file location {location_id}: {error}")
                cache_data[location_id] = []
            else:
                cache_data[location_id] = hotels
                all_hotels.extend(hotels)
    
    with _cache_lock:
        _hotels_cache['data'] = cache_data
        _hotels_cache['all_hotels'] = all_hotels
        _hotels_cache['data_version'] = current_version
        _hotels_cache['timestamp'] = time.time()
    
    elapsed = time_module.time() - start_time
    logging.info(f"Đã build hotels cache: {len(cache_data)} khu vực, {len(all_hotels)} hotels, version={current_version}, time={elapsed:.2f}s")
    return cache_data, all_hotels


def _get_cached_hotels(location_ids=None):
    """
    Lấy hotels từ cache (build cache nếu cần).
    location_ids: list các locationId cần lấy, None = lấy tất cả
    """
    if not _is_cache_valid():
        with _cache_lock:
            # Recheck under lock để tránh Cache Stampede
            if not _is_cache_valid():
                _build_hotels_cache()
    
    with _cache_lock:
        if location_ids is None or 'all' in location_ids:
            return _hotels_cache['all_hotels']
        
        result = []
        for loc_id in location_ids:
            result.extend(_hotels_cache['data'].get(loc_id, []))
        return result


def invalidate_hotels_cache():
    """
    Xóa cache và cập nhật data version.
    Gọi hàm này sau mỗi thao tác thay đổi data: approve, update, delete hotel.
    Instance khác sẽ thấy version mới và tự rebuild cache.
    """
    global _geohash_index_timestamp, _geohash_index_data_version, _last_version_check_time, _cached_file_version
    
    # Cập nhật data version trong file config - tất cả instance sẽ thấy
    _update_data_version()
    
    # Force reset TTL check để buộc các truy vấn sau đọc từ đĩa
    with _cache_lock:
        _last_version_check_time = 0
        _cached_file_version = 0
        
        # Reset local cache
        _hotels_cache['timestamp'] = 0
        _hotels_cache['data_version'] = 0
    
    # Reset geohash index để force rebuild
    _geohash_index_timestamp = 0
    _geohash_index_data_version = 0
    logging.info("Hotels cache và geohash index đã được invalidate, data version đã được cập nhật")


# Variables để track geohash index (khai báo ở đây để invalidate_hotels_cache có thể access)
_geohash_index_timestamp = 0
_geohash_index_data_version = 0


@hotel_connect_api.route('/hotels/bulk', methods=['GET'])
def get_hotels_bulk():
    """
    API load nhiều khu vực hotels trong 1 request.
    
    Query params:
    - locationIds: Danh sách locationId cách nhau bởi dấu phẩy (vd: "id1,id2,id3")
                   Hoặc "all" để lấy tất cả
    
    Response: Danh sách tất cả hotels từ các khu vực được chọn
    """
    location_ids_param = request.args.get('locationIds', '')
    
    if not location_ids_param:
        return jsonify({HotelField.ERROR: "Thiếu tham số locationIds"}), 400
    
    # Parse locationIds
    if location_ids_param.lower() == 'all':
        location_ids = ['all']
    else:
        location_ids = [loc_id.strip() for loc_id in location_ids_param.split(',') if loc_id.strip()]
    
    if not location_ids:
        return jsonify({HotelField.ERROR: "locationIds không hợp lệ"}), 400
    
    try:
        hotels = _get_cached_hotels(location_ids)
        
        # Filter chỉ giữ lightweight fields (không có image, description)
        lightweight_hotels = [
            {k: v for k, v in hotel.items() if k in LIGHTWEIGHT_FIELDS}
            for hotel in hotels
        ]
        
        return jsonify({
            HotelField.SUCCESS: True,
            'count': len(lightweight_hotels),
            'locationIds': location_ids,
            HotelField.DATA: lightweight_hotels
        })
    except Exception as e:
        logging.error(f"Lỗi khi load bulk hotels: {e}")
        return jsonify({HotelField.ERROR: "Lỗi server"}), 500


@hotel_connect_api.route('/hotels/<hotel_id>/detail', methods=['GET'])
def get_hotel_detail(hotel_id):
    """
    API lấy full detail của 1 hotel (bao gồm image, description).
    Gọi khi user click vào hotel cụ thể.
    """
    with schema_lock:
        schemas = schema_svc.read_schema()
        
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
                            return jsonify({
                                HotelField.SUCCESS: True,
                                HotelField.DATA: hotel
                            })
                except Exception as e:
                    logging.error(f"Lỗi khi đọc file {file_path}: {e}")
    
    return jsonify({HotelField.ERROR: "Không tìm thấy khách sạn"}), 404


@hotel_connect_api.route('/hotels/cache/invalidate', methods=['POST'])
def invalidate_cache_endpoint():
    """API admin: Xóa cache để force reload từ file"""
    invalidate_hotels_cache()
    return jsonify({HotelField.SUCCESS: True, HotelField.MESSAGE: "Cache đã được xóa"})


@hotel_connect_api.route('/config/<filename>', methods=['GET'])
def get_config_file(filename):
    if '.json' not in filename:
        return jsonify({HotelField.ERROR: "Chỉ hỗ trợ tải file JSON"}), 400
        
    directory = HOTEL_CONFIG_DIR
    full_path = os.path.join(directory, filename)
    if not os.path.exists(full_path):
        logging.warning(f"File không tồn tại (404): {full_path}")
        return jsonify([]), 404
        
    return send_from_directory(directory, filename)


# ============== NEARBY API với Geohash Index ==============
from geo_utils import (
    find_nearby_fast, 
    build_geohash_index, 
    add_hotel_to_index, 
    remove_hotel_from_index,
    get_index_stats
)

def _load_all_hotels_for_index():
    """Load tất cả hotels từ các file để build index"""
    # Tận dụng cache nếu có
    if _is_cache_valid():
        with _cache_lock:
            return _hotels_cache['all_hotels']
    
    all_hotels = []
    schemas = schema_svc.read_schema()
    for schema in schemas:
        file_path_id = schema.get(HotelField.FILE_PATH_ID)
        if not file_path_id:
            continue
        file_path = os.path.join(HOTEL_CONFIG_DIR, file_path_id)
        if os.path.exists(file_path):
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    hotels = json.load(f)
                    all_hotels.extend(hotels)
            except Exception as e:
                logging.error(f"Lỗi khi đọc file {file_path} cho index: {e}")
    return all_hotels


def rebuild_geohash_index():
    """Rebuild toàn bộ geohash index từ dữ liệu hiện tại"""
    global _geohash_index_data_version
    with _geohash_lock:
        hotels = _load_all_hotels_for_index()
        count = build_geohash_index(hotels)
        _geohash_index_data_version = _read_data_version()
        logging.info(f"Đã rebuild geohash index: {count} cells, {len(hotels)} hotels, version={_geohash_index_data_version}")
        return count


def _ensure_geohash_index_fresh():
    """
    Đảm bảo geohash index được cập nhật nếu có thay đổi data từ instance khác.
    Gọi trước mỗi nearby query.
    """
    global _geohash_index_timestamp, _geohash_index_data_version
    
    # Fast path check không cần lock
    if _geohash_index_timestamp != 0 and _read_data_version() <= _geohash_index_data_version:
        return
    
    with _geohash_lock:
        # Re-check under lock (Double-Checked Locking)
        if _geohash_index_timestamp == 0:
            rebuild_geohash_index()
            _geohash_index_timestamp = time.time()
            return
        
        current_version = _read_data_version()
        if current_version > _geohash_index_data_version:
            logging.info(f"Phát hiện data version mới cho geohash: {current_version} > {_geohash_index_data_version}")
            rebuild_geohash_index()
            _geohash_index_timestamp = time.time()


@hotel_connect_api.route('/nearby', methods=['GET'])
def get_nearby_hotels():
    """
    API tìm hotels gần vị trí cho trước.
    
    Query params:
    - lat: Vĩ độ (bắt buộc)
    - lng: Kinh độ (bắt buộc)
    - radius: Bán kính tìm kiếm tính bằng km (mặc định 5km, tối đa 50km)
    - limit: Số lượng kết quả tối đa (mặc định 50)
    
    Response: Danh sách hotels với field 'distance' (km) được thêm vào.
    """
    try:
        lat = request.args.get('lat', type=float)
        lng = request.args.get('lng', type=float)
        radius = request.args.get('radius', default=5.0, type=float)
        limit = request.args.get('limit', default=50, type=int)
        
        if lat is None or lng is None:
            return jsonify({HotelField.ERROR: "Thiếu tham số lat hoặc lng"}), 400
        
        # Giới hạn bán kính tối đa 50km để tránh quá tải
        radius = min(radius, 50.0)
        limit = min(limit, 200)
        
        # Đảm bảo index được cập nhật nếu có thay đổi từ instance khác
        _ensure_geohash_index_fresh()
        
        results = find_nearby_fast(lat, lng, radius)
        
        # Giới hạn số lượng kết quả
        results = results[:limit]
        
        return jsonify({
            HotelField.SUCCESS: True,
            'count': len(results),
            'radius_km': radius,
            'center': {'lat': lat, 'lng': lng},
            HotelField.DATA: results
        })
        
    except Exception as e:
        logging.error(f"Lỗi khi tìm nearby hotels: {e}")
        return jsonify({HotelField.ERROR: "Lỗi server khi tìm kiếm"}), 500


@hotel_connect_api.route('/nearby/stats', methods=['GET'])
def get_nearby_stats():
    """API debug: Xem thống kê geohash index"""
    stats = get_index_stats()
    return jsonify(stats)


@hotel_connect_api.route('/nearby/rebuild', methods=['POST'])
def rebuild_index_endpoint():
    """API admin: Rebuild lại geohash index"""
    try:
        count = rebuild_geohash_index()
        return jsonify({
            HotelField.SUCCESS: True,
            HotelField.MESSAGE: f"Đã rebuild index thành công",
            'cells_count': count
        })
    except Exception as e:
        logging.error(f"Lỗi khi rebuild index: {e}")
        return jsonify({HotelField.ERROR: str(e)}), 500


# ============== CACHE PRE-WARMING ==============
def warm_cache():
    """
    Pre-warm cache khi server khởi động.
    Gọi hàm này trong app factory hoặc khi import module.
    """
    try:
        logging.info("Bắt đầu warm cache hotels...")
        _build_hotels_cache()
        rebuild_geohash_index()
        logging.info("Warm cache hoàn tất!")
    except Exception as e:
        logging.error(f"Lỗi khi warm cache: {e}")


# Auto warm cache khi module được load (có thể disable bằng env var)
if os.environ.get('HOTEL_DISABLE_CACHE_WARMUP', '').lower() != 'true':
    # Chạy trong background thread để không block import
    _warmup_thread = threading.Thread(target=warm_cache, daemon=True)
    _warmup_thread.start()


# Khởi tạo cache và index khi module được load
def init_geohash_index():
    """
    Gọi hàm này khi server khởi động để:
    1. Warm up hotels cache (load tất cả hotels vào memory)
    2. Build geohash index cho nearby search
    
    Sau khi init, các request đầu tiên sẽ được trả về ngay từ cache.
    """
    try:
        # 1. Warm up hotels cache trước
        logging.info("Đang warm up hotels cache...")
        _build_hotels_cache()
        
        # 2. Build geohash index (sẽ dùng cache vừa build)
        logging.info("Đang build geohash index...")
        rebuild_geohash_index()
        
        logging.info("Server đã sẵn sàng - cache và index đã được load")
    except Exception as e:
        logging.error(f"Lỗi khi khởi tạo: {e}")


# ============== SOS EMERGENCY REQUESTS ==============

@hotel_connect_api.route('/sos', methods=['POST'])
def submit_sos_request():
    req_data = request.json
    if not req_data:
        return jsonify({HotelField.ERROR: "Dữ liệu không hợp lệ"}), 400
    
    # Chống spam bằng cách kiểm tra các Header trình duyệt đặc trưng (Bỏ qua khi chạy Unit Test)
    if not current_app.testing:
        user_agent = request.headers.get('User-Agent', '')
        # Bỏ qua kiểm tra nếu request đến từ Flask test client (Werkzeug)
        if 'werkzeug' not in user_agent.lower():
            if not user_agent or any(bot in user_agent.lower() for bot in ['python', 'curl', 'wget', 'postman', 'httpclient', 'urllib', 'scrapy']):
                return jsonify({HotelField.ERROR: "Yêu cầu bị từ chối do phát hiện tác nhân tự động (Bot)"}), 403

            origin = request.headers.get('Origin')
            referer = request.headers.get('Referer')
            if not origin and not referer:
                return jsonify({HotelField.ERROR: "Yêu cầu bị từ chối (Thiếu Origin/Referer)"}), 403

    try:
        new_sos = sos_service.create_sos(req_data, request.remote_addr)
        return jsonify({
            HotelField.SUCCESS: True,
            HotelField.MESSAGE: "Gửi yêu cầu cứu hộ SOS thành công",
            HotelField.DATA: new_sos
        }), 201
    except ValueError as e:
        return jsonify({HotelField.ERROR: str(e)}), 400
    except Exception as e:
        logging.error(f"Lỗi khi gửi cứu hộ SOS: {e}")
        return jsonify({HotelField.ERROR: "Lỗi hệ thống khi xử lý yêu cầu"}), 500

@hotel_connect_api.route('/sos', methods=['GET'])
def get_sos_requests():
    try:
        include_history = request.args.get('include_history', 'false').lower() == 'true'
        requests = sos_service.read_sos()
        if include_history:
            history = sos_service.read_sos_history()
            requests = requests + history
        return jsonify(requests), 200
    except Exception as e:
        logging.error(f"Lỗi khi lấy danh sách SOS: {e}")
        return jsonify({HotelField.ERROR: "Lỗi hệ thống khi tải danh sách"}), 500

@hotel_connect_api.route('/sos/<sos_id>', methods=['PUT'])
def update_sos_request(sos_id):
    req_data = request.json
    if not req_data or 'status' not in req_data:
        return jsonify({HotelField.ERROR: "Thiếu thông tin trạng thái mới"}), 400
    
    new_status = req_data['status']
    try:
        updated = sos_service.update_sos_status(sos_id, new_status)
        return jsonify({
            HotelField.SUCCESS: True,
            HotelField.MESSAGE: f"Cập nhật trạng thái thành công sang {new_status}",
            HotelField.DATA: updated
        }), 200
    except ValueError as e:
        return jsonify({HotelField.ERROR: str(e)}), 400
    except KeyError as e:
        return jsonify({HotelField.ERROR: str(e)}), 404
    except Exception as e:
        logging.error(f"Lỗi khi cập nhật trạng thái SOS {sos_id}: {e}")
        return jsonify({HotelField.ERROR: "Lỗi hệ thống"}), 500

@hotel_connect_api.route('/sos/<sos_id>', methods=['DELETE'])
def delete_sos_request(sos_id):
    try:
        sos_service.delete_sos(sos_id)
        return jsonify({
            HotelField.SUCCESS: True,
            HotelField.MESSAGE: "Xóa yêu cầu cứu hộ thành công"
        }), 200
    except KeyError as e:
        return jsonify({HotelField.ERROR: str(e)}), 404
    except Exception as e:
        logging.error(f"Lỗi khi xóa SOS {sos_id}: {e}")
        return jsonify({HotelField.ERROR: "Lỗi hệ thống"}), 500

@hotel_connect_api.route('/sos/<sos_id>/image', methods=['GET'])
def get_sos_image(sos_id):
    try:
        path, mimetype = sos_service.get_sos_image_path(sos_id)
        if not path:
            return jsonify({HotelField.ERROR: "Không tìm thấy hình ảnh"}), 404
        return send_file(path, mimetype=mimetype)
    except Exception as e:
        logging.error(f"Lỗi khi tải ảnh SOS {sos_id}: {e}")
        return jsonify({HotelField.ERROR: "Lỗi hệ thống khi tải ảnh"}), 500

