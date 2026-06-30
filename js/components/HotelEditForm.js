const { useState, useMemo, useEffect, useRef } = React;

const HotelEditForm = ({ hotel, provinces, onClose, onSaveSuccess, onToast }) => {
    // Quản lý vị trí bản đồ độc lập, khởi tạo với tọa độ hiện tại của khách sạn
    const [pickerPos, setPickerPos] = useState({ lat: hotel.lat || 11.9404, lng: hotel.lng || 108.4583 });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [apiError, setApiError] = useState(null);
    const [selectedType, setSelectedType] = useState(hotel.type || "");

    const decodedWebsite = useMemo(() => decodeBase64(hotel.website), [hotel.website]);
    const decodedAddress = useMemo(() => decodeBase64(hotel.address), [hotel.address]);

    const [websiteUrl, setWebsiteUrl] = useState(decodedWebsite || "");
    const [imageBase64, setImageBase64] = useState(hotel.image || "");
    const [isLocating, setIsLocating] = useState(false);

    const [locationId, setLocationId] = useState(hotel.locationId || "");
    const [isProvinceOpen, setIsProvinceOpen] = useState(false);
    const [provinceSearchQuery, setProvinceSearchQuery] = useState("");
    const provinceDropdownRef = useRef(null);

    const filteredProvinces = useMemo(() => {
        if (!provinceSearchQuery) return provinces;
        const normalizedSearch = provinceSearchQuery.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
        return provinces.filter(p => 
            p.locationName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().includes(normalizedSearch)
        );
    }, [provinces, provinceSearchQuery]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (provinceDropdownRef.current && !provinceDropdownRef.current.contains(event.target)) {
                setIsProvinceOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const { areaCenter, locationName, areaRadius } = useMemo(() => {
        let center = null;
        let name = "";
        let radius = 2;
        if (locationId && provinces) {
            const province = provinces.find(p => p.id === locationId);
            if (province) {
                name = province.locationName;
                if (province.radius) radius = parseFloat(province.radius);
                if (province.lat !== undefined && province.lng !== undefined && province.lat !== "" && province.lng !== "") {
                    center = { lat: parseFloat(province.lat), lng: parseFloat(province.lng) };
                }
            }
        }
        return { areaCenter: center, locationName: name, areaRadius: radius };
    }, [locationId, provinces]);

    // Giải mã Base64 sang chuỗi UTF-8 để tải vào giá trị mặc định của form
    const decodedDescription = useMemo(() => decodeBase64(hotel.description), [hotel.description]);
    const decodedPhone = useMemo(() => decodeBase64(hotel.phone), [hotel.phone]);

    const handleGetCurrentLocation = () => {
        if (!navigator.geolocation) {
            onToast("Trình duyệt của bạn không hỗ trợ GPS.");
            return;
        }

        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setPickerPos({ lat: position.coords.latitude, lng: position.coords.longitude });
                setIsLocating(false);
                onToast("Đã cập nhật vị trí hiện tại của bạn!");
            },
            (error) => {
                setIsLocating(false);
                console.error("Lỗi lấy GPS:", error);
                let errMsg = "Không thể lấy vị trí. Vui lòng bật định vị GPS.";
                if (error.code === 1) errMsg = "Bạn đã từ chối quyền truy cập vị trí.";
                onToast(errMsg);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    const handleImageUpload = async (e) => {
        try {
            const base64 = await processImageUpload(e.target.files[0]);
            setImageBase64(base64);
            setApiError(null);
        } catch (err) {
            setApiError(err);
        }
        e.target.value = '';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setApiError(null);

        const formData = new FormData(e.target);
        const name = formData.get('name').trim();
        const type = formData.get('type');
        const phone = formData.get('phone').trim();
        const website = formData.get('website').trim();
        const description = formData.get('description').trim();

        const bannedWords = await HotelAPI.getBannedWords();

        // --- START VALIDATION: Check location ---
        if (!locationId) {
            setApiError("Vui lòng chọn Tỉnh/Thành phố.");
            setIsSubmitting(false);
            return;
        }
        // --- END VALIDATION ---

        // --- START VALIDATION: Banned words in name and description ---
        const lowerName = name.toLowerCase();
        const lowerDescription = description.toLowerCase();
        if (bannedWords.some(word => lowerName.includes(word) || lowerDescription.includes(word))) {
            setApiError("Tên hoặc mô tả của lữ quán chứa từ khóa không cho phép.");
            setIsSubmitting(false);
            return;
        }
        // --- END VALIDATION ---

        // --- START VALIDATION: Description Min Length ---
        if (description.length < 3) {
            setApiError("Mô tả đặc điểm phải có ít nhất 3 ký tự.");
            setIsSubmitting(false);
            return;
        }
        // --- END VALIDATION ---

        // --- START VALIDATION: Kiểm tra số điện thoại hợp lệ của Việt Nam ---
        if ((!OPTIONAL_PHONE_TYPES.includes(type) || phone) && !isValidPhoneNumber(phone)) {
            setApiError("Số điện thoại không hợp lệ. Vui lòng kiểm tra lại (gồm 8-11 số).");
            setIsSubmitting(false);
            return;
        }
        // --- END VALIDATION ---

        // --- START VALIDATION: Kiểm tra định dạng Website ---
        let processedWebsite = website;
        if (processedWebsite) {
            // Tự động thêm https:// nếu người dùng quên
            if (!processedWebsite.startsWith('http://') && !processedWebsite.startsWith('https://')) {
                processedWebsite = 'https://' + processedWebsite;
            }

            // Kiểm tra từ khóa cấm
            const lowerWebsite = processedWebsite.toLowerCase();
            if (bannedWords.some(word => lowerWebsite.includes(word))) {
                setApiError("Website chứa từ khóa không cho phép.");
                setIsSubmitting(false);
                return;
            }

            try {
                new URL(processedWebsite);
            } catch (error) {
                setApiError("Website không hợp lệ. Vui lòng nhập URL bắt đầu bằng http:// hoặc https://");
                setIsSubmitting(false);
                return;
            }
        }
        // --- END VALIDATION ---
        
        const base64Description = encodeBase64(description);
        const base64Phone = encodeBase64(phone);
        const base64Address = encodeBase64(formData.get('address').trim());
        const base64Website = encodeBase64(processedWebsite);

        const updatedData = {
            name: name,
            type: type,
            address: base64Address,
            phone: base64Phone,
            website: base64Website,
            description: base64Description,
            image: imageBase64,
            locationId: locationId,
            lat: pickerPos.lat, 
            lng: pickerPos.lng
        };

        const updatePromise = hotel.status === 'pending'
            ? HotelAPI.updateHotelRequest(hotel.id, updatedData)
            : HotelAPI.updateHotel(hotel.id, updatedData);

        updatePromise
            .then(response => {
                onSaveSuccess(response.data);
                onClose();
                onToast("Cập nhật thông tin thành công!");
            })
            .catch(err => {
                console.error("Lỗi khi cập nhật:", err);
                setApiError(err.message || "Có lỗi xảy ra khi cập nhật.");
            })
            .finally(() => {
                setIsSubmitting(false);
            });
    };

    // Kiểm tra khoảng cách để vô hiệu hóa nút Gửi yêu cầu
    let isOutside = false;
    if (areaCenter && pickerPos) {
        isOutside = haversine(pickerPos.lat, pickerPos.lng, areaCenter.lat, areaCenter.lng) > areaRadius;
    }

    return (
        <div className="fixed inset-0 bg-stone-900/80 backdrop-blur-md z-[100] flex items-center justify-center sm:p-6">
            <div className="bg-white w-full h-full sm:h-auto sm:max-h-[95dvh] sm:max-w-xl sm:rounded-[40px] shadow-2xl overflow-hidden flex flex-col border border-stone-100">
                <div className="p-6 bg-blue-700 text-white flex justify-between items-center shrink-0">
                    <h3 className="text-lg font-black flex items-center gap-2 uppercase tracking-widest">
                        <Icon name="edit-3" size={20} /> Sửa thông tin khách sạn
                    </h3>
                    <button type="button" onClick={onClose} className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-colors"><Icon name="x" size={20} /></button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 scrollbar-hide bg-white pb-safe">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2" ref={provinceDropdownRef}>
                            <label className="text-[10px] font-black text-stone-400 uppercase mb-1 block tracking-widest">Tỉnh/Thành phố</label>
                            <div className="relative">
                                <div 
                                    onClick={() => setIsProvinceOpen(!isProvinceOpen)}
                                    className="w-full px-4 py-3 rounded-xl bg-stone-100 border-2 border-transparent hover:border-stone-200 focus-within:border-blue-700 outline-none font-bold text-sm cursor-pointer flex items-center justify-between"
                                    tabIndex="0"
                                >
                                    <span className={locationName ? "text-stone-900" : "text-stone-500"}>
                                        {locationName || "-- Chọn Tỉnh/Thành --"}
                                    </span>
                                    <Icon name="chevron-down" size={16} className="text-stone-400" />
                                </div>

                                {isProvinceOpen && (
                                    <div className="absolute z-50 w-full mt-1 bg-white border border-stone-200 rounded-xl shadow-xl max-h-[60vh] flex flex-col overflow-hidden">
                                        <div className="p-2 border-b border-stone-100 bg-stone-50 sticky top-0 z-10">
                                            <div className="relative">
                                                <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none">
                                                    <Icon name="search" size={12} />
                                                </div>
                                                <input 
                                                    type="text"
                                                    placeholder="Tìm tỉnh/thành..."
                                                    value={provinceSearchQuery}
                                                    onChange={(e) => setProvinceSearchQuery(e.target.value)}
                                                    onClick={(e) => e.stopPropagation()}
                                                    autoFocus
                                                    className="w-full pl-7 pr-3 py-2 bg-white border border-stone-200 rounded-lg text-xs font-bold text-stone-700 focus:outline-none focus:border-blue-500 transition-colors"
                                                />
                                            </div>
                                        </div>
                                        <div className="overflow-y-auto py-1">
                                            {filteredProvinces.length > 0 ? (
                                                filteredProvinces.map(p => (
                                                    <div 
                                                        key={p.id}
                                                        className={`px-4 py-2.5 hover:bg-stone-50 cursor-pointer text-xs font-bold transition-colors ${locationId === p.id ? 'text-blue-700 bg-blue-50' : 'text-stone-700'}`}
                                                        onClick={() => {
                                                            setLocationId(p.id);
                                                            setIsProvinceOpen(false);
                                                            setProvinceSearchQuery("");
                                                        }}
                                                    >
                                                        {p.locationName}
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="px-4 py-4 text-center text-xs text-stone-500 font-medium italic">
                                                    Không tìm thấy khu vực nào
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="col-span-2">
                            <label className="text-[10px] font-black text-stone-400 mb-1 block tracking-widest"><span className="uppercase">Tên</span> Lữ Quán</label>
                            <input required name="name" defaultValue={hotel.name} className="w-full px-4 py-3 rounded-xl bg-stone-100 border-2 border-transparent focus:border-blue-700 outline-none font-bold text-sm" />
                        </div>
                        <div className="col-span-1">
                            <label className="text-[10px] font-black text-stone-400 uppercase mb-1 block tracking-widest">Loại hình</label>
                            <select
                                required
                                name="type"
                                value={selectedType}
                                onChange={(e) => {
                                    setSelectedType(e.target.value);
                                    setApiError(null);
                                }}
                                className="w-full px-4 py-3 rounded-xl bg-stone-100 border-2 border-transparent focus:border-blue-700 outline-none font-bold text-sm appearance-none cursor-pointer"
                            >
                                <option value="">-- Chọn --</option>
                                {HOTEL_TYPES.map(t => (
                                    <option key={t.id} value={t.id}>{t.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="col-span-1">
                            <label className="text-[10px] font-black text-stone-400 uppercase mb-1 block tracking-widest">
                            Số điện thoại chính {OPTIONAL_PHONE_TYPES.includes(selectedType) && <span className="normal-case tracking-normal lowercase opacity-70">(Tùy chọn)</span>}
                            </label>
                            <input
                                name="phone"
                            required={!OPTIONAL_PHONE_TYPES.includes(selectedType)}
                                defaultValue={decodedPhone}
                                className="w-full px-4 py-3 rounded-xl bg-stone-100 border-2 border-transparent focus:border-blue-700 outline-none font-bold text-sm"
                            />
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Vị trí (Kéo Marker hoặc Chạm)</label>
                            <button 
                                type="button" 
                                onClick={handleGetCurrentLocation}
                                disabled={isLocating}
                                className="flex items-center gap-1 text-[10px] font-black text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-lg transition-colors active:scale-95 disabled:opacity-50"
                            >
                                {isLocating ? (
                                    <Icon name="loader" size={14} className="animate-spin" />
                                ) : (
                                    <Icon name="crosshair" size={14} />
                                )}
                                {isLocating ? 'Đang định vị...' : 'Vị trí của tôi'}
                            </button>
                        </div>
                        <div className="w-full h-[450px] sm:h-[500px] relative z-0">
                            <LocationPickerMap 
                                position={pickerPos} 
                                onPositionChange={setPickerPos} 
                                areaCenter={areaCenter}
                                locationName={locationName}
                                areaRadius={areaRadius}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        <div>
                            <label className="text-[10px] font-black text-stone-400 uppercase mb-1 block tracking-widest">Website</label>
                            <div className="flex gap-2">
                                <input 
                                    name="website" 
                                    value={websiteUrl}
                                    onChange={(e) => { setWebsiteUrl(e.target.value); setApiError(null); }}
                                    className="w-full px-4 py-3 rounded-xl bg-stone-100 border-2 border-transparent focus:border-blue-700 outline-none font-bold text-sm" 
                                    placeholder="https://..." 
                                />
                                <button 
                                    type="button" 
                                    onClick={async () => {
                                        if (!websiteUrl) { setApiError("Vui lòng nhập URL để kiểm tra."); return; }
                                        let urlToTest = websiteUrl;
                                        // Tự động thêm https:// nếu người dùng quên
                                        if (!urlToTest.startsWith('http://') && !urlToTest.startsWith('https://')) {
                                            urlToTest = 'https://' + urlToTest;
                                        }
                                        
                                        const bannedWords = await HotelAPI.getBannedWords();
                                        const lowerWebsiteToTest = urlToTest.toLowerCase();
                                        if (bannedWords.some(word => lowerWebsiteToTest.includes(word))) {
                                            setApiError("Website chứa từ khóa không cho phép.");
                                            return;
                                        }

                                        try {
                                            new URL(urlToTest);
                                            window.open(urlToTest, '_blank');
                                            setApiError(null);
                                            setWebsiteUrl(urlToTest); // Cập nhật state để hiển thị URL đã được sửa
                                        } catch (error) {
                                            setApiError("Website không hợp lệ. Vui lòng nhập URL bắt đầu bằng http:// hoặc https://");
                                        }
                                    }}
                                    className="px-4 py-3 bg-stone-200 text-stone-600 hover:bg-stone-300 hover:text-stone-900 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-colors shrink-0"
                                >
                                    Kiểm tra
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-stone-400 uppercase mb-1 block tracking-widest">Địa chỉ chi tiết</label>
                            <input required name="address" defaultValue={decodedAddress} className="w-full px-4 py-3 rounded-xl bg-stone-100 border-2 border-transparent focus:border-blue-700 outline-none font-bold text-sm" />
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-stone-400 uppercase mb-1 block tracking-widest">Mô tả đặc điểm</label>
                        <textarea required minLength="20" name="description" defaultValue={decodedDescription} rows="2" className="w-full px-4 py-3 rounded-xl bg-stone-100 border-2 border-transparent focus:border-blue-700 outline-none font-bold text-sm" placeholder="Mô tả ít nhất 20 ký tự về lữ quán..."></textarea>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-stone-400 uppercase mb-1 block tracking-widest">Ảnh đại diện</label>
                        <div className="flex items-center gap-4">
                            <div className="w-20 h-20 bg-stone-100 rounded-xl border-2 border-dashed border-stone-300 flex items-center justify-center overflow-hidden shrink-0 relative hover:bg-stone-200 transition-colors">
                                {imageBase64 ? (
                                    <img src={imageBase64} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="flex items-center justify-center w-full h-full">
                                        <Icon name="image-plus" size={24} className="text-stone-400" />
                                    </div>
                                )}
                                <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" title="Chọn ảnh tải lên" />
                            </div>
                            <div className="text-[10px] text-stone-500 font-bold leading-relaxed">
                                Nhấn vào khung bên cạnh để tải ảnh mới lên thay thế ảnh cũ. Ảnh sẽ tự động được nén và tối ưu hóa WebP.
                            </div>
                        </div>
                    </div>
                    {/* Hiển thị lỗi từ API */}
                    {apiError && (
                        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 rounded-lg text-xs" role="alert">
                            <p className="font-bold">Không thể lưu thay đổi</p>
                            <p>{apiError}</p>
                        </div>
                    )}
                    <button 
                        type="submit" 
                        disabled={isOutside || isSubmitting}
                        className={`w-full py-4 rounded-2xl font-black shadow-xl uppercase tracking-widest text-[11px] transition-all ${(isOutside || isSubmitting) ? 'bg-stone-300 text-stone-500 cursor-not-allowed' : 'bg-blue-700 text-white active:scale-95'}`}
                    >
                        {isSubmitting ? 'Đang lưu...' : (isOutside ? 'Vị trí ngoài vùng cho phép' : 'Lưu Thay Đổi')}
                    </button>
                </form>
            </div>
        </div>
    );
};