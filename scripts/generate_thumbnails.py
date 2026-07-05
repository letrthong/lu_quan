#!/usr/bin/env python3
"""
Script tạo thumbnail cho tất cả hotels trong config/hotel_connect.
Thumbnail ~60x60px, format webp, ~1-3KB thay vì 50-100KB.

Usage: python scripts/generate_thumbnails.py
"""

import os
import sys
import json
import base64
import io
from pathlib import Path

# Thêm thư viện Pillow để xử lý image
try:
    from PIL import Image
except ImportError:
    print("Cần cài đặt Pillow: pip install Pillow")
    sys.exit(1)

# Config
THUMBNAIL_SIZE = (60, 60)  # width x height
THUMBNAIL_QUALITY = 50  # webp quality (0-100)
HOTEL_CONFIG_DIR = Path(__file__).parent.parent / "config" / "hotel_connect"


def decode_base64_image(base64_str: str) -> Image.Image | None:
    """Decode base64 image string thành PIL Image."""
    if not base64_str:
        return None
    
    try:
        # Tách phần header nếu có (data:image/webp;base64,...)
        if "base64," in base64_str:
            base64_str = base64_str.split("base64,")[1]
        
        image_data = base64.b64decode(base64_str)
        image = Image.open(io.BytesIO(image_data))
        return image
    except Exception as e:
        print(f"  [WARN] Không thể decode image: {e}")
        return None


def create_thumbnail(image: Image.Image, size: tuple = THUMBNAIL_SIZE) -> str:
    """
    Resize image và convert sang base64 webp.
    Trả về base64 string với header data:image/webp;base64,...
    """
    # Convert sang RGB nếu là RGBA (webp không hỗ trợ tốt transparency nhỏ)
    if image.mode in ('RGBA', 'P'):
        image = image.convert('RGB')
    
    # Resize với LANCZOS để chất lượng tốt
    image.thumbnail(size, Image.Resampling.LANCZOS)
    
    # Save sang buffer với format webp
    buffer = io.BytesIO()
    image.save(buffer, format='WEBP', quality=THUMBNAIL_QUALITY, method=6)
    buffer.seek(0)
    
    # Encode base64
    b64_data = base64.b64encode(buffer.read()).decode('utf-8')
    return f"data:image/webp;base64,{b64_data}"


def process_hotel_file(file_path: Path) -> tuple[int, int, int]:
    """
    Xử lý 1 file JSON hotel.
    Returns: (total_hotels, created_thumbnails, skipped)
    """
    print(f"\nĐang xử lý: {file_path.name}")
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            hotels = json.load(f)
    except Exception as e:
        print(f"  [ERROR] Không thể đọc file: {e}")
        return (0, 0, 0)
    
    if not isinstance(hotels, list):
        print(f"  [SKIP] File không phải là array")
        return (0, 0, 0)
    
    total = len(hotels)
    created = 0
    skipped = 0
    modified = False
    
    for hotel in hotels:
        hotel_name = hotel.get('name', 'N/A')[:30]
        
        # Skip nếu đã có thumbnail
        if hotel.get('thumbnail'):
            skipped += 1
            continue
        
        # Skip nếu không có image
        image_str = hotel.get('image')
        if not image_str:
            skipped += 1
            continue
        
        # Decode và tạo thumbnail
        image = decode_base64_image(image_str)
        if not image:
            skipped += 1
            continue
        
        try:
            thumbnail = create_thumbnail(image)
            hotel['thumbnail'] = thumbnail
            created += 1
            modified = True
            
            # Tính size để log
            thumb_size = len(thumbnail)
            orig_size = len(image_str)
            ratio = (1 - thumb_size / orig_size) * 100
            print(f"  ✓ {hotel_name}... ({orig_size//1024}KB → {thumb_size//1024}KB, giảm {ratio:.0f}%)")
            
        except Exception as e:
            print(f"  [ERROR] {hotel_name}: {e}")
            skipped += 1
    
    # Ghi lại file nếu có thay đổi
    if modified:
        try:
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(hotels, f, ensure_ascii=False, indent=4)
            print(f"  → Đã lưu file với {created} thumbnails mới")
        except Exception as e:
            print(f"  [ERROR] Không thể ghi file: {e}")
    
    return (total, created, skipped)


def main():
    print("=" * 60)
    print("GENERATE THUMBNAILS FOR HOTELS")
    print(f"Thư mục: {HOTEL_CONFIG_DIR}")
    print(f"Kích thước thumbnail: {THUMBNAIL_SIZE[0]}x{THUMBNAIL_SIZE[1]}px")
    print("=" * 60)
    
    if not HOTEL_CONFIG_DIR.exists():
        print(f"[ERROR] Thư mục không tồn tại: {HOTEL_CONFIG_DIR}")
        sys.exit(1)
    
    # Tìm tất cả file hotel_*.json (bỏ qua hotel_schema.json, hotel_requests.json)
    hotel_files = sorted(HOTEL_CONFIG_DIR.glob("hotel_*.json"))
    hotel_files = [f for f in hotel_files if not f.name.startswith("hotel_schema") 
                   and not f.name.startswith("hotel_requests")
                   and not f.name.startswith("hotel_report")]
    
    print(f"\nTìm thấy {len(hotel_files)} file hotel data")
    
    total_hotels = 0
    total_created = 0
    total_skipped = 0
    
    for file_path in hotel_files:
        hotels, created, skipped = process_hotel_file(file_path)
        total_hotels += hotels
        total_created += created
        total_skipped += skipped
    
    print("\n" + "=" * 60)
    print("KẾT QUẢ:")
    print(f"  - Tổng số hotels: {total_hotels}")
    print(f"  - Thumbnails đã tạo: {total_created}")
    print(f"  - Bỏ qua (đã có hoặc không có image): {total_skipped}")
    print("=" * 60)


if __name__ == "__main__":
    main()
