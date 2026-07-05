"""
image_utils.py
Utilities for image processing - thumbnail generation.
"""

import base64
import io
import logging

try:
    from PIL import Image
    PILLOW_AVAILABLE = True
except ImportError:
    PILLOW_AVAILABLE = False
    logging.warning("Pillow không được cài đặt. Thumbnail sẽ không được tạo tự động.")

# Config thumbnail
THUMBNAIL_SIZE = (60, 60)
THUMBNAIL_QUALITY = 50


def create_thumbnail_from_base64(image_base64: str) -> str | None:
    """
    Tạo thumbnail từ base64 image string.
    
    Args:
        image_base64: Base64 encoded image (có thể có header data:image/...;base64,)
    
    Returns:
        Base64 thumbnail string với header data:image/webp;base64,...
        Hoặc None nếu không thể tạo
    """
    if not PILLOW_AVAILABLE:
        return None
    
    if not image_base64:
        return None
    
    try:
        # Tách phần header nếu có (data:image/webp;base64,...)
        if "base64," in image_base64:
            image_data_str = image_base64.split("base64,")[1]
        else:
            image_data_str = image_base64
        
        # Decode base64 → bytes
        image_data = base64.b64decode(image_data_str)
        
        # Mở image với Pillow
        image = Image.open(io.BytesIO(image_data))
        
        # Convert sang RGB nếu là RGBA
        if image.mode in ('RGBA', 'P'):
            image = image.convert('RGB')
        
        # Resize với LANCZOS để chất lượng tốt
        image.thumbnail(THUMBNAIL_SIZE, Image.Resampling.LANCZOS)
        
        # Save sang buffer với format webp
        buffer = io.BytesIO()
        image.save(buffer, format='WEBP', quality=THUMBNAIL_QUALITY, method=6)
        buffer.seek(0)
        
        # Encode base64
        b64_data = base64.b64encode(buffer.read()).decode('utf-8')
        return f"data:image/webp;base64,{b64_data}"
        
    except Exception as e:
        logging.warning(f"Không thể tạo thumbnail: {e}")
        return None


def ensure_thumbnail(hotel_data: dict, force_regenerate: bool = False) -> dict:
    """
    Đảm bảo hotel_data có thumbnail nếu có image.
    Tạo thumbnail tự động nếu chưa có hoặc force_regenerate=True.
    
    Args:
        hotel_data: Dict chứa thông tin hotel (có thể có 'image')
        force_regenerate: Nếu True, tạo lại thumbnail ngay cả khi đã có
    
    Returns:
        hotel_data đã được bổ sung 'thumbnail' nếu cần
    """
    image = hotel_data.get('image')
    
    if not image:
        return hotel_data
    
    # Nếu đã có thumbnail và không force, giữ nguyên
    existing_thumbnail = hotel_data.get('thumbnail')
    if existing_thumbnail and not force_regenerate:
        return hotel_data
    
    # Tạo thumbnail mới
    thumbnail = create_thumbnail_from_base64(image)
    if thumbnail:
        hotel_data['thumbnail'] = thumbnail
    
    return hotel_data
