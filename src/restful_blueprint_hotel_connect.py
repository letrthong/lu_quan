import os
import json
import uuid
import logging
import threading
from datetime import datetime, timezone
from flask import Blueprint, jsonify, request, send_from_directory
 

from .hotel_constants import HOTEL_CONFIG_DIR, HotelField, HotelStatus
from .geo_utils import haversine
from . import hotel_schema_service as schema_svc
from . import hotel_helpers as helpers

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
        except Exception as e:
            return jsonify({HotelField.ERROR: f"Lỗi khi ghi file khách sạn: {str(e)}"}), 500

        other_requests.sort(key=lambda x: str(x.get(HotelField.LOCATION_ID, '')))
        helpers.write_requests(other_requests)

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

    return jsonify({HotelField.SUCCESS: True, HotelField.MESSAGE: "Xóa khách sạn thành công"})

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
