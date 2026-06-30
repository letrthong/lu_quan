
const HOTEL_TYPES = [
    { id: 'hotel', label: 'Khách sạn' },
    { id: 'restaurant', label: 'Nhà hàng - Quán ăn' },
    { id: 'entertainment', label: 'Điểm tham quan' },
    { id: 'homestay', label: 'Ở tại nhà người dân' },
    { id: 'resort', label: 'Khu nghỉ dưỡng' },
    { id: 'villa', label: 'Biệt thự' },
    { id: 'motel', label: 'Nhà nghỉ' },
    { id: 'shop', label: 'Cửa hàng' },
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
const OPTIONAL_PHONE_TYPES = ['entertainment', 'local_food', 'religion', 'gas_station', 'ev_station'];

const getIconForHotelType = (type) => {
    switch (type) {
        case 'restaurant': return 'utensils';
        case 'entertainment': return 'ticket';
        case 'resort': return 'umbrella';
        case 'villa': return 'home';
        case 'homestay': return 'heart';
        case 'shop': return 'store';
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