import { useState, useEffect, useRef, useMemo } from 'react';
import HotelAPI from '../api';
import { encodeBase64, processImageUpload, isValidPhoneNumber, calculateDistance as haversine } from '../utils';
import { OPTIONAL_PHONE_TYPES } from '../constants';

export const useHotelRequestForm = (provinces, onClose, onSubmitSuccess, onToast) => {
    const [pickerPos, setPickerPos] = useState({ lat: 11.9404, lng: 108.4583 });
    const [areaCenter, setAreaCenter] = useState(null);
    const [areaRadius, setAreaRadius] = useState(2);
    const [locationId, setLocationId] = useState("");
    const [locationName, setLocationName] = useState("");
    const [selectedType, setSelectedType] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [apiError, setApiError] = useState(null);
    const [websiteUrl, setWebsiteUrl] = useState("");
    const [imageBase64, setImageBase64] = useState("");
    const [isLocating, setIsLocating] = useState(false);

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

    const handleLocationChange = async (locId) => {
        setLocationId(locId);
        if (locId) {
            const province = provinces.find(p => p.id === locId);
            if (province) {
                setLocationName(province.locationName);
                setAreaRadius(province.radius ? parseFloat(province.radius) : 2);
                if (province.lat !== undefined && province.lng !== undefined && province.lat !== "" && province.lng !== "") {
                    const lat = parseFloat(province.lat);
                    const lng = parseFloat(province.lng);
                    setPickerPos({ lat, lng });
                    setAreaCenter({ lat, lng });
                } else {
                    try {
                        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(province.locationName + ', Vietnam')}&limit=1`);
                        const data = await response.json();
                        if (data && data.length > 0) {
                            const lat = parseFloat(data[0].lat);
                            const lng = parseFloat(data[0].lon);
                            setPickerPos({ lat, lng });
                            setAreaCenter({ lat, lng });
                        }
                    } catch (error) {
                        console.error("Lỗi tự động tìm tọa độ:", error);
                    }
                }
            }
        } else {
            setAreaCenter(null);
        }
    };

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

        const formEl = e.target;
        const formData = new FormData(formEl);
        const name = formData.get('name').trim();
        const type = formData.get('type');
        const phone = formData.get('phone').trim();
        const website = formData.get('website').trim();
        const description = formData.get('description').trim();
        const address = formData.get('address').trim();

        const bannedWords = await HotelAPI.getBannedWords();

        if (!locationId) {
            setApiError("Vui lòng chọn Tỉnh/Thành phố.");
            setIsSubmitting(false);
            return;
        }

        const lowerName = name.toLowerCase();
        const lowerDescription = description.toLowerCase();
        if (bannedWords.some(word => lowerName.includes(word) || lowerDescription.includes(word))) {
            setApiError("Tên hoặc mô tả của lữ quán chứa từ khóa không cho phép.");
            setIsSubmitting(false);
            return;
        }

        if (description.length < 3) {
            setApiError("Mô tả đặc điểm phải có ít nhất 3 ký tự.");
            setIsSubmitting(false);
            return;
        }

        if ((!OPTIONAL_PHONE_TYPES.includes(type) || phone) && !isValidPhoneNumber(phone)) {
            setApiError("Số điện thoại không hợp lệ. Vui lòng kiểm tra lại (gồm 8-11 số).");
            setIsSubmitting(false);
            return;
        }

        let processedWebsite = website;
        if (processedWebsite) {
            if (!processedWebsite.startsWith('http://') && !processedWebsite.startsWith('https://')) {
                processedWebsite = 'https://' + processedWebsite;
            }

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

        const today = new Date().toISOString().split('T')[0];

        const base64Description = encodeBase64(description);
        const base64Phone = encodeBase64(phone);
        const base64Address = encodeBase64(address);
        const base64Website = encodeBase64(processedWebsite);

        const newRequest = {
            id: crypto.randomUUID(),
            name: name,
            type: type,
            address: base64Address,
            phone: base64Phone,
            website: base64Website,
            locationId: locationId,
            status: 'pending',
            rating: 5.0,
            createdAt: today,
            updatedAt: today,
            description: base64Description,
            image: imageBase64 || "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=600",
            lat: pickerPos.lat, 
            lng: pickerPos.lng  
        };
        
        HotelAPI.submitHotelRequest(newRequest)
            .then((response) => {
                onSubmitSuccess(response.data);
                onClose();
                onToast("Yêu cầu đã được gửi! Admin sẽ duyệt sớm nhất.");
            })
            .catch(err => {
                console.error("Lỗi khi gửi yêu cầu:", err);
                setApiError(err.message || "Có lỗi không xác định xảy ra khi gửi yêu cầu.");
            })
            .finally(() => {
                setIsSubmitting(false);
            });
    };

    const isOutside = useMemo(() => {
        if (areaCenter && pickerPos) {
            return haversine(pickerPos.lat, pickerPos.lng, areaCenter.lat, areaCenter.lng) > areaRadius;
        }
        return false;
    }, [areaCenter, pickerPos, areaRadius]);

    return {
        pickerPos,
        setPickerPos,
        areaRadius,
        locationId,
        locationName,
        selectedType,
        setSelectedType,
        isSubmitting,
        apiError,
        websiteUrl,
        setWebsiteUrl,
        imageBase64,
        isLocating,
        isProvinceOpen,
        setIsProvinceOpen,
        provinceSearchQuery,
        setProvinceSearchQuery,
        provinceDropdownRef,
        filteredProvinces,
        handleLocationChange,
        handleGetCurrentLocation,
        handleImageUpload,
        handleSubmit,
        isOutside
    };
};
