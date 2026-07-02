export const HOTEL_TYPES = [
    { id: 'hotel', label: 'Khách sạn' },
    { id: 'restaurant', label: 'Nhà hàng - Quán ăn' },
    { id: 'entertainment', label: 'Điểm tham quan' },
    { id: 'homestay', label: 'Ở tại nhà người dân' },
    { id: 'resort', label: 'Khu nghỉ dưỡng' },
    { id: 'villa', label: 'Biệt thự' },
    { id: 'motel', label: 'Nhà nghỉ' },
    { id: 'shop', label: 'Cửa hàng' },
    { id: 'coffee', label: 'Quán cà phê' },
    { id: 'transport', label: 'Phương tiện di chuyển' },
    { id: 'local_food', label: 'Quán ăn địa phương' },
    { id: 'car', label: 'Taxi' },
    { id: 'medical', label: 'Cơ sở y tế' },
    { id: 'religion', label: 'Cơ sở tôn giáo' },
    { id: 'gas_station', label: 'Trạm xăng' },
    { id: 'ev_station', label: 'Trạm sạc xe điện' },
    { id: 'other', label: 'Khác' }
];

// Danh sách các loại hình không bắt buộc nhập số điện thoại
export const OPTIONAL_PHONE_TYPES = ['entertainment', 'local_food', 'religion', 'gas_station', 'ev_station'];

export const getIconForHotelType = (type) => {
    switch (type) {
        case 'restaurant': return 'utensils';
        case 'entertainment': return 'ticket';
        case 'resort': return 'umbrella';
        case 'villa': return 'home';
        case 'homestay': return 'heart';
        case 'shop': return 'store';
        case 'coffee': return 'coffee';
        case 'car': return 'car';
        case 'medical': return 'cross';
        case 'religion': return 'landmark';
        case 'gas_station': return 'fuel';
        case 'ev_station': return 'zap';
        case 'motel': return 'bed-double';
        case 'hotel': return 'building';
        case 'transport': return 'bus';
        case 'local_food': return 'coffee';
        default: return 'map-pin';
    }
};

export const REPORT_REASONS = {
    "wrong_phone": "Số điện thoại sai",
    "wrong_hotel_name": "Tên lữ quán sai",
    "wrong_map_location": "Vị trí trên bản đồ sai",
    "wrong_address": "Địa chỉ không đúng",
    "website_broken": "Website không hoạt động",
    "hotel_closed": "Lữ quán đã đóng cửa",
    "spam_or_fake": "Thông tin giả mạo/Spam",
    "other": "Lý do khác"
};

export const getReasonText = (reason) => {
    return REPORT_REASONS[reason] || reason;
};

export const getTypeLabel = (type) => {
    const found = HOTEL_TYPES.find(t => t.id === type);
    return found ? found.label : type;
};