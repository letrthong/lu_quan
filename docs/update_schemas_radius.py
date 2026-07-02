import json
import os

# Đường dẫn tới file JSON schema (Chỉnh sửa nếu cần thiết)
SCHEMA_PATH = os.path.join(os.path.dirname(__file__), '../config/hotel_schema.json')

def update_schemas():
    if not os.path.exists(SCHEMA_PATH):
        print(f"[-] File không tồn tại: {SCHEMA_PATH}")
        return

    with open(SCHEMA_PATH, 'r', encoding='utf-8') as f:
        try:
            schemas = json.load(f)
        except json.JSONDecodeError:
            print("[-] Lỗi đọc cấu trúc file JSON.")
            return

    updated_count = 0
    for schema in schemas:
        if 'radius' not in schema:
            schema['radius'] = 2
            updated_count += 1

    if updated_count > 0:
        with open(SCHEMA_PATH, 'w', encoding='utf-8') as f:
            json.dump(schemas, f, ensure_ascii=False, indent=4)
        print(f"[+] Đã cập nhật thành công {updated_count} khu vực, tự động thêm 'radius: 2'.")
    else:
        print("[+] Tất cả các khu vực đều đã có thuộc tính 'radius'. Không cần cập nhật thêm.")

if __name__ == '__main__':
    update_schemas()