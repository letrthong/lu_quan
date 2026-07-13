/**
 * HotelAPI - Module chịu trách nhiệm giao tiếp với Backend
 */
const HotelAPI = {
    baseUrl: "",
    bannedWords: null,

    // Lấy danh sách từ khóa cấm từ file cấu hình tĩnh
    getBannedWords: async () => {
        if (HotelAPI.bannedWords !== null) return HotelAPI.bannedWords;
        try {
            const res = await fetch('/luquan/js/banned_words.json');
            if (res.ok) {
                HotelAPI.bannedWords = await res.json();
            } else {
                HotelAPI.bannedWords = ["sex", "tinhduc"];
            }
        } catch (e) {
            console.error("Lỗi khi tải danh sách từ cấm:", e);
            HotelAPI.bannedWords = ["sex", "tinhduc"]; // Fallback an toàn
        }
        return HotelAPI.bannedWords;
    },

    // Lấy danh sách khách sạn
    // Hàm này giờ sẽ nhận một mảng các đường dẫn file để tải
    fetchHotelsByFilePaths: async (filePaths = []) => {
        if (!filePaths || filePaths.length === 0) {
            return [];
        }
        const fetchPromises = filePaths.map(path =>
            fetch(`${HotelAPI.baseUrl}/api/hotelconnect/v1/config/${path}`)
                .then(res => {
                    if (!res.ok) {
                        // Phân loại lỗi: Nếu 404 thì chỉ là cảnh báo nhẹ (do khu vực mới chưa có file)
                        if (res.status === 404) {
                            console.warn(`Khu vực mới chưa có file dữ liệu khách sạn (404): ${path}`);
                            return []; // Trả về mảng rỗng nếu chưa có dữ liệu cho tỉnh mới
                        } else {
                            console.error(`Lỗi ${res.status} khi tải file: ${path}`);
                            throw new Error(`Lỗi ${res.status} khi tải file: ${path}`);
                        }
                    }
                    return res.json();
                })
                .catch(err => {
                    console.error(`Lỗi mạng khi tải ${path}:`, err);
                    throw err;
                })
        );

        const hotelArrays = await Promise.all(fetchPromises);
        return hotelArrays.flat();
    },

    /**
     * Lấy danh sách hotels theo locationIds (BULK API - nhanh hơn)
     * Gọi 1 request duy nhất thay vì nhiều requests song song
     * @param {string[]} locationIds - Mảng các locationId hoặc ['all'] để lấy tất cả
     * @returns {Promise<Array>} - Danh sách hotels
     */
    fetchHotelsBulk: async (locationIds = []) => {
        if (!locationIds || locationIds.length === 0) {
            return [];
        }

        try {
            const idsParam = locationIds.includes('all') ? 'all' : locationIds.join(',');
            const response = await fetch(
                `${HotelAPI.baseUrl}/api/hotelconnect/v1/hotels/bulk?locationIds=${encodeURIComponent(idsParam)}`
            );

            if (!response.ok) {
                console.error(`Lỗi ${response.status} khi tải bulk hotels`);
                throw new Error(`Lỗi ${response.status} khi tải bulk hotels`);
            }

            const result = await response.json();
            return result.data || [];
        } catch (err) {
            console.error('Lỗi mạng khi tải bulk hotels:', err);
            throw err;
        }
    },

    // Gửi yêu cầu đăng ký khách sạn mới
    submitHotelRequest: async (newRequestData) => {
        const response = await fetch(`${HotelAPI.baseUrl}/api/hotelconnect/v1/hotels/request`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newRequestData)
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({ error: "Lỗi không xác định" }));
            throw new Error(err.error || "Lỗi khi gửi yêu cầu đăng ký");
        }
        return await response.json();
    },

    // Lấy danh sách yêu cầu đăng ký khách sạn (Pending Requests)
    fetchPendingRequests: async () => {
        const response = await fetch(`${HotelAPI.baseUrl}/api/hotelconnect/v1/hotels/request`);
        if (!response.ok) {
            throw new Error("Lỗi khi tải danh sách yêu cầu chờ duyệt");
        }
        return await response.json();
    },

    // Phê duyệt một yêu cầu khách sạn
    approveHotelRequest: async (requestId) => {
        const response = await fetch(`${HotelAPI.baseUrl}/api/hotelconnect/v1/requests/${requestId}/approve`, {
            method: 'POST'
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({ error: "Lỗi không xác định" }));
            throw new Error(err.error || "Lỗi khi phê duyệt yêu cầu");
        }
        return await response.json();
    },

    // Từ chối một yêu cầu khách sạn
    rejectHotelRequest: async (requestId) => {
        const response = await fetch(`${HotelAPI.baseUrl}/api/hotelconnect/v1/requests/${requestId}/reject`, {
            method: 'POST'
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({ error: "Lỗi không xác định" }));
            throw new Error(err.error || "Lỗi khi từ chối yêu cầu");
        }
        return await response.json();
    },

    // Cập nhật một yêu cầu khách sạn đang chờ duyệt
    updateHotelRequest: async (requestId, requestData) => {
        const response = await fetch(`${HotelAPI.baseUrl}/api/hotelconnect/v1/requests/${requestId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({ error: "Lỗi không xác định" }));
            throw new Error(err.error || "Lỗi khi cập nhật yêu cầu");
        }
        return await response.json();
    },

    // Gửi báo cáo lỗi cho một khách sạn
    submitReport: async (reportData) => {
        const response = await fetch(`${HotelAPI.baseUrl}/api/hotelconnect/v1/hotels/reports`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(reportData)
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({ error: "Lỗi không xác định" }));
            throw new Error(err.error || "Lỗi khi gửi báo cáo");
        }
        return await response.json();
    },

    // Lấy danh sách báo cáo lỗi
    fetchReports: async () => {
        const response = await fetch(`${HotelAPI.baseUrl}/api/hotelconnect/v1/hotels/reports`);
        if (!response.ok) {
            throw new Error("Lỗi khi tải danh sách báo cáo");
        }
        return await response.json();
    },

    // Lấy tất cả báo cáo lỗi cho một khách sạn cụ thể
    fetchReportsForHotel: async (hotelId) => {
        const response = await fetch(`${HotelAPI.baseUrl}/api/hotelconnect/v1/hotels/${hotelId}/reports`);
        if (!response.ok) {
            throw new Error(`Lỗi khi tải chi tiết báo cáo cho khách sạn ${hotelId}`);
        }
        return await response.json();
    },

    // Xóa một báo cáo lỗi
    deleteReport: async (reportId) => {
        const response = await fetch(`${HotelAPI.baseUrl}/api/hotelconnect/v1/hotels/reports/${reportId}`, {
            method: 'DELETE'
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({ error: "Lỗi không xác định" }));
            throw new Error(err.error || "Lỗi khi xóa báo cáo");
        }
        return await response.json();
    },

    // Lấy danh sách khách sạn theo trạng thái
    fetchHotelsByStatus: async (status) => {
        const response = await fetch(`${HotelAPI.baseUrl}/api/hotelconnect/v1/hotels/status/${status}`);
        if (!response.ok) {
            throw new Error(`Lỗi khi tải danh sách khách sạn với trạng thái ${status}`);
        }
        return await response.json();
    },

    // Cập nhật trạng thái của khách sạn
    setHotelStatus: async (hotelId, status) => {
        const response = await fetch(`${HotelAPI.baseUrl}/api/hotelconnect/v1/hotels/${hotelId}/status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: status })
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({ error: "Lỗi không xác định" }));
            throw new Error(err.error || "Lỗi khi cập nhật trạng thái");
        }
        return await response.json();
    },

    // Cập nhật thông tin khách sạn đã duyệt
    updateHotel: async (hotelId, hotelData) => {
        const response = await fetch(`${HotelAPI.baseUrl}/api/hotelconnect/v1/hotels/${hotelId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(hotelData)
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({ error: "Lỗi không xác định" }));
            throw new Error(err.error || "Lỗi khi cập nhật khách sạn");
        }
        return await response.json();
    },

    // Xóa một khách sạn đã duyệt
    deleteHotel: async (hotelId) => {
        const response = await fetch(`${HotelAPI.baseUrl}/api/hotelconnect/v1/hotels/${hotelId}`, {
            method: 'DELETE'
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({ error: "Lỗi không xác định" }));
            throw new Error(err.error || "Lỗi khi xóa khách sạn");
        }
        return await response.json();
    },

    // Lấy danh sách schema (Tỉnh/Thành phố)
    getSchemas: async () => {
        try {
            const response = await fetch(`${HotelAPI.baseUrl}/api/hotelconnect/v1/schema`);
            if (!response.ok) {
                throw new Error(`Không thể tải cấu hình các khu vực (Mã lỗi: ${response.status}). Vui lòng tải lại trang hoặc thử lại sau.`);
            }
            const schemas = await response.json();
            return schemas.sort((a, b) => a.locationName.localeCompare(b.locationName, 'vi'));
        } catch (error) {
            console.error("Lỗi khi lấy danh sách thành phố:", error);
            throw error;
        }
    },

    // Thêm một schema mới
    addSchema: async (schemaData) => {
        const response = await fetch(`${HotelAPI.baseUrl}/api/hotelconnect/v1/schema`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(schemaData)
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({ error: "Lỗi không xác định" }));
            throw new Error(err.error || "Lỗi khi thêm schema");
        }
        return await response.json();
    },

    // Cập nhật một schema
    updateSchema: async (id, schemaData) => {
        const response = await fetch(`${HotelAPI.baseUrl}/api/hotelconnect/v1/schema/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(schemaData)
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({ error: "Lỗi không xác định" }));
            throw new Error(err.error || "Lỗi khi cập nhật schema");
        }
        return await response.json();
    },

    // Xóa một schema
    deleteSchema: async (id) => {
        const response = await fetch(`${HotelAPI.baseUrl}/api/hotelconnect/v1/schema/${id}`, {
            method: 'DELETE'
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({ error: "Lỗi không xác định" }));
            throw new Error(err.error || "Lỗi khi xóa schema");
        }
        return await response.json();
    },

    /**
     * Lấy full detail của 1 hotel (bao gồm image, description)
     * Gọi khi user click vào hotel cụ thể
     * @param {string} hotelId - ID của hotel cần lấy detail
     * @returns {Promise<Object>} - Full hotel data bao gồm image, description
     */
    fetchHotelDetail: async (hotelId) => {
        if (!hotelId) return null;

        try {
            const response = await fetch(
                `${HotelAPI.baseUrl}/api/hotelconnect/v1/hotels/${hotelId}/detail`
            );

            if (!response.ok) {
                console.error(`Lỗi ${response.status} khi tải chi tiết hotel ${hotelId}`);
                return null;
            }

            const result = await response.json();
            return result.data || null;
        } catch (err) {
            console.error(`Lỗi mạng khi tải chi tiết hotel ${hotelId}:`, err);
            return null;
        }
    },

    // Lấy danh sách cứu hộ SOS
    fetchSosRequests: async (includeHistory = false) => {
        const response = await fetch(`${HotelAPI.baseUrl}/api/hotelconnect/v1/sos?include_history=${includeHistory}`);
        if (!response.ok) {
            throw new Error("Lỗi khi tải danh sách yêu cầu cứu hộ SOS");
        }
        return await response.json();
    },

    // Gửi yêu cầu cứu hộ SOS mới
    submitSosRequest: async (sosData) => {
        const response = await fetch(`${HotelAPI.baseUrl}/api/hotelconnect/v1/sos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sosData)
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({ error: "Lỗi không xác định" }));
            throw new Error(err.error || "Lỗi khi gửi yêu cầu cứu hộ SOS");
        }
        return await response.json();
    },

    // Cập nhật trạng thái yêu cầu SOS (ví dụ: resolved)
    updateSosStatus: async (sosId, status, isAdmin = false) => {
        const response = await fetch(`${HotelAPI.baseUrl}/api/hotelconnect/v1/sos/${sosId}?is_admin=${isAdmin}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({ error: "Lỗi không xác định" }));
            throw new Error(err.error || "Lỗi khi cập nhật trạng thái cứu hộ");
        }
        return await response.json();
    },

    // Xóa yêu cầu SOS
    deleteSosRequest: async (sosId, isAdmin = false) => {
        const response = await fetch(`${HotelAPI.baseUrl}/api/hotelconnect/v1/sos/${sosId}?is_admin=${isAdmin}`, {
            method: 'DELETE'
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({ error: "Lỗi không xác định" }));
            throw new Error(err.error || "Lỗi khi xóa yêu cầu cứu hộ");
        }
        return await response.json();
    },

    // Lấy danh sách bình luận của một ca SOS
    fetchSosComments: async (sosId) => {
        const response = await fetch(`${HotelAPI.baseUrl}/api/hotelconnect/v1/sos/${sosId}/comments`);
        if (!response.ok) {
            throw new Error("Lỗi khi tải bình luận");
        }
        return await response.json();
    },

    // Gửi bình luận mới cho một ca SOS
    submitSosComment: async (sosId, commentData, isAdmin = false) => {
        const response = await fetch(`${HotelAPI.baseUrl}/api/hotelconnect/v1/sos/${sosId}/comments?is_admin=${isAdmin}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(commentData)
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({ error: "Lỗi không xác định" }));
            throw new Error(err.error || "Lỗi khi gửi bình luận");
        }
        return await response.json();
    }
};

export default HotelAPI;