const { useState, useMemo, useEffect, useRef } = React;

// Polyfill for crypto.randomUUID() in non-secure contexts or older browsers
if (window.crypto && !window.crypto.randomUUID) {
    window.crypto.randomUUID = () => {
        return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
            (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
        );
    };
}

const FALLBACK_IMAGE_URL = "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=600";
const handleImageError = (e) => {
    // Prevent infinite loop if fallback image is also broken
    e.target.onerror = null;
    e.target.src = FALLBACK_IMAGE_URL;
};

// Hàm tiện ích hỗ trợ loại bỏ dấu tiếng Việt để tìm kiếm
const removeVietnameseTones = (str) => {
    if (!str) return "";
    // Tách dấu, xóa dấu, đổi đ/Đ thành d/D, chuyển chữ thường và xóa khoảng trắng thừa
    return str.normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/đ/g, 'd').replace(/Đ/g, 'D')
              .toLowerCase()
              .replace(/\s+/g, ' ').trim();
};

// Hàm tiện ích giải mã Base64
const decodeBase64 = (str) => {
    if (!str) return "";
    try {
        return decodeURIComponent(escape(atob(str)));
    } catch (e) {
        return str;
    }
};

// Hàm tiện ích mã hóa Base64
const encodeBase64 = (str) => {
    if (!str) return "";
    return btoa(unescape(encodeURIComponent(str)));
};

// Hàm tiện ích xử lý ảnh upload (resize và chuyển sang WebP base64)
const processImageUpload = (file) => {
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

// Hàm tiện ích kiểm tra số điện thoại hợp lệ của Việt Nam
const isValidPhoneNumber = (phone) => {
    if (!phone) return false;
    const cleanPhone = phone.replace(/\s+/g, '');
    return /^[0-9]{8,11}$/.test(cleanPhone);
};

// Hàm tiện ích tính khoảng cách giữa 2 tọa độ (theo km) sử dụng công thức Haversine
const calculateDistance = (lat1, lng1, lat2, lng2) => {
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

// Custom Component: Multi-Select cho Khu vực
const RegionMultiSelect = ({ provinces, selectedIds, onChange, t }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
                setSearchQuery(""); // Reset tìm kiếm khi đóng dropdown
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggleSelection = (id) => {
        let newSelection = [...selectedIds];
        if (id === 'all') {
            newSelection = newSelection.includes('all') ? [] : ['all'];
        } else {
            newSelection = newSelection.filter(v => v !== 'all');
            if (newSelection.includes(id)) {
                newSelection = newSelection.filter(v => v !== id);
            } else {
                newSelection.push(id);
            }
        }
        onChange(newSelection);
    };

    const getDisplayText = () => {
        if (selectedIds.length === 0) return t('select_region');
        if (selectedIds.includes('all')) return t('all_regions');
        if (selectedIds.length === 1) {
            const p = provinces.find(p => p.id === selectedIds[0]);
            return p ? p.locationName : t('select_region');
        }
        return `Đã chọn ${selectedIds.length} khu vực`;
    };

    // Lọc danh sách tỉnh/thành dựa trên từ khóa tìm kiếm (hỗ trợ không dấu)
    const filteredProvinces = useMemo(() => {
        if (!searchQuery) return provinces;
        const normalizedSearch = removeVietnameseTones(searchQuery);
        return provinces.filter(p => 
            removeVietnameseTones(p.locationName).includes(normalizedSearch)
        );
    }, [provinces, searchQuery]);

    return (
        <div className="relative w-full" ref={dropdownRef}>
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-orange-700 pointer-events-none">
                <Icon name="map" size={14} />
            </div>
            <div 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full pl-10 pr-16 py-2.5 bg-white rounded-xl border-2 border-stone-100 hover:border-stone-200 outline-none transition-all font-bold text-xs text-stone-600 cursor-pointer flex items-center justify-between select-none"
            >
                <span className="truncate">{getDisplayText()}</span>
            </div>
            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center">
                {selectedIds.length > 0 && (
                    <button 
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onChange([]); }}
                        className="p-1.5 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-all active:scale-95"
                        title="Bỏ chọn tất cả"
                    >
                        <Icon name="x" size={14} />
                    </button>
                )}
                <div onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }} className="p-1.5 text-stone-400 cursor-pointer hover:text-stone-600 transition-transform duration-200" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} title={isOpen ? "Đóng" : "Mở"}>
                    <Icon name="chevron-down" size={16} />
                </div>
            </div>
            
            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-stone-200 rounded-xl shadow-xl max-h-[60vh] flex flex-col animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden">
                    <div className="px-3 py-2 border-b border-stone-100 bg-stone-50 flex justify-between items-center shrink-0">
                        <span className="text-[10px] font-black text-stone-500 uppercase tracking-widest">
                            {selectedIds.length > 0 ? `${selectedIds.length} đã chọn` : 'Khu vực'}
                        </span>
                        {selectedIds.length > 0 && (
                            <button 
                                onClick={(e) => { e.stopPropagation(); onChange([]); }}
                                className="text-[10px] text-red-600 font-bold hover:text-red-800 bg-red-50 hover:bg-red-100 px-2 py-1 rounded-md transition-colors flex items-center gap-1 uppercase tracking-widest active:scale-95"
                            >
                                <Icon name="trash-2" size={12} /> Bỏ chọn
                            </button>
                        )}
                    </div>
                    
                    {/* Ô tìm kiếm nhanh */}
                    <div className="p-2 border-b border-stone-100 bg-white sticky top-0 z-10">
                        <div className="relative">
                            <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none">
                                <Icon name="search" size={12} />
                            </div>
                            <input 
                                type="text"
                                placeholder="Tìm khu vực..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onClick={(e) => e.stopPropagation()} // Ngăn việc click vào input làm đóng dropdown
                                className="w-full pl-7 pr-7 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-bold text-stone-700 focus:outline-none focus:border-orange-500 focus:bg-white transition-colors"
                            />
                            {searchQuery && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setSearchQuery(""); }}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1"
                                >
                                    <Icon name="x" size={10} />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="overflow-y-auto py-1">
                    {/* Ẩn nút "Tất cả khu vực" nếu đang tìm kiếm cụ thể */}
                    {!searchQuery && (
                        <div 
                            className="px-4 py-2.5 hover:bg-stone-50 cursor-pointer flex items-center gap-3 text-xs font-bold text-stone-700 transition-colors"
                            onClick={(e) => { e.stopPropagation(); toggleSelection('all'); }}
                        >
                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selectedIds.includes('all') ? 'bg-orange-700 border-orange-700 text-white' : 'border-stone-300 bg-white'}`}>
                                {selectedIds.includes('all') && <Icon name="check" size={12} />}
                            </div>
                            {t('all_regions')}
                        </div>
                    )}
                    {filteredProvinces.length > 0 ? (
                        filteredProvinces.map(p => (
                            <div 
                                key={p.id}
                                className="px-4 py-2.5 hover:bg-stone-50 cursor-pointer flex items-center gap-3 text-xs font-bold text-stone-700 transition-colors"
                                onClick={(e) => { e.stopPropagation(); toggleSelection(p.id); }}
                            >
                                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selectedIds.includes(p.id) ? 'bg-orange-700 border-orange-700 text-white' : 'border-stone-300 bg-white'}`}>
                                    {selectedIds.includes(p.id) && <Icon name="check" size={12} />}
                                </div>
                                {p.locationName}
                            </div>
                        ))
                    ) : (
                        <div className="px-4 py-4 text-center text-xs text-stone-500 font-medium italic">
                            Không tìm thấy khu vực nào
                        </div>
                    )}
                    </div>

                    <div className="p-2 border-t border-stone-100 bg-white shrink-0 relative z-10 shadow-[0_-8px_15px_-3px_rgba(0,0,0,0.05)]">
                        <button onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} className="w-full py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm hover:shadow-md">
                            Đóng <Icon name="x" size={14} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// Custom Component: Multi-Select cho Loại hình
