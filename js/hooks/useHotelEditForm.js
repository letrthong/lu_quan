import { useState, useEffect, useRef, useMemo } from 'react';
import HotelAPI from '../api';
import { decodeBase64, encodeBase64, processImageUpload, isValidPhoneNumber, calculateDistance as haversine } from '../utils';
import { OPTIONAL_PHONE_TYPES } from '../constants';

export const useHotelEditForm = (hotel, provinces, onClose, onSaveSuccess, onToast) => {
    // State để lưu full hotel data (sau khi load detail)
    const [fullHotel, setFullHotel] = useState(hotel);
    // Nếu hotel chưa có description, cần load từ API → bắt đầu với loading = true
    const [isLoadingDetail, setIsLoadingDetail] = useState(!hotel.description);
    
    // Load full hotel detail nếu chưa có description hoặc image (bulk API không trả)
    useEffect(() => {
        if (!hotel || !hotel.id) return;
        
        // Nếu đã có description thì không cần load lại
        if (hotel.description) {
            setFullHotel(hotel);
            setIsLoadingDetail(false);
            return;
        }
        
        // Load full detail từ API
        setIsLoadingDetail(true);
        HotelAPI.fetchHotelDetail(hotel.id)
            .then(detail => {
                if (detail) {
                    setFullHotel({ ...hotel, ...detail });
                }
            })
            .catch(err => {
                console.error("Lỗi khi tải chi tiết hotel:", err);
            })
            .finally(() => {
                setIsLoadingDetail(false);
            });
    }, [hotel?.id]);

    const [pickerPos, setPickerPos] = useState({ lat: hotel.lat || 11.9404, lng: hotel.lng || 108.4583 });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [apiError, setApiError] = useState(null);
    const [selectedType, setSelectedType] = useState(hotel.type || "");
    const locationAttempts = useRef(0);

    const decodedWebsite = useMemo(() => decodeBase64(fullHotel.website), [fullHotel.website]);
    const decodedAddress = useMemo(() => decodeBase64(fullHotel.address), [fullHotel.address]);

    const [websiteUrl, setWebsiteUrl] = useState("");
    const [imageBase64, setImageBase64] = useState("");
    const [isLocating, setIsLocating] = useState(false);

    // Sync state khi fullHotel thay đổi (sau khi load detail từ API)
    useEffect(() => {
        if (fullHotel.image) {
            setImageBase64(fullHotel.image);
        }
        if (fullHotel.website) {
            setWebsiteUrl(decodeBase64(fullHotel.website) || "");
        }
    }, [fullHotel.image, fullHotel.website]);

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

    const decodedDescription = useMemo(() => decodeBase64(fullHotel.description), [fullHotel.description]);
    const decodedPhone = useMemo(() => decodeBase64(fullHotel.phone), [fullHotel.phone]);

    const handleGetCurrentLocation = () => {
        if (!navigator.geolocation) {
            onToast("Trình duyệt của bạn không hỗ trợ GPS.");
            return;
        }

        setIsLocating(true);
        const maxAge = locationAttempts.current === 0 ? 30000 : 5000;
        locationAttempts.current += 1;

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
            { enableHighAccuracy: false, timeout: 10000, maximumAge: maxAge }
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
        
        const base64Description = encodeBase64(description);
        const base64Phone = encodeBase64(phone);
        const base64Address = encodeBase64(address);
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

    const isOutside = useMemo(() => {
        if (areaCenter && pickerPos) {
            return haversine(pickerPos.lat, pickerPos.lng, areaCenter.lat, areaCenter.lng) > areaRadius;
        }
        return false;
    }, [areaCenter, pickerPos, areaRadius]);

    return {
        pickerPos,
        setPickerPos,
        isSubmitting,
        apiError,
        setApiError,
        selectedType,
        setSelectedType,
        decodedWebsite,
        decodedAddress,
        websiteUrl,
        setWebsiteUrl,
        imageBase64,
        isLocating,
        locationId,
        setLocationId,
        isProvinceOpen,
        setIsProvinceOpen,
        provinceSearchQuery,
        setProvinceSearchQuery,
        provinceDropdownRef,
        filteredProvinces,
        areaCenter,
        locationName,
        areaRadius,
        decodedDescription,
        decodedPhone,
        handleGetCurrentLocation,
        handleImageUpload,
        handleSubmit,
        isOutside,
        isLoadingDetail
    };
};
