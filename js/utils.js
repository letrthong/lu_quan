export const decodeBase64 = (str) => {
    if (!str) return "";
    try {
        return decodeURIComponent(escape(atob(str)));
    } catch (e) {
        return str;
    }
};

export const encodeBase64 = (str) => {
    if (!str) return "";
    return btoa(unescape(encodeURIComponent(str)));
};

export const processImageUpload = (file) => {
    return new Promise((resolve, reject) => {
        if (!file) return reject("Vui lòng chọn tệp ảnh.");
        if (!file.type.startsWith('image/')) return reject("Vui lòng chọn một tệp hình ảnh hợp lệ.");

        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        
        img.onload = () => {
            URL.revokeObjectURL(objectUrl);
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            const MAX_SIZE = 800;

            if (width > height && width > MAX_SIZE) {
                height = Math.round((height * MAX_SIZE) / width);
                width = MAX_SIZE;
            } else if (height > MAX_SIZE) {
                width = Math.round((width * MAX_SIZE) / height);
                height = MAX_SIZE;
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            resolve(canvas.toDataURL('image/webp', 0.8));
        };
        
        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject("Không thể xử lý hình ảnh này. Vui lòng thử ảnh khác.");
        };

        img.src = objectUrl;
    });
};

export const isValidPhoneNumber = (phone) => {
    if (!phone) return false;
    const cleanPhone = phone.replace(/\s+/g, '');
    return /^[0-9]{8,11}$/.test(cleanPhone);
};

export const calculateDistance = (lat1, lng1, lat2, lng2) => {
    if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) return Infinity;
    const R = 6371; // Bán kính Trái Đất (km)
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

export const removeVietnameseTones = (str) => {
    if (!str) return "";
    return str.normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/đ/g, 'd').replace(/Đ/g, 'D')
              .toLowerCase()
              .replace(/\s+/g, ' ').trim();
};
