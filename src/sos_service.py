import os
import json
import uuid
import base64
from datetime import datetime, timezone, timedelta
from threading import Lock

from hotel_constants import HOTEL_CONFIG_DIR

SOS_FILE_PATH = os.path.join(HOTEL_CONFIG_DIR, "sos_requests.json")
SOS_HISTORY_FILE_PATH = os.path.join(HOTEL_CONFIG_DIR, "sos_history.json")
sos_lock = Lock()
comments_lock = Lock()

try:
    from PIL import Image
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False

def read_sos():
    """Reads active SOS requests from the JSON storage file."""
    with sos_lock:
        if not os.path.exists(SOS_FILE_PATH):
            return []
        try:
            with open(SOS_FILE_PATH, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            return []

def write_sos(data):
    """Writes active SOS requests to the JSON storage file."""
    with sos_lock:
        os.makedirs(os.path.dirname(SOS_FILE_PATH), exist_ok=True)
        try:
            with open(SOS_FILE_PATH, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=4)
            return True
        except Exception as e:
            print(f"Error writing SOS file: {e}")
            return False

def read_sos_history():
    """Reads archived SOS requests from the JSON history storage file."""
    with sos_lock:
        if not os.path.exists(SOS_HISTORY_FILE_PATH):
            return []
        try:
            with open(SOS_HISTORY_FILE_PATH, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            return []

def write_sos_history(data):
    """Writes archived SOS requests to the JSON history storage file."""
    with sos_lock:
        os.makedirs(os.path.dirname(SOS_HISTORY_FILE_PATH), exist_ok=True)
        try:
            with open(SOS_HISTORY_FILE_PATH, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=4)
            return True
        except Exception as e:
            print(f"Error writing SOS history file: {e}")
            return False

def save_sos_image(sos_id, base64_str):
    """Saves base64 image data to the disk. Converts to WebP if PIL is available."""
    if not base64_str:
        return False

    if ',' in base64_str:
        base64_str = base64_str.split(',')[1]

    try:
        img_bytes = base64.b64decode(base64_str)
        output_dir = os.path.join(HOTEL_CONFIG_DIR, "sos_images")
        os.makedirs(output_dir, exist_ok=True)

        if PIL_AVAILABLE:
            from PIL import Image
            import io
            image = Image.open(io.BytesIO(img_bytes))

            # Convert to RGB if needed
            if image.mode in ('RGBA', 'LA') and len(image.split()) >= 4:
                background = Image.new('RGB', image.size, (255, 255, 255))
                background.paste(image, mask=image.split()[3])
                image = background
            elif image.mode != 'RGB':
                image = image.convert('RGB')

            output_path = os.path.join(output_dir, f"{sos_id}.webp")
            image.save(output_path, 'WEBP', quality=70)
            return True
        else:
            # Fallback: save raw file if PIL not available
            output_path = os.path.join(output_dir, f"{sos_id}.bin")
            with open(output_path, 'wb') as f:
                f.write(img_bytes)
            return True
    except Exception as e:
        print(f"Error saving SOS image: {e}")
        return False

def get_sos_image_path(sos_id):
    """Returns the absolute path of the SOS request's image file and its mimetype."""
    output_dir = os.path.join(HOTEL_CONFIG_DIR, "sos_images")
    webp_path = os.path.join(output_dir, f"{sos_id}.webp")
    if os.path.exists(webp_path):
        return webp_path, 'image/webp'
    bin_path = os.path.join(output_dir, f"{sos_id}.bin")
    if os.path.exists(bin_path):
        return bin_path, 'application/octet-stream'
    return None, None

def delete_sos_image(sos_id):
    """Removes the image file associated with the SOS request from disk."""
    output_dir = os.path.join(HOTEL_CONFIG_DIR, "sos_images")
    webp_path = os.path.join(output_dir, f"{sos_id}.webp")
    if os.path.exists(webp_path):
        try:
            os.remove(webp_path)
        except Exception:
            pass
    bin_path = os.path.join(output_dir, f"{sos_id}.bin")
    if os.path.exists(bin_path):
        try:
            os.remove(bin_path)
        except Exception:
            pass

def create_sos(sos_data, reporter_ip):
    """
    Creates or updates an SOS request.
    Validates coordinates and required fields.
    Prevents duplicate active requests by updating existing ones.
    Enforces a 24-hour rate limit on resolved/archived requests for the same device.
    """
    name = sos_data.get('name', '').strip()
    phone = sos_data.get('phone', '').strip()
    lat = sos_data.get('lat')
    lng = sos_data.get('lng')
    message = sos_data.get('message', '').strip()
    urgency = sos_data.get('urgency', 'medium').strip()
    device_id = sos_data.get('deviceId', '').strip()
    image_base64 = sos_data.get('image')

    if not name or not phone or lat is None or lng is None or not message:
        raise ValueError("Thiếu thông tin bắt buộc: tên, số điện thoại, tọa độ hoặc thông điệp cứu hộ")

    try:
        lat = float(lat)
        lng = float(lng)
    except (ValueError, TypeError):
        raise ValueError("Tọa độ kinh độ/vĩ độ không hợp lệ")

    if urgency not in ['low', 'medium', 'high']:
        urgency = 'medium'

    now_iso = datetime.now(timezone.utc).isoformat()

    requests = read_sos()

    # 1. If device_id is provided, check if there is an active SOS request for this device
    if device_id:
        for req in requests:
            if req.get('deviceId') == device_id:
                # Save new image if provided
                has_image = req.get('hasImage', False)
                if image_base64:
                    save_sos_image(req['id'], image_base64)
                    has_image = True
                
                # Update existing active request
                req['name'] = name
                req['phone'] = phone
                req['lat'] = lat
                req['lng'] = lng
                req['message'] = message
                req['urgency'] = urgency
                req['updatedAt'] = now_iso
                req['reporterIp'] = reporter_ip
                req['hasImage'] = has_image
                write_sos(requests)
                return req

        # 2. Check if this device recently completed/resolved a request within the last 24 hours
        history = read_sos_history()
        for req in history:
            if req.get('deviceId') == device_id:
                updated_at_str = req.get('updatedAt')
                if updated_at_str:
                    updated_at = None
                    try:
                        # Extract timezone offset to parse properly or strip 'Z'
                        if updated_at_str.endswith('Z'):
                            updated_at_str = updated_at_str[:-1] + '+00:00'
                        updated_at = datetime.fromisoformat(updated_at_str)
                    except (ValueError, TypeError):
                        pass
                    
                    if updated_at:
                        diff = datetime.now(timezone.utc) - updated_at
                        if timedelta(seconds=0) <= diff < timedelta(hours=2):
                            raise ValueError("Thiết bị này đã gửi yêu cầu cứu nạn trong vòng 2 giờ qua. Yêu cầu trước đó đã được giải quyết hoặc lưu trữ.")

    # 3. Create a new active request
    sos_id = str(uuid.uuid4())
    has_image = False
    if image_base64:
        save_sos_image(sos_id, image_base64)
        has_image = True

    new_request = {
        "id": sos_id,
        "name": name,
        "phone": phone,
        "lat": lat,
        "lng": lng,
        "message": message,
        "urgency": urgency,
        "status": "pending",
        "createdAt": now_iso,
        "updatedAt": now_iso,
        "reporterIp": reporter_ip,
        "deviceId": device_id,
        "hasImage": has_image
    }

    requests.append(new_request)
    write_sos(requests)
    return new_request

def update_sos_status(sos_id, status):
    """Updates the status of an SOS request. If status is resolved or cancelled, move to history."""
    if status not in ['pending', 'processing', 'resolved', 'cancelled']:
        raise ValueError("Trạng thái SOS không hợp lệ")

    requests = read_sos()
    found = False
    updated_req = None

    for i, req in enumerate(requests):
        if req.get('id') == sos_id:
            req['status'] = status
            req['updatedAt'] = datetime.now(timezone.utc).isoformat()
            updated_req = req
            found = True
            
            # If resolved or cancelled, remove from active requests and move to history
            if status in ['resolved', 'cancelled']:
                requests.pop(i)
                write_sos(requests)
                history = read_sos_history()
                history.append(updated_req)
                write_sos_history(history)
            else:
                write_sos(requests)
            break

    if not found:
        # Check in history to allow reverting back to pending or processing
        history = read_sos_history()
        for i, req in enumerate(history):
            if req.get('id') == sos_id:
                req['status'] = status
                req['updatedAt'] = datetime.now(timezone.utc).isoformat()
                updated_req = req
                found = True
                
                if status in ['pending', 'processing']:
                    history.pop(i)
                    write_sos_history(history)
                    active = read_sos()
                    active.append(updated_req)
                    write_sos(active)
                else:
                    write_sos_history(history)
                break
        
        if not found:
            raise KeyError("Không tìm thấy yêu cầu SOS")

    return updated_req

def delete_sos(sos_id):
    """Deletes/removes an SOS request, its image, and comments from the system."""
    # Delete image and comments if they exist
    delete_sos_image(sos_id)
    delete_sos_comments(sos_id)

    requests = read_sos()
    initial_len = len(requests)
    filtered = [req for req in requests if req.get('id') != sos_id]

    if len(filtered) != initial_len:
        write_sos(filtered)
        return True

    # Check in history
    history = read_sos_history()
    initial_hist_len = len(history)
    filtered_hist = [req for req in history if req.get('id') != sos_id]

    if len(filtered_hist) != initial_hist_len:
        write_sos_history(filtered_hist)
        return True

    raise KeyError("Không tìm thấy yêu cầu SOS")

def get_sos_comment_file_path(sos_id):
    """Returns the dedicated JSON file path for comments of a specific SOS request ID."""
    safe_id = "".join(c for c in sos_id if c.isalnum() or c in ('-','_'))
    return os.path.join(HOTEL_CONFIG_DIR, f"comments_{safe_id}.json")

def read_sos_comments(sos_id):
    """Reads SOS comments for a specific SOS request ID."""
    file_path = get_sos_comment_file_path(sos_id)
    with comments_lock:
        if not os.path.exists(file_path):
            return []
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            return []

def write_sos_comments(sos_id, data):
    """Writes SOS comments for a specific SOS request ID."""
    file_path = get_sos_comment_file_path(sos_id)
    with comments_lock:
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        try:
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=4)
            return True
        except Exception as e:
            print(f"Error writing SOS comments file: {e}")
            return False

def get_sos_comments(sos_id):
    """Returns all comments for the specified SOS request ID."""
    return read_sos_comments(sos_id)

def add_sos_comment(sos_id, author, message, is_admin_flag):
    """Creates a new comment for the specified SOS request."""
    if not message.strip():
        raise ValueError("Nội dung bình luận không được để trống")
    
    comments = read_sos_comments(sos_id)
        
    new_comment = {
        "id": str(uuid.uuid4()),
        "author": author,
        "message": message.strip(),
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "isAdmin": bool(is_admin_flag)
    }
    
    comments.append(new_comment)
    write_sos_comments(sos_id, comments)
    return new_comment

def delete_sos_comments(sos_id):
    """Deletes all comments associated with the specified SOS request ID."""
    file_path = get_sos_comment_file_path(sos_id)
    with comments_lock:
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
                return True
            except Exception as e:
                print(f"Error deleting comments file {file_path}: {e}")
    return False