const TypeMultiSelect = ({ types, selectedIds, onChange, t }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggleSelection = (id) => {
        let newSelection = [...selectedIds];
        if (id === 'all') {
            newSelection = newSelection.includes('all') ? [] : ['all'];
        } else {
            newSelection = newSelection.filter(v => v !== 'all');
            if (newSelection.includes(id)) {
                newSelection = newSelection.filter(v => v !== id);
            } else {
                newSelection.push(id);
            }
        }
        onChange(newSelection);
    };

    const getDisplayText = () => {
        if (selectedIds.length === 0) return "Chọn loại hình";
        if (selectedIds.includes('all')) return t('all_types') || "Tất cả loại hình";
        if (selectedIds.length === 1) {
            const type = types.find(t => t.id === selectedIds[0]);
            return type ? type.label : "Chọn loại hình";
        }
        return `Đã chọn ${selectedIds.length} loại hình`;
    };

    return (
        <div className="relative w-full" ref={dropdownRef}>
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-orange-700 pointer-events-none">
                <Icon name="layers" size={14} />
            </div>
            <div 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full pl-10 pr-16 py-2.5 bg-white rounded-xl border-2 border-stone-100 hover:border-stone-200 outline-none transition-all font-bold text-xs text-stone-600 cursor-pointer flex items-center justify-between select-none"
            >
                <span className="truncate">{getDisplayText()}</span>
            </div>
            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center">
                {selectedIds.length > 0 && (
                    <button 
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onChange([]); }}
                        className="p-1.5 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-all active:scale-95"
                        title="Bỏ chọn tất cả"
                    >
                        <Icon name="x" size={14} />
                    </button>
                )}
                <div onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }} className="p-1.5 text-stone-400 cursor-pointer hover:text-stone-600 transition-transform duration-200" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} title={isOpen ? "Đóng" : "Mở"}>
                    <Icon name="chevron-down" size={16} />
                </div>
            </div>
            
            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-stone-200 rounded-xl shadow-xl max-h-[60vh] flex flex-col animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden">
                    <div className="px-3 py-2 border-b border-stone-100 bg-stone-50 flex justify-between items-center shrink-0">
                        <span className="text-[10px] font-black text-stone-500 uppercase tracking-widest">
                            {selectedIds.length > 0 ? `${selectedIds.length} đã chọn` : 'Loại hình'}
                        </span>
                        {selectedIds.length > 0 && (
                            <button 
                                onClick={(e) => { e.stopPropagation(); onChange([]); }}
                                className="text-[10px] text-red-600 font-bold hover:text-red-800 bg-red-50 hover:bg-red-100 px-2 py-1 rounded-md transition-colors flex items-center gap-1 uppercase tracking-widest active:scale-95"
                            >
                                <Icon name="trash-2" size={12} /> Bỏ chọn
                            </button>
                        )}
                    </div>
                    <div className="overflow-y-auto py-1">
                        <div 
                            className="px-4 py-2.5 hover:bg-stone-50 cursor-pointer flex items-center gap-3 text-xs font-bold text-stone-700 transition-colors"
                            onClick={(e) => { e.stopPropagation(); toggleSelection('all'); }}
                        >
                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selectedIds.includes('all') ? 'bg-orange-700 border-orange-700 text-white' : 'border-stone-300 bg-white'}`}>
                                {selectedIds.includes('all') && <Icon name="check" size={12} />}
                            </div>
                            {t('all_types') || "Tất cả loại hình"}
                        </div>
                        {types.map(type => (
                            <div 
                                key={type.id}
                                className="px-4 py-2.5 hover:bg-stone-50 cursor-pointer flex items-center gap-3 text-xs font-bold text-stone-700 transition-colors"
                                onClick={(e) => { e.stopPropagation(); toggleSelection(type.id); }}
                            >
                                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selectedIds.includes(type.id) ? 'bg-orange-700 border-orange-700 text-white' : 'border-stone-300 bg-white'}`}>
                                    {selectedIds.includes(type.id) && <Icon name="check" size={12} />}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Icon name={getIconForHotelType(type.id)} size={12} className="text-stone-400" />
                                    <span>{type.label}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    <div className="p-2 border-t border-stone-100 bg-white shrink-0 relative z-10 shadow-[0_-8px_15px_-3px_rgba(0,0,0,0.05)]">
                        <button onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} className="w-full py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm hover:shadow-md">
                            Đóng <Icon name="x" size={14} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const MainApp = () => {
    const { t, lang, changeLang } = window.useTranslation();
    const [hotels, setHotels] = useState([]);
    const [provinces, setProvinces] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [pendingRequests, setPendingRequests] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterLocationIds, setFilterLocationIds] = useState(() => {
        const urlParams = new URLSearchParams(window.location.search);
        let urlLocs = urlParams.get('locationIds');
        if (!urlLocs && urlParams.get('locationId')) {
            urlLocs = urlParams.get('locationId'); // Tương thích URL cũ
        }
        if (urlLocs) return urlLocs.split(',');
        const savedLocs = localStorage.getItem('luquan_last_selected_locationIds');
        if (savedLocs) { try { return JSON.parse(savedLocs); } catch (e) { return []; } }
        const oldSavedLoc = localStorage.getItem('luquan_last_selected_locationId');
        if (oldSavedLoc) return [oldSavedLoc]; // Tương thích Cache cũ
        return [];
    });
    const [filterTypeIds, setFilterTypeIds] = useState(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const urlTypes = urlParams.get('typeIds');
        if (urlTypes) return urlTypes.split(',');

        const savedTypes = localStorage.getItem('luquan_last_selected_typeIds');
        if (savedTypes) { try { return JSON.parse(savedTypes); } catch (e) { return ['all']; } }
        const oldType = localStorage.getItem('luquan_last_selected_type');
        if (oldType) return [oldType]; // Tương thích Cache cũ
        return ['all'];
    });
    const [selectedHotel, setSelectedHotel] = useState(null);
    const [showRequestForm, setShowRequestForm] = useState(false);
    const [showSchemaManager, setShowSchemaManager] = useState(false);
    const [showAboutDialog, setShowAboutDialog] = useState(false);
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'map'
    const [isAdmin, setIsAdmin] = useState(false);
    const [showAdminLogin, setShowAdminLogin] = useState(false);
    const [adminPass, setAdminPass] = useState("");
    const [adminError, setAdminError] = useState("");
    const [adminTab, setAdminTab] = useState('approved');
    const [pendingReviewHotels, setPendingReviewHotels] = useState([]);
    const [reports, setReports] = useState([]);
    const [editingHotel, setEditingHotel] = useState(null);
    const [toastMessage, setToastMessage] = useState("");
    const [reviewConfirm, setReviewConfirm] = useState(null); // { action: 'approve' | 'reject' | 'restore', hotel: object }

    // Tự động Load dữ liệu từ Backend khi ứng dụng khởi chạy
    useEffect(() => {
        // Chỉ tải danh sách các tỉnh/thành phố khi khởi động
        HotelAPI.getSchemas()
            .then(provincesData => {
                setProvinces(provincesData);
            })
            .catch(error => {
                console.error("Lỗi khi tải danh sách tỉnh:", error);
                setProvinces([]);
            });
    }, []); // Chạy 1 lần duy nhất khi component mount

    // Nạp lại danh sách Tỉnh/Thành phố sau khi đóng Modal quản lý khu vực
    // (để đảm bảo dropdown filter lấy được dữ liệu mới nếu có thay đổi)
    useEffect(() => {
        if (!showSchemaManager) {
            HotelAPI.getSchemas()
                .then(provincesData => setProvinces(provincesData))
                .catch(console.error);
        }
    }, [showSchemaManager]);

    // Load danh sách Pending Requests khi đăng nhập bằng quyền Admin
    useEffect(() => {
        if (isAdmin) {
            HotelAPI.fetchPendingRequests()
                .then(data => setPendingRequests(data))
                .catch(err => console.error("Lỗi khi tải danh sách chờ duyệt:", err));
            HotelAPI.fetchReports()
                .then(data => setReports(data))
                .catch(err => {
                    console.error("Lỗi khi tải danh sách báo cáo:", err);
                    setToastMessage(err.message || "Không thể tải báo cáo.");
                });
            Promise.all([
                HotelAPI.fetchHotelsByStatus('pending_review'),
                HotelAPI.fetchHotelsByStatus('reported')
            ]).then(([pending, reported]) => {
                const combined = [...pending, ...reported].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
                setPendingReviewHotels(combined);
            }).catch(err => {
                console.error("Lỗi khi tải danh sách cần review:", err);
                setToastMessage(err.message || "Không thể tải danh sách cần review.");
            });
        }
    }, [isAdmin]);

    // Hàm tiện ích (helper) để lấy tên Thành phố từ locationId
    const getLocationNameById = (locationId) => {
        const province = provinces.find(p => p.id === locationId);
        return province ? province.locationName : "Không rõ";
    };

    // Tải dữ liệu khách sạn khi người dùng thay đổi bộ lọc thành phố
    useEffect(() => {
        // Lưu lựa chọn mới vào Local Storage để ghi nhớ cho lần sau
        localStorage.setItem('luquan_last_selected_locationIds', JSON.stringify(filterLocationIds));

        // Không chạy nếu chưa có danh sách tỉnh
        if (provinces.length === 0 && filterLocationIds.length > 0) return; // Chờ cho danh sách tỉnh được tải xong

        let ignore = false; // Cờ kiểm soát: đánh dấu xem effect này còn hợp lệ không

        // Nếu không chọn thành phố nào, danh sách khách sạn sẽ rỗng
        if (filterLocationIds.length === 0) {
            setHotels([]);
            setSelectedHotel(null);
            return;
        }

        setIsLoading(true);
        setHotels([]);

        const loadHotels = async () => {
            let accumulatedHotels = [];

            const filePathsToFetch = filterLocationIds.includes("all")
                ? provinces.map(p => p.filePathId).filter(Boolean)
                : provinces.filter(p => filterLocationIds.includes(p.id)).map(p => p.filePathId).filter(Boolean);

            // Load từng file một để hiện dần
            for (const filePath of filePathsToFetch) {
                if (ignore) break; // Nếu người dùng thao tác mới, dừng ngay vòng lặp tải file cũ
                try {
                    const hotelsData = await HotelAPI.fetchHotelsByFilePaths([filePath]);
                    if (ignore) break; // Dừng việc cập nhật state nếu effect đã bị hủy
                    accumulatedHotels = [...accumulatedHotels, ...hotelsData];
                    setHotels([...accumulatedHotels]);
                } catch (error) {
                    console.error(`Lỗi khi tải dữ liệu cho file ${filePath}:`, error);
                }
            }

            if (ignore) return; // Bỏ qua toàn bộ phần xử lý phía sau (ẩn loading, chọn hotel...)

            // Sau khi load xong, xử lý selectedHotel
            const urlParams = new URLSearchParams(window.location.search);
            const savedHotelId = urlParams.get('hotel') || localStorage.getItem('luquan_last_selected_hotel_id');

            if (savedHotelId) {
                const hotelToSelect = accumulatedHotels.find(h => h.id === savedHotelId);
                const isPubliclyVisible = hotelToSelect && (hotelToSelect.status === 'approved' || hotelToSelect.status === 'reported');
                if (hotelToSelect && isPubliclyVisible) {
                    setSelectedHotel(hotelToSelect);
                } else {
                    setSelectedHotel(null);
                    localStorage.removeItem('luquan_last_selected_hotel_id');
                }
            } else {
                setSelectedHotel(null);
            }

            setIsLoading(false);
        };

        loadHotels();

        // Hàm dọn dẹp (Cleanup function): Chạy khi component unmount hoặc dependencies thay đổi
        return () => {
            ignore = true; // Hủy bỏ tác dụng của lần tải này nếu người dùng ấn đổi khu vực liên tục
        };
    }, [filterLocationIds, provinces]);

    // Lưu filterTypeIds vào Local Storage
    useEffect(() => {
        localStorage.setItem('luquan_last_selected_typeIds', JSON.stringify(filterTypeIds));
    }, [filterTypeIds]);

    useEffect(() => {
        // Chạy lại sau mỗi lần render để đảm bảo mọi icon mới đều được hiển thị
        // Điều này cũng khắc phục lỗi thư viện lucide CDN tải chậm hơn React
        if (window.lucide) lucide.createIcons();
    });

    // Tự động cuộn danh sách đến khách sạn đang được chọn
    useEffect(() => {
        if (selectedHotel && viewMode === 'list') {
            const element = document.getElementById(`hotel-item-${selectedHotel.id}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }

        // Tự động cuộn khung chi tiết lên đầu khi chọn khách sạn mới
        const detailContent = document.getElementById('hotel-detail-content');
        if (detailContent) {
            detailContent.scrollTop = 0;
        }
    }, [selectedHotel, viewMode]);

    // Đồng bộ trạng thái URL cho các bộ lọc và khách sạn được chọn
    const isInitialMountUrl = useRef(true);
    useEffect(() => {
        // Bỏ qua lần render đầu tiên để tránh việc vô tình xóa mất dữ liệu đã lưu
        if (isInitialMountUrl.current) {
            isInitialMountUrl.current = false;
            return;
        }
        
        const url = new URL(window.location);
        
        // 1. Đồng bộ selectedHotel
        if (selectedHotel) {
            localStorage.setItem('luquan_last_selected_hotel_id', selectedHotel.id);
            url.searchParams.set('hotel', selectedHotel.id);
        } else {
            // Nếu người dùng đóng cửa sổ chi tiết, ta cũng xóa thông tin đã lưu
            localStorage.removeItem('luquan_last_selected_hotel_id');
            url.searchParams.delete('hotel');
        }

        // 2. Đồng bộ filterLocationIds
        if (filterLocationIds.length > 0) {
            url.searchParams.set('locationIds', filterLocationIds.join(','));
        } else {
            url.searchParams.delete('locationIds');
        }
        url.searchParams.delete('locationId'); // Dọn dẹp param cũ

        // 3. Đồng bộ filterTypeIds
        if (filterTypeIds.length > 0 && !filterTypeIds.includes('all')) {
            url.searchParams.set('typeIds', filterTypeIds.join(','));
        } else {
            url.searchParams.delete('typeIds');
        }

        window.history.replaceState({}, '', url);
    }, [selectedHotel, filterLocationIds, filterTypeIds]);

    const filteredHotels = useMemo(() => {
        let list;
        if (isAdmin) {
            if (adminTab === 'pending') list = pendingRequests;
            else if (adminTab === 'pending_review') list = pendingReviewHotels;
            else if (adminTab === 'inactive') list = (hotels || []).filter(h => h.status === 'inactive');
            else if (adminTab === 'deleted') list = (hotels || []).filter(h => h.status === 'deleted');
            else list = (hotels || []).filter(h => h.status !== 'inactive' && h.status !== 'deleted');
        } else {
            list = (hotels || []).filter(h => h.status === 'approved' || h.status === 'reported');
        }

        let searchResults = list;

        if (filterTypeIds.length === 0) {
            searchResults = [];
        } else if (!filterTypeIds.includes('all')) {
            // Ưu tiên lọc loại hình trước
            searchResults = searchResults.filter(hotel => filterTypeIds.includes(hotel.type || 'other'));
        }

        const normalizedSearchTerm = removeVietnameseTones(searchTerm);
        // Chỉ chạy logic biến đổi chuỗi phức tạp khi người dùng thực sự nhập từ khóa tìm kiếm
        if (normalizedSearchTerm) {
            searchResults = searchResults.filter(hotel => {
                return removeVietnameseTones(hotel.name || "").includes(normalizedSearchTerm) ||
                       removeVietnameseTones(decodeBase64(hotel.address) || "").includes(normalizedSearchTerm);
            });
        }

        // Đưa khách sạn đang được chọn lên đầu danh sách
        if (selectedHotel) {
            const selectedIndex = searchResults.findIndex(h => h.id === selectedHotel.id);
            if (selectedIndex > 0) { // Chỉ di chuyển nếu nó không phải là phần tử đầu tiên
                const [selectedItem] = searchResults.splice(selectedIndex, 1);
                searchResults.unshift(selectedItem);
            }
        }
        return searchResults;
    }, [hotels, pendingRequests, pendingReviewHotels, searchTerm, filterLocationIds, filterTypeIds, isAdmin, adminTab, selectedHotel]);

    // Tự động ẩn Toast thông báo sau 3 giây
    useEffect(() => {
        if (toastMessage) {
            const timer = setTimeout(() => setToastMessage(""), 3000);
            return () => clearTimeout(timer);
        }
    }, [toastMessage]);

    // Hàm xử lý khi NearByComponents lấy được định vị GPS của người dùng
    const handleUserLocationUpdate = React.useCallback((loc) => {
        if (!provinces || provinces.length === 0) return;
        
        let minDistance = Infinity;

        // Tính khoảng cách từ GPS hiện tại đến tâm của TẤT CẢ các khu vực
        const distances = provinces.map(schema => {
            if (schema.lat == null || schema.lng == null) return { ...schema, dist: Infinity };
            const dist = calculateDistance(loc.lat, loc.lng, schema.lat, schema.lng);
            if (dist < minDistance) minDistance = dist;
            return { ...schema, dist };
        });

        // Tìm tất cả khu vực lân cận trong bán kính 50km (để bao phủ vùng giáp ranh) 
        // HOẶC lấy khu vực gần nhất nếu người dùng ở quá xa (tất cả đều > 50km).
        const nearbySchemas = distances.filter(s => s.dist <= 50 || s.dist === minDistance);

        if (nearbySchemas.length > 0) {
            const nearbyIds = nearbySchemas.map(s => s.id);
            const nearbyNames = nearbySchemas.map(s => s.locationName).join(', ');

            setFilterLocationIds(prev => {
                if (prev.includes('all')) return prev;
                
                // Nếu mảng bộ lọc đang có sẵn đã trùng khớp với các vùng giáp ranh này rồi thì bỏ qua
                const isSame = prev.length === nearbyIds.length && prev.every(id => nearbyIds.includes(id));
                if (isSame) return prev;
                
                setToastMessage(`Đang tải dữ liệu lân cận: ${nearbyNames}...`);
                return nearbyIds; // Load GỘP tất cả các vùng lân cận
            });
        }
    }, [provinces]);

    const getReasonText = (reason) => {
        const reasons = {
            "wrong_phone": "Số điện thoại sai",
            "wrong_hotel_name": "Tên lữ quán sai",
            "wrong_map_location": "Vị trí trên bản đồ sai",
            "wrong_address": "Địa chỉ không đúng",
            "website_broken": "Website không hoạt động",
            "hotel_closed": "Lữ quán đã đóng cửa",
            "spam_or_fake": "Thông tin giả mạo/Spam",
            "other": "Lý do khác"
        };
        return reasons[reason] || reason;
    };

    const handleAdminLogin = (e) => {
        e.preventDefault();
        if (adminPass === "1234") {
            setIsAdmin(true);
            setShowAdminLogin(false);
            setAdminPass("");
            setAdminError("");
        } else {
            setAdminError("Mật mã không đúng!");
        }
    };

    const approveRequest = (hotel) => {
        HotelAPI.approveHotelRequest(hotel.id)
            .then(response => {
                setPendingRequests(prev => prev.filter(h => h.id !== hotel.id));
                // Nếu admin đang xem thành phố vừa được duyệt, thêm khách sạn vào danh sách để cập nhật UI
            if (filterLocationIds.includes("all") || filterLocationIds.includes(response.data.locationId)) {
                    setHotels(prev => [...prev, response.data]);
                }
                setToastMessage(`Đã duyệt thành công "${hotel.name}"!`);
            })
            .catch(err => {
                console.error("Lỗi khi duyệt:", err);
                setToastMessage(err.message || "Có lỗi xảy ra khi duyệt.");
            });
    };

    const rejectRequest = (id, name) => {
        HotelAPI.rejectHotelRequest(id)
            .then(() => {
                setPendingRequests(prev => prev.filter(h => h.id !== id));
                setToastMessage(`Đã từ chối yêu cầu cho "${name}".`);
            })
            .catch(err => {
                console.error("Lỗi khi từ chối:", err);
                setToastMessage(err.message || "Có lỗi xảy ra khi từ chối.");
            });
    };

    const handleReviewApprove = (hotel) => {
        HotelAPI.setHotelStatus(hotel.id, 'approved')
            .then((response) => {
                setPendingReviewHotels(prev => prev.filter(h => h.id !== hotel.id));
                // Thêm khách sạn lại vào danh sách đã duyệt nếu đang xem khu vực đó
            if (filterLocationIds.includes("all") || filterLocationIds.includes(response.data.locationId)) {
                    setHotels(prev => {
                        if (prev.some(h => h.id === response.data.id)) {
                            return prev.map(h => h.id === response.data.id ? response.data : h);
                        }
                        return [...prev, response.data];
                    });
                }
                refreshReports(); // Tự động làm mới danh sách báo cáo
                setToastMessage(`Đã duyệt lại "${hotel.name}" và dọn dẹp các báo cáo cũ.`);
            })
            .catch(err => {
                setToastMessage(err.message || "Có lỗi xảy ra khi duyệt lại.");
            });
    };

    const handleReviewReject = (hotel) => {
        HotelAPI.setHotelStatus(hotel.id, 'inactive')
            .then((response) => {
                setPendingReviewHotels(prev => prev.filter(h => h.id !== hotel.id));
            if (response.data && (filterLocationIds.includes("all") || filterLocationIds.includes(response.data.locationId))) {
                    setHotels(prev => prev.map(h => h.id === response.data.id ? response.data : h));
                }
                setToastMessage(`Đã tạm ẩn "${hotel.name}".`);
            })
            .catch(err => {
                setToastMessage(err.message || "Có lỗi xảy ra khi tạm ẩn.");
            });
    };

    const handleRestoreHotel = (hotel) => {
        HotelAPI.setHotelStatus(hotel.id, 'approved')
            .then((response) => {
                setHotels(prev => prev.map(h => h.id === response.data.id ? response.data : h));
                setToastMessage(`Đã khôi phục hiển thị cho "${hotel.name}".`);
            })
            .catch(err => {
                setToastMessage(err.message || "Có lỗi xảy ra khi khôi phục.");
            });
    };

    const permanentlyDeleteHotel = (id, e) => {
        e.stopPropagation();
        if (!window.confirm("HÀNH ĐỘNG NÀY KHÔNG THỂ HOÀN TÁC! Bạn có chắc chắn muốn XÓA VĨNH VIỄN khách sạn này?")) {
            return;
        }
        
        HotelAPI.deleteHotel(id) // This calls the original DELETE endpoint
            .then(() => {
                setHotels(prev => prev.filter(h => h.id !== id));
                setToastMessage("Đã xóa vĩnh viễn khách sạn!");
            })
            .catch(err => {
                console.error("Lỗi khi xóa vĩnh viễn:", err);
                setToastMessage(err.message || "Có lỗi xảy ra khi xóa vĩnh viễn.");
            });
    };

    const onProcessReport = (hotelId) => {
        // Tìm khách sạn từ tất cả các danh sách có thể có để lấy thông tin đầy đủ nhất
        const hotelToEdit = hotels.find(h => h.id === hotelId) || 
                            pendingRequests.find(h => h.id === hotelId) ||
                            pendingReviewHotels.find(h => h.id === hotelId);
        
        if (hotelToEdit) {
            setEditingHotel(hotelToEdit);
        } else {
            setToastMessage("Không tìm thấy thông tin chi tiết của lữ quán này.");
        }
    };

    const startEditHotel = (hotel, e) => {
        e.stopPropagation();
        setEditingHotel(hotel);
    };

    const handleEditSuccess = (updatedHotel) => {
        if (updatedHotel.status === 'pending') {
            setPendingRequests(prev => prev.map(h => h.id === updatedHotel.id ? updatedHotel : h));
        } else {
            setHotels(prev => prev.map(h => h.id === updatedHotel.id ? updatedHotel : h));
            if (updatedHotel.status === 'pending_review' || updatedHotel.status === 'reported') {
                setPendingReviewHotels(prev => {
                    if (prev.some(h => h.id === updatedHotel.id)) {
                        return prev.map(h => h.id === updatedHotel.id ? updatedHotel : h);
                    }
                    return [updatedHotel, ...prev];
                });
            } else {
                setPendingReviewHotels(prev => prev.filter(h => h.id !== updatedHotel.id));
            }
        }

        if (selectedHotel?.id === updatedHotel.id) {
            setSelectedHotel(updatedHotel);
        }

        // Tải lại danh sách báo cáo và cần review để cập nhật giao diện
        refreshReports();
    };

    const hideHotel = (hotel, e) => {
        e.stopPropagation();
        if (!window.confirm(`Bạn có chắc chắn muốn tạm ẩn khách sạn "${hotel.name}" khỏi bản đồ?`)) {
            return;
        }
        
        HotelAPI.setHotelStatus(hotel.id, 'inactive')
            .then((response) => {
                setHotels(prev => prev.map(h => h.id === hotel.id ? (response.data || { ...h, status: 'inactive' }) : h));
                if (selectedHotel?.id === hotel.id) setSelectedHotel(null);
                setToastMessage(`Đã tạm ẩn "${hotel.name}".`);
            })
            .catch(err => {
                console.error("Lỗi khi tạm ẩn:", err);
                setToastMessage(err.message || "Có lỗi xảy ra khi cập nhật trạng thái ẩn.");
            });
    };

    const deleteHotel = (id, e) => {
        e.stopPropagation();
        if (!window.confirm("Bạn có chắc chắn muốn đưa khách sạn này vào thùng rác? Lữ quán sẽ chuyển sang trạng thái 'deleted' và tự động xóa vĩnh viễn sau 6 tháng.")) {
            return;
        }
        
        HotelAPI.setHotelStatus(id, 'deleted')
            .then((response) => {
                setHotels(prev => prev.map(h => h.id === id ? (response.data || { ...h, status: 'deleted' }) : h));
                setPendingReviewHotels(prev => prev.filter(h => h.id !== id));
                if (selectedHotel?.id === id) setSelectedHotel(null);
                setToastMessage("Đã đưa khách sạn vào danh sách chờ xóa!");
            })
            .catch(err => {
                console.error("Lỗi khi đưa vào thùng rác:", err);
                setToastMessage(err.message || "Có lỗi xảy ra khi cập nhật trạng thái xóa.");
            });
    };

    const refreshReports = () => {
        if (isAdmin) {
            HotelAPI.fetchReports()
                .then(data => setReports(data))
                .catch(err => console.error("Lỗi tải lại báo cáo:", err));
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return "Chưa rõ";
        const [year, month, day] = dateStr.split('-');
        return `${day}/${month}/${year}`;
    };

    const handleCloseHotelDetail = useCallback(() => {
        setSelectedHotel(null);
    }, []);

    const handleShare = async (hotel) => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `Khách sạn: ${hotel.name}`,
                    url: window.location.href,
                });
            } catch (err) {
                console.error('Lỗi khi chia sẻ:', err);
            }
        } else {
            navigator.clipboard.writeText(window.location.href);
            setToastMessage("Đã sao chép đường dẫn vị trí khách sạn và bạn có thể chia sẻ!");
        }
    };

    return (
        <div className="absolute inset-0 flex flex-col bg-stone-50 text-stone-900 overflow-hidden font-sans select-none">
            <Header
                isAdmin={isAdmin}
                onShowSchemaManager={() => setShowSchemaManager(true)}
                onSetAdminTab={setAdminTab}
                adminTab={adminTab}
                pendingRequestsCount={pendingRequests.length}
                pendingReviewHotelsCount={pendingReviewHotels.length}
                reportsCount={reports.length}
                onShowRequestForm={() => setShowRequestForm(true)}
                onLogoutAdmin={() => setIsAdmin(false)}
                onShowAdminLogin={() => setShowAdminLogin(true)}
            />

            <main className="flex flex-1 overflow-hidden relative min-h-0">
                {/* Sidebar / Danh sách: Fullscreen on mobile when active */}
                <div className={`
                    absolute md:relative z-10 w-full md:w-[400px] bg-white shadow-2xl transition-transform duration-300 h-full flex flex-col
                    ${viewMode === 'list' ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                `}>
                    <div className="p-4 border-b bg-stone-50/50 space-y-2">
                        
                        {/* Dropdown Lọc Tỉnh/Thành */}
                        <RegionMultiSelect 
                            provinces={provinces} 
                            selectedIds={filterLocationIds} 
                            onChange={setFilterLocationIds} 
                            t={t} 
                        />

                        <TypeMultiSelect
                            types={HOTEL_TYPES}
                            selectedIds={filterTypeIds}
                            onChange={setFilterTypeIds}
                            t={t}
                        />

                        <div className="relative">
                            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400">
                                <Icon name="search" size={16} />
                            </div>
                            <input 
                                type="text"
                                placeholder={t('search_placeholder')}
                                className="w-full pl-10 pr-20 py-3 bg-white rounded-xl border-2 border-stone-100 focus:border-orange-700 outline-none transition-all font-bold text-sm"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            {searchTerm && (
                                <button 
                                    onClick={() => setSearchTerm("")}
                                    className="absolute right-11 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 transition-colors p-1"
                                >
                                    <Icon name="x" size={14} />
                                </button>
                            )}
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 bg-stone-100 text-stone-500 text-[10px] font-black px-2 py-1 rounded-md pointer-events-none shadow-sm">
                                {filteredHotels.length}
                            </div>
                        </div>

                        {isAdmin && (
                            <AdminTabs
                                adminTab={adminTab}
                                onSetAdminTab={setAdminTab}
                                pendingRequestsCount={pendingRequests.length}
                                pendingReviewHotelsCount={pendingReviewHotels.length}
                                reportsCount={reports.length}
                                isMobile={true}
                            />
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto bg-stone-50 scrollbar-hide pb-24">
                        {isAdmin && adminTab === 'reports' ? (
                    <ReportManager reports={reports} setFilterCity={(id) => setFilterLocationIds([id])} onToast={setToastMessage} onReportDeleted={refreshReports} onProcessReport={onProcessReport} />
                        ) : (
                            <div className="p-3 space-y-3">
                                {isLoading ? (
                                    <div className="text-center py-20 opacity-50">
                                        <Icon name="loader" size={32} className="mx-auto mb-2 text-stone-400 animate-spin" />
                                        <p className="font-black uppercase text-[9px] tracking-widest italic">Đang tải dữ liệu...</p>
                                    </div>
                            ) : filterLocationIds.length === 0 ? (
                                    <div className="text-center py-20 opacity-40">
                                        <Icon name="map" size={32} className="mx-auto mb-2 text-stone-400" />
                                        <p className="font-black uppercase text-[9px] tracking-widest italic">Vui lòng chọn một khu vực để xem khách sạn</p>
                                    </div>
                            ) : filterTypeIds.length === 0 ? (
                                    <div className="text-center py-20 opacity-40">
                                        <Icon name="layers" size={32} className="mx-auto mb-2 text-stone-400" />
                                        <p className="font-black uppercase text-[9px] tracking-widest italic">Vui lòng chọn loại hình cần xem</p>
                                    </div>
                                ) : filteredHotels.length > 0 ? (
                                    filteredHotels.map(hotel => (
                                        <div 
                                            key={hotel.id}
                                            id={`hotel-item-${hotel.id}`}
                                            onClick={() => {
                                                setSelectedHotel(hotel);
                                                setViewMode('map');
                                            }}
                                            className={`p-3 bg-white rounded-2xl cursor-pointer border-2 transition-all flex gap-3 relative group
                                                ${selectedHotel?.id === hotel.id ? 'border-red-600 ring-4 ring-red-100 shadow-lg' : 'border-transparent shadow-sm'}
                                            `}
                                        >
                                            <img src={hotel.image} onError={handleImageError} className="w-16 h-16 rounded-xl object-cover shrink-0 border border-stone-100 shadow-sm" />
                                            <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                                                <div>
                                                {hotel.type && (
                                                    <span className="inline-flex items-center gap-1 w-max px-1.5 py-0.5 bg-stone-100 text-stone-600 text-[8px] font-black uppercase tracking-widest rounded border border-stone-200 mb-1">
                                                        <Icon name={getIconForHotelType(hotel.type)} size={10} />
                                                        {getTypeLabel(hotel.type)}
                                                    </span>
                                                )}
                                                    <h3 className="font-black text-stone-900 leading-tight truncate text-xs uppercase">{hotel.name}</h3>
                                                    <p className="text-[9px] text-stone-500 flex items-center gap-1 mt-0.5 font-bold truncate">
                                                    <Icon name="map-pin" size={10} className="text-orange-700" /> {decodeBase64(hotel.address)} • {getLocationNameById(hotel.locationId)}
                                                    </p>
                                                </div>
                                                <div className="flex items-center justify-between mt-1">
                                                    <div className="flex items-center gap-1 text-[8px] text-stone-400 font-bold uppercase tracking-tight">
                                                        <Icon name="calendar" size={8} /> {formatDate(hotel.updatedAt)}
                                                    </div>
                                                    {hotel.website && <div className="text-moss"><Icon name="globe" size={12} /></div>}
                                                </div>
                                            </div>

                                            {isAdmin && adminTab === 'pending' && (
                                                <div className="absolute top-2 right-2 flex gap-1">
                                                    <button onClick={(e) => startEditHotel(hotel, e)} className="bg-blue-600 text-white p-2 rounded-lg shadow-lg" title="Sửa thông tin"><Icon name="edit" size={12} /></button>
                                                    <button onClick={(e) => { e.stopPropagation(); approveRequest(hotel); }} className="bg-emerald-700 text-white p-2 rounded-lg shadow-lg"><Icon name="check" size={12} /></button>
                                                    <button onClick={(e) => { e.stopPropagation(); rejectRequest(hotel.id, hotel.name); }} className="bg-red-700 text-white p-2 rounded-lg shadow-lg"><Icon name="trash-2" size={12} /></button>
                                                </div>
                                            )}
                                            {isAdmin && adminTab === 'pending_review' && (
                                                <div className="absolute top-2 right-2 flex gap-1">
                                                    <button onClick={(e) => startEditHotel(hotel, e)} className="bg-blue-600 text-white p-2 rounded-lg shadow-lg" title="Sửa thông tin"><Icon name="edit" size={12} /></button>
                                                    <button onClick={(e) => { e.stopPropagation(); setReviewConfirm({ action: 'approve', hotel }); }} className="bg-emerald-700 text-white p-2 rounded-lg shadow-lg" title="Duyệt lại"><Icon name="check" size={12} /></button>
                                                    <button onClick={(e) => { e.stopPropagation(); setReviewConfirm({ action: 'reject', hotel }); }} className="bg-purple-700 text-white p-2 rounded-lg shadow-lg" title="Tạm ẩn"><Icon name="eye-off" size={12} /></button>
                                                </div>
                                            )}
                                            {isAdmin && adminTab === 'inactive' && (
                                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex gap-1">
                                                    <button onClick={(e) => startEditHotel(hotel, e)} className="bg-blue-600 text-white p-2 rounded-lg shadow-lg" title="Sửa thông tin"><Icon name="edit" size={12} /></button>
                                                    <button onClick={(e) => { e.stopPropagation(); setReviewConfirm({ action: 'restore', hotel }); }} className="bg-emerald-600 text-white p-2 rounded-lg shadow-lg" title="Khôi phục hiển thị"><Icon name="refresh-cw" size={12} /></button>
                                                    <button onClick={(e) => deleteHotel(hotel.id, e)} className="bg-red-700 text-white p-2 rounded-lg shadow-lg" title="Đưa vào thùng rác"><Icon name="trash-2" size={12} /></button>
                                                </div>
                                            )}
                                            {isAdmin && adminTab === 'deleted' && (
                                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex gap-1">
                                                    <button onClick={(e) => { e.stopPropagation(); setReviewConfirm({ action: 'restore', hotel }); }} className="bg-emerald-600 text-white p-2 rounded-lg shadow-lg" title="Khôi phục hiển thị"><Icon name="refresh-cw" size={12} /></button>
                                                    <button onClick={(e) => permanentlyDeleteHotel(hotel.id, e)} className="bg-red-800 text-white p-2 rounded-lg shadow-lg" title="Xóa vĩnh viễn"><Icon name="shield-x" size={12} /></button>
                                                </div>
                                            )}
                                            {isAdmin && adminTab === 'approved' && (
                                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex gap-1">
                                                    <button onClick={(e) => startEditHotel(hotel, e)} className="p-2 text-blue-600 bg-white rounded shadow hover:bg-stone-50" title="Sửa thông tin"><Icon name="edit" size={14} /></button>
                                                    <button onClick={(e) => hideHotel(hotel, e)} className="p-2 text-purple-600 bg-white rounded shadow hover:bg-stone-50" title="Tạm ẩn"><Icon name="eye-off" size={14} /></button>
                                                    <button onClick={(e) => deleteHotel(hotel.id, e)} className="p-2 text-red-600 bg-white rounded shadow hover:bg-stone-50" title="Đưa vào thùng rác"><Icon name="trash-2" size={14} /></button>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-20 opacity-30">
                                        <Icon name="search-x" size={32} className="mx-auto mb-2 text-stone-400" />
                                        <p className="font-black uppercase text-[9px] tracking-widest italic">Không có kết quả tìm kiếm</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Map View: Visible or hidden depending on toggle */}
                <div className={`
                    absolute inset-0 md:relative md:inset-auto z-10 flex-1 bg-stone-200 overflow-hidden transition-transform duration-300
                    ${viewMode === 'map' ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
                `}>
                    <div className="w-full h-full relative z-0">
                    <MainLeafletMap hotels={filteredHotels} selectedHotel={selectedHotel} onSelectHotel={setSelectedHotel} filterCity={filterLocationIds.includes("all") || filterLocationIds.length === 0 ? null : filterLocationIds} viewMode={viewMode} />
                    </div>
                </div>

                {/* Nearby View: Mobile Only */}
                <div className={`
                    absolute md:hidden z-20 w-full bg-white shadow-2xl transition-transform duration-300 h-full flex flex-col
                    ${viewMode === 'nearby' ? 'translate-x-0' : 'translate-x-full'}
                `}>
                    <NearByComponents 
                        hotels={filteredHotels} 
                        onSelectHotel={setSelectedHotel} 
                        setViewMode={setViewMode} 
                        isActive={viewMode === 'nearby'}
                        onToast={setToastMessage}
                        onLocationUpdate={handleUserLocationUpdate}
                    />
                </div>

                {/* View Switcher: Mobile Only - Đưa ra ngoài Map để không bao giờ bị che khuất */}
                <div className="md:hidden absolute bottom-0 left-0 right-0 z-40 flex bg-white border-t border-stone-200 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] pb-safe">
                    <button 
                        onClick={() => setViewMode('list')}
                        className={`flex-1 py-3 flex flex-col items-center justify-center gap-1 transition-all active:scale-95 ${viewMode === 'list' ? 'text-moss' : 'text-stone-400 hover:text-stone-600'}`}
                    >
                        <div className={`transition-transform duration-300 ${viewMode === 'list' ? '-translate-y-1 scale-110' : 'translate-y-0 scale-100'}`}>
                            <Icon name="list" size={20} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest">Danh Sách</span>
                    </button>
                    <button 
                        onClick={() => setViewMode('map')}
                        className={`flex-1 py-3 flex flex-col items-center justify-center gap-1 transition-all active:scale-95 ${viewMode === 'map' ? 'text-moss' : 'text-stone-400 hover:text-stone-600'}`}
                    >
                        <div className={`transition-transform duration-300 ${viewMode === 'map' ? '-translate-y-1 scale-110' : 'translate-y-0 scale-100'}`}>
                            <Icon name="map" size={20} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest">Bản Đồ</span>
                    </button>
                    <button 
                        onClick={() => setViewMode('nearby')}
                        className={`flex-1 py-3 flex flex-col items-center justify-center gap-1 transition-all active:scale-95 ${viewMode === 'nearby' ? 'text-moss' : 'text-stone-400 hover:text-stone-600'}`}
                    >
                        <div className={`transition-transform duration-300 ${viewMode === 'nearby' ? '-translate-y-1 scale-110' : 'translate-y-0 scale-100'}`}>
                            <Icon name="navigation" size={20} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest">Gần Đây</span>
                    </button>
                </div>

                {/* Detail Overlay (Bottom Sheet for Mobile, Floating Sidebar for PC) */}
                {selectedHotel && (
                    <HotelDetail
                        hotel={selectedHotel}
                        onClose={handleCloseHotelDetail}
                        onShare={handleShare}
                        formatDate={formatDate}
                        handleImageError={handleImageError}
                        onToast={setToastMessage} // setToastMessage is stable (React guarantees useState setters are stable)
                    />
                )}

                {/* Modals: Simplified for Mobile */}
                {showRequestForm && (
                    <HotelRequestForm 
                        provinces={provinces}
                        onClose={() => setShowRequestForm(false)}
                        onSubmitSuccess={(newRequest) => setPendingRequests(prev => [...prev, newRequest])}
                        onToast={setToastMessage}
                    />
                )}

                {editingHotel && (
                    <HotelEditForm
                        hotel={editingHotel}
                        provinces={provinces}
                        onClose={() => setEditingHotel(null)}
                        onSaveSuccess={handleEditSuccess}
                        onToast={setToastMessage}
                    />
                )}

                {/* Modal Quản lý Khu vực (Schema Manager) */}
                {showSchemaManager && (
                    <div className="fixed inset-0 bg-stone-900/80 backdrop-blur-md z-[100] flex items-center justify-center sm:p-6">
                        <div className="bg-white w-full h-full sm:h-auto sm:max-h-[95dvh] sm:max-w-5xl sm:rounded-[40px] shadow-2xl overflow-hidden flex flex-col border border-stone-100">
                            <div className="p-4 sm:p-6 bg-blue-700 text-white flex justify-between items-center shrink-0">
                                <h3 className="text-sm sm:text-lg font-black flex items-center gap-2 uppercase tracking-widest">
                                    <Icon name="map" size={20} /> Quản lý Khu vực
                                </h3>
                                <button onClick={() => setShowSchemaManager(false)} className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-colors"><Icon name="x" size={20} /></button>
                            </div>
                            
                            <div className="overflow-y-auto flex-1 bg-stone-50 pb-safe relative">
                                <SchemaManager api={HotelAPI} onToast={setToastMessage} />
                            </div>
                        </div>
                    </div>
                )}
                {/* Admin Login Modal */}
                {showAdminLogin && (
                    <div className="fixed inset-0 bg-stone-950/90 backdrop-blur-xl z-[200] flex items-center justify-center p-6">
                        <div className="bg-white w-full max-w-sm rounded-[40px] shadow-2xl p-10 text-center animate-in zoom-in-95 duration-200">
                            <div className="w-16 h-16 bg-orange-50 text-orange-700 rounded-3xl flex items-center justify-center mx-auto mb-6 transform rotate-6">
                                <Icon name="lock" size={32} />
                            </div>
                            <h3 className="text-xl font-black text-stone-900 uppercase mb-2 tracking-tight">Xác thực Admin</h3>
                            <p className="text-[9px] text-stone-400 font-black uppercase tracking-[0.2em] mb-8 italic">Phê duyệt hệ thống Luquan.vn</p>
                            
                            <form onSubmit={handleAdminLogin} className="space-y-5">
                                <input 
                                    type="password" 
                                    placeholder="MẬT MÃ"
                                    className="w-full px-6 py-4 rounded-2xl bg-stone-50 border-2 border-stone-100 focus:border-orange-700 outline-none text-center font-black text-lg tracking-[0.5em]"
                                    value={adminPass}
                                    onChange={(e) => setAdminPass(e.target.value)}
                                    autoFocus
                                />
                                {adminError && <p className="text-red-600 text-[10px] font-black uppercase">{adminError}</p>}
                                <button type="submit" className="w-full py-4 bg-moss text-white rounded-2xl font-black shadow-xl active:scale-95 transition-all uppercase text-[11px] tracking-widest">Đăng nhập</button>
                                <button type="button" onClick={() => setShowAdminLogin(false)} className="text-stone-400 font-black uppercase text-[9px] tracking-widest active:text-stone-700 py-2">Quay lại</button>
                            </form>
                        </div>
                    </div>
                )}

                {/* About Dialog Modal */}
                {showAboutDialog && (
                    <div className="fixed inset-0 bg-stone-950/90 backdrop-blur-xl z-[200] flex items-center justify-center p-6">
                        <div className="bg-white w-full max-w-2xl max-h-[95dvh] overflow-y-auto scrollbar-hide rounded-[40px] shadow-2xl p-8 text-left animate-in zoom-in-95 duration-200">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className="text-xl font-black text-stone-900 uppercase tracking-tight">Chính sách & Thông tin</h3>
                                    <p className="text-xs text-stone-500 font-bold">Lữ Quán – Nền tảng dữ liệu du lịch mở</p>
                                </div>
                                <button onClick={() => setShowAboutDialog(false)} className="p-2 bg-stone-100 rounded-xl hover:bg-stone-200 transition-colors shrink-0"><Icon name="x" size={20} /></button>
                            </div>
                            
                            <div className="text-sm text-stone-700 font-medium leading-relaxed space-y-4">
                                <p>Lữ Quán là một nền tảng hạ tầng dữ liệu du lịch, hoạt động theo nguyên tắc miễn phí – minh bạch – tự động hoá cao.</p>
                                <p>Để đảm bảo hệ thống vận hành ổn định, tiết kiệm thời gian cho cả hai bên và giữ đúng vai trò hạ tầng, chúng tôi áp dụng chính sách liên hệ như sau:</p>

                                <div>
                                    <h4 className="font-black text-stone-800 mb-2">1. Kênh liên hệ chính thức</h4>
                                    <p>Hiện tại, email là kênh liên hệ duy nhất:</p>
                                    <p className="my-2 p-3 bg-stone-100 rounded-lg border border-stone-200">📧 Email: <strong>info@telua.vn</strong></p>
                                    <p>Chúng tôi không hỗ trợ liên hệ qua điện thoại.</p>
                                    <p>Việc sử dụng email giúp:</p>
                                    <ul className="list-disc list-inside space-y-1 mt-2 pl-2">
                                        <li>Ghi nhận yêu cầu rõ ràng, có nội dung đầy đủ</li>
                                        <li>Lưu vết và xử lý theo quy trình</li>
                                        <li>Hạn chế các yêu cầu rời rạc, thiếu thông tin</li>
                                        <li>Phù hợp với mô hình vận hành tự động và dữ liệu mở</li>
                                    </ul>
                                </div>

                                <div>
                                    <h4 className="font-black text-stone-800 mb-2">2. Những trường hợp nên liên hệ</h4>
                                    <p>Vui lòng liên hệ qua email trong các trường hợp sau:</p>
                                    <div className="space-y-2 mt-2">
                                        <p><strong>✅ Chủ khách sạn / nhà nghỉ</strong></p>
                                        <ul className="list-disc list-inside space-y-1 pl-4">
                                            <li>Yêu cầu cập nhật hoặc chỉnh sửa thông tin</li>
                                            <li>Báo sai thông tin (số điện thoại, địa chỉ, vị trí bản đồ…)</li>
                                            <li>Xác nhận quyền sở hữu cơ sở lưu trú</li>
                                            <li>Gỡ thông tin theo yêu cầu chính đáng</li>
                                        </ul>
                                        <p><strong>✅ Cộng tác viên / đối tác</strong></p>
                                        <ul className="list-disc list-inside space-y-1 pl-4">
                                            <li>Đăng ký tham gia thu thập dữ liệu địa phương</li>
                                            <li>Góp ý về chất lượng dữ liệu</li>
                                            <li>Đề xuất mở rộng khu vực</li>
                                        </ul>
                                        <p><strong>✅ Người dùng</strong></p>
                                        <ul className="list-disc list-inside space-y-1 pl-4">
                                            <li>Báo lỗi dữ liệu</li>
                                            <li>Góp ý cải thiện nền tảng</li>
                                        </ul>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="font-black text-stone-800 mb-2">3. Những trường hợp KHÔNG được hỗ trợ</h4>
                                    <p>Lữ Quán không hỗ trợ các nội dung sau:</p>
                                    <ul className="list-disc list-inside space-y-1 mt-2 pl-2">
                                        <li>Hỗ trợ đặt phòng, giữ phòng, báo giá</li>
                                        <li>Giải quyết tranh chấp giữa khách và khách sạn</li>
                                        <li>Hỗ trợ kinh doanh, marketing, quảng bá riêng lẻ</li>
                                        <li>Hỗ trợ khẩn cấp qua điện thoại</li>
                                    </ul>
                                    <p className="mt-2 italic">👉 Lữ Quán không phải dịch vụ trung gian, chúng tôi không can thiệp vào hoạt động kinh doanh của các cơ sở lưu trú.</p>
                                </div>

                                <div>
                                    <h4 className="font-black text-stone-800 mb-2">4. Thời gian xử lý</h4>
                                    <ul className="list-disc list-inside space-y-1 mt-2 pl-2">
                                        <li>Mọi yêu cầu hợp lệ sẽ được xem xét và phản hồi trong 2–5 ngày làm việc</li>
                                        <li>Thời gian có thể lâu hơn đối với các yêu cầu cần xác minh thực tế</li>
                                        <li>Các thay đổi được phê duyệt sẽ được đồng bộ tự động lên hệ thống dữ liệu công khai</li>
                                    </ul>
                                </div>

                                <div>
                                    <h4 className="font-black text-stone-800 mb-2">5. Nguyên tắc vận hành</h4>
                                    <ul className="list-disc list-inside space-y-1 mt-2 pl-2">
                                        <li>Lữ Quán ưu tiên hệ thống và quy trình, không xử lý theo cảm tính</li>
                                        <li>Mọi thay đổi đều phải phù hợp với dữ liệu mở – minh bạch</li>
                                        <li>Chúng tôi chỉ xử lý ngoại lệ, phần lớn dữ liệu được duy trì bởi hệ thống và cộng đồng</li>
                                    </ul>
                                    <p className="mt-2 font-bold">Lữ Quán xây dựng hạ tầng để dùng lâu dài, không phải dịch vụ hỗ trợ ngắn hạn.</p>
                                </div>

                                <div>
                                    <h4 className="font-black text-stone-800 mb-2">6. Cam kết</h4>
                                    <ul className="list-disc list-inside space-y-1 mt-2 pl-2">
                                        <li>Không thu phí liên hệ</li>
                                        <li>Không yêu cầu đăng ký tài khoản</li>
                                        <li>Không sử dụng thông tin liên hệ cho mục đích quảng cáo</li>
                                    </ul>
                                </div>

                                <div className="text-center pt-4 border-t border-stone-200">
                                    <p className="font-bold">📌 Nếu bạn hiểu và đồng thuận với cách vận hành này, chúng tôi rất sẵn lòng tiếp nhận đóng góp của bạn.</p>
                                    <p className="font-bold mt-2">Trân trọng,<br/>Lữ Quán – Nền tảng dữ liệu du lịch mở</p>
                                </div>
                            </div>
                            <button onClick={() => setShowAboutDialog(false)} className="w-full py-4 bg-stone-900 text-white rounded-2xl font-black shadow-xl active:scale-95 transition-all uppercase text-[11px] tracking-widest hover:bg-stone-800">
                                Đã hiểu
                            </button>
                        </div>
                    </div>
                )}

                {/* Review Confirm Dialog Modal */}
                {reviewConfirm && (
                    <div className="fixed inset-0 bg-stone-950/90 backdrop-blur-xl z-[200] flex items-center justify-center p-6">
                        {(() => {
                            const { action, hotel } = reviewConfirm;
                            const isRestore = action === 'restore';
                            const isApprove = action === 'approve';

                            const iconMap = {
                                approve: { name: 'check-circle', color: 'bg-emerald-50 text-emerald-600 rotate-3' },
                                reject: { name: 'eye-off', color: 'bg-purple-50 text-purple-600 -rotate-3' },
                                restore: { name: 'refresh-cw', color: 'bg-blue-50 text-blue-600' }
                            };
                            const titleMap = {
                                approve: 'Xác nhận Duyệt Lại',
                                reject: 'Xác nhận Tạm Ẩn',
                                restore: 'Xác nhận Khôi Phục'
                            };

                            return (
                                <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl p-6 sm:p-8 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                                    <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4 transform ${iconMap[action].color}`}>
                                        <Icon name={iconMap[action].name} size={32} />
                                    </div>
                                    <h3 className="text-xl font-black text-stone-900 uppercase mb-2 tracking-tight text-center">
                                        {titleMap[action]}
                                    </h3>
                                    <p className="text-center text-sm font-bold text-stone-600 mb-6">{hotel.name}</p>
                                    
                                    <div className="bg-stone-50 rounded-2xl p-4 mb-6 overflow-y-auto flex-1 border border-stone-200 scrollbar-hide">
                                        {isRestore ? (
                                            <>
                                                <p className="text-[10px] font-black uppercase text-stone-400 mb-2 tracking-widest">Thay đổi trạng thái</p>
                                                <div className="flex items-center flex-wrap gap-2 mb-2">
                                                    <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider text-white shadow-sm ${hotel.status === 'inactive' ? 'bg-stone-500' : 'bg-red-700'}`}>
                                                        {hotel.status === 'inactive' ? 'Đã Ẩn' : 'Trong rác'}
                                                    </span>
                                                    <Icon name="arrow-right" size={14} className="text-stone-400" />
                                                    <span className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider text-white shadow-sm bg-emerald-600">
                                                        Approved
                                                    </span>
                                                </div>
                                                <p className="text-[10px] text-stone-500 italic mt-3 leading-relaxed">
                                                    * Lữ quán sẽ được khôi phục và hiển thị công khai trở lại trên bản đồ.
                                                </p>
                                            </>
                                        ) : (
                                            <>
                                                <p className="text-[10px] font-black uppercase text-stone-400 mb-2 tracking-widest">Thay đổi trạng thái</p>
                                                <div className="flex items-center flex-wrap gap-2 mb-2">
                                                    <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider text-white shadow-sm ${hotel.status === 'pending_review' ? 'bg-purple-600' : 'bg-red-600'}`}>
                                                        {hotel.status === 'pending_review' ? 'Cần Review Gấp' : 'Đang bị báo lỗi'}
                                                    </span>
                                                    <Icon name="arrow-right" size={14} className="text-stone-400" />
                                                    <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider text-white shadow-sm ${isApprove ? 'bg-emerald-600' : 'bg-stone-500'}`}>
                                                        {isApprove ? 'Approved (Khôi phục)' : 'Inactive (Tạm ẩn)'}
                                                    </span>
                                                </div>
                                                <p className="text-[10px] text-stone-500 italic mb-5 leading-relaxed">
                                                    {isApprove 
                                                        ? '* Lữ quán sẽ được hiển thị công khai trên bản đồ và các báo cáo cũ sẽ được dọn dẹp.'
                                                        : '* Lữ quán sẽ bị ẩn khỏi hệ thống công khai nhưng dữ liệu vẫn được giữ lại để kiểm tra.'}
                                                </p>

                                                <p className="text-[10px] font-black uppercase text-stone-400 mb-2 tracking-widest">Danh sách báo lỗi từ người dùng</p>
                                                <div className="space-y-3">
                                                    {reports.filter(r => r.hotelId === hotel.id).length > 0 ? (
                                                        reports.filter(r => r.hotelId === hotel.id).map((r, idx) => (
                                                            <div key={idx} className="bg-white p-3 rounded-xl border border-red-100 shadow-sm relative overflow-hidden">
                                                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500"></div>
                                                                <p className="text-xs font-bold text-red-700">{getReasonText(r.reason)}</p>
                                                                {r.details && <p className="text-[11px] text-stone-600 mt-1.5 italic">"{r.details}"</p>}
                                                                <p className="text-[8px] text-stone-400 font-bold mt-2 uppercase tracking-wider">{new Date(r.reportedAt).toLocaleString('vi-VN')}</p>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <p className="text-xs text-stone-500 italic bg-white p-3 rounded-xl border border-stone-200">Không có báo cáo nào hoặc đã được dọn dẹp.</p>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    <div className="flex gap-3 shrink-0">
                                        <button onClick={() => setReviewConfirm(null)} className="flex-1 py-3.5 bg-stone-200 text-stone-700 rounded-2xl font-black uppercase text-[11px] tracking-widest active:scale-95 transition-all hover:bg-stone-300">Hủy</button>
                                        <button 
                                            onClick={() => {
                                                if (action === 'approve') handleReviewApprove(hotel);
                                                else if (action === 'restore') handleRestoreHotel(hotel);
                                                else handleReviewReject(hotel);
                                                setReviewConfirm(null);
                                            }} 
                                            className={`flex-1 py-3.5 text-white rounded-2xl font-black shadow-xl active:scale-95 transition-all uppercase text-[11px] tracking-widest hover:brightness-110 ${isApprove || isRestore ? 'bg-emerald-600' : 'bg-purple-600'}`}
                                        >
                                            Xác nhận
                                        </button>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                )}
            </main>

            {/* Footer - Optimized for Desktop & Mobile */}
            <Footer onAboutClick={() => setShowAboutDialog(true)} />

            {/* Global Toast Notification */}
            {toastMessage && (
                <div className="fixed top-6 md:top-10 left-1/2 -translate-x-1/2 z-[300] bg-stone-900/90 backdrop-blur-md text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 text-[10px] md:text-xs font-black uppercase tracking-widest border border-white/20 animate-in slide-in-from-top-4 fade-in duration-300 max-w-[90vw] text-center pointer-events-none">
                    <Icon name="bell-ring" size={18} className="text-orange-500 shrink-0" />
                    <span>{toastMessage}</span>
                </div>
            )}
        </div>
    );
};

const App = () => (
    <window.LanguageProvider>
        <MainApp />
    </window.LanguageProvider>
);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);