import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import HotelAPI from '../api';
import { decodeBase64, calculateDistance, removeVietnameseTones } from '../utils';

export const useHotelConnectApp = (t) => {
    const [hotels, setHotels] = useState([]);
    const [provinces, setProvinces] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [pendingRequests, setPendingRequests] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterLocationIds, setFilterLocationIds] = useState(() => {
        const urlParams = new URLSearchParams(window.location.search);
        let urlLocs = urlParams.get('locationIds');
        if (!urlLocs && urlParams.get('locationId')) {
            urlLocs = urlParams.get('locationId');
        }
        if (urlLocs) return urlLocs.split(',');
        const savedLocs = localStorage.getItem('luquan_last_selected_locationIds');
        if (savedLocs) { try { return JSON.parse(savedLocs); } catch (e) { return []; } }
        const oldSavedLoc = localStorage.getItem('luquan_last_selected_locationId');
        if (oldSavedLoc) return [oldSavedLoc];
        return [];
    });
    const [filterTypeIds, setFilterTypeIds] = useState(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const urlTypes = urlParams.get('typeIds');
        if (urlTypes) return urlTypes.split(',');

        const savedTypes = localStorage.getItem('luquan_last_selected_typeIds');
        if (savedTypes) { try { return JSON.parse(savedTypes); } catch (e) { return ['all']; } }
        const oldType = localStorage.getItem('luquan_last_selected_type');
        if (oldType) return [oldType];
        return ['all'];
    });
    const [selectedHotel, setSelectedHotel] = useState(null);
    const [showRequestForm, setShowRequestForm] = useState(false);
    const [showSchemaManager, setShowSchemaManager] = useState(false);
    const [showAboutDialog, setShowAboutDialog] = useState(false);
    const [viewMode, setViewMode] = useState('list');
    const [isAdmin, setIsAdmin] = useState(false);
    const [showAdminLogin, setShowAdminLogin] = useState(false);
    const [adminPass, setAdminPass] = useState("");
    const [adminError, setAdminError] = useState("");
    const [adminTab, setAdminTab] = useState('approved');
    const [pendingReviewHotels, setPendingReviewHotels] = useState([]);
    const [reports, setReports] = useState([]);
    const [editingHotel, setEditingHotel] = useState(null);
    const [toastMessage, setToastMessage] = useState("");
    const [reviewConfirm, setReviewConfirm] = useState(null);
    const [isLoadingDetail, setIsLoadingDetail] = useState(false);

    // Lazy load hotel detail (image, description) khi user click vào hotel
    useEffect(() => {
        if (!selectedHotel || !selectedHotel.id) return;
        
        // Nếu đã có image hoặc description thì không cần load lại
        if (selectedHotel.image || selectedHotel.description) return;
        
        let isCancelled = false;
        setIsLoadingDetail(true);
        
        HotelAPI.fetchHotelDetail(selectedHotel.id)
            .then(fullHotel => {
                if (isCancelled || !fullHotel) return;
                
                // Merge full detail vào selectedHotel
                setSelectedHotel(prev => {
                    if (!prev || prev.id !== fullHotel.id) return prev;
                    return { ...prev, ...fullHotel };
                });
            })
            .catch(err => {
                console.error("Lỗi khi tải chi tiết hotel:", err);
            })
            .finally(() => {
                if (!isCancelled) setIsLoadingDetail(false);
            });
        
        return () => { isCancelled = true; };
    }, [selectedHotel?.id]);

    useEffect(() => {
        HotelAPI.getSchemas()
            .then(provincesData => {
                setProvinces(provincesData);
            })
            .catch(error => {
                console.error("Lỗi khi tải danh sách tỉnh:", error);
                setProvinces([]);
            });
    }, []);

    useEffect(() => {
        if (!showSchemaManager) {
            HotelAPI.getSchemas()
                .then(provincesData => setProvinces(provincesData))
                .catch(console.error);
        }
    }, [showSchemaManager]);

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

    const getLocationNameById = (locationId) => {
        const province = provinces.find(p => p.id === locationId);
        return province ? province.locationName : "Không rõ";
    };

    useEffect(() => {
        localStorage.setItem('luquan_last_selected_locationIds', JSON.stringify(filterLocationIds));

        if (provinces.length === 0 && filterLocationIds.length > 0) return;

        let ignore = false;

        if (filterLocationIds.length === 0) {
            setHotels([]);
            setSelectedHotel(null);
            return;
        }

        setIsLoading(true);
        setHotels([]);

        const loadHotels = async () => {
            let accumulatedHotels = [];

            // Sử dụng Bulk API để load tất cả hotels trong 1 request (nhanh hơn nhiều)
            try {
                const locationIdsToFetch = filterLocationIds.includes("all") 
                    ? ['all'] 
                    : filterLocationIds;
                
                accumulatedHotels = await HotelAPI.fetchHotelsBulk(locationIdsToFetch);
                
                if (!ignore) {
                    setHotels([...accumulatedHotels]);
                }
            } catch (bulkError) {
                console.warn('Bulk API failed, fallback to sequential loading:', bulkError);
                
                // Fallback: Load từng file nếu bulk API không hoạt động
                const filePathsToFetch = filterLocationIds.includes("all")
                    ? provinces.map(p => p.filePathId).filter(Boolean)
                    : provinces.filter(p => filterLocationIds.includes(p.id)).map(p => p.filePathId).filter(Boolean);

                for (const filePath of filePathsToFetch) {
                    if (ignore) break;
                    try {
                        const hotelsData = await HotelAPI.fetchHotelsByFilePaths([filePath]);
                        if (ignore) break;
                        accumulatedHotels = [...accumulatedHotels, ...hotelsData];
                        setHotels([...accumulatedHotels]);
                    } catch (error) {
                        console.error(`Lỗi khi tải dữ liệu cho file ${filePath}:`, error);
                    }
                }
            }

            if (ignore) return;

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

        return () => {
            ignore = true;
        };
    }, [filterLocationIds, provinces]);

    useEffect(() => {
        localStorage.setItem('luquan_last_selected_typeIds', JSON.stringify(filterTypeIds));
    }, [filterTypeIds]);

    useEffect(() => {
        if (window.lucide) lucide.createIcons();
    });

    useEffect(() => {
        if (selectedHotel && viewMode === 'list') {
            const element = document.getElementById(`hotel-item-${selectedHotel.id}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }

        const detailContent = document.getElementById('hotel-detail-content');
        if (detailContent) {
            detailContent.scrollTop = 0;
        }
    }, [selectedHotel, viewMode]);

    const isInitialMountUrl = useRef(true);
    useEffect(() => {
        if (isInitialMountUrl.current) {
            isInitialMountUrl.current = false;
            return;
        }
        
        const url = new URL(window.location);
        
        if (selectedHotel) {
            localStorage.setItem('luquan_last_selected_hotel_id', selectedHotel.id);
            url.searchParams.set('hotel', selectedHotel.id);
        } else {
            localStorage.removeItem('luquan_last_selected_hotel_id');
            url.searchParams.delete('hotel');
        }

        if (filterLocationIds.length > 0) {
            url.searchParams.set('locationIds', filterLocationIds.join(','));
        } else {
            url.searchParams.delete('locationIds');
        }
        url.searchParams.delete('locationId');

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
            searchResults = searchResults.filter(hotel => filterTypeIds.includes(hotel.type || 'other'));
        }

        const normalizedSearchTerm = removeVietnameseTones(searchTerm);
        if (normalizedSearchTerm) {
            searchResults = searchResults.filter(hotel => {
                return removeVietnameseTones(hotel.name || "").includes(normalizedSearchTerm) ||
                       removeVietnameseTones(decodeBase64(hotel.address) || "").includes(normalizedSearchTerm);
            });
        }

        if (selectedHotel) {
            const selectedIndex = searchResults.findIndex(h => h.id === selectedHotel.id);
            if (selectedIndex > 0) {
                const [selectedItem] = searchResults.splice(selectedIndex, 1);
                searchResults.unshift(selectedItem);
            }
        }
        return searchResults;
    }, [hotels, pendingRequests, pendingReviewHotels, searchTerm, filterLocationIds, filterTypeIds, isAdmin, adminTab, selectedHotel]);

    useEffect(() => {
        if (toastMessage) {
            const timer = setTimeout(() => setToastMessage(""), 3000);
            return () => clearTimeout(timer);
        }
    }, [toastMessage]);

    const handleUserLocationUpdate = useCallback((loc) => {
        if (!provinces || provinces.length === 0) return;
        
        let minDistance = Infinity;

        const distances = provinces.map(schema => {
            if (schema.lat == null || schema.lng == null) return { ...schema, dist: Infinity };
            const dist = calculateDistance(loc.lat, loc.lng, schema.lat, schema.lng);
            if (dist < minDistance) minDistance = dist;
            return { ...schema, dist };
        });

        const nearbySchemas = distances.filter(s => s.dist <= 50 || s.dist === minDistance);

        if (nearbySchemas.length > 0) {
            const nearbyIds = nearbySchemas.map(s => s.id);
            const nearbyNames = nearbySchemas.map(s => s.locationName).join(', ');

            setFilterLocationIds(prev => {
                if (prev.includes('all')) return prev;
                const isSame = prev.length === nearbyIds.length && prev.every(id => nearbyIds.includes(id));
                if (isSame) return prev;
                
                setToastMessage(`Đang tải dữ liệu lân cận: ${nearbyNames}...`);
                return nearbyIds;
            });
        }
    }, [provinces]);

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
                if (filterLocationIds.includes("all") || filterLocationIds.includes(response.data.locationId)) {
                    setHotels(prev => {
                        if (prev.some(h => h.id === response.data.id)) {
                            return prev.map(h => h.id === response.data.id ? response.data : h);
                        }
                        return [...prev, response.data];
                    });
                }
                refreshReports();
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
        
        HotelAPI.deleteHotel(id)
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

    return {
        hotels,
        provinces,
        isLoading,
        pendingRequests,
        setPendingRequests,
        searchTerm,
        setSearchTerm,
        filterLocationIds,
        setFilterLocationIds,
        filterTypeIds,
        setFilterTypeIds,
        selectedHotel,
        setSelectedHotel,
        showRequestForm,
        setShowRequestForm,
        showSchemaManager,
        setShowSchemaManager,
        showAboutDialog,
        setShowAboutDialog,
        viewMode,
        setViewMode,
        isAdmin,
        setIsAdmin,
        showAdminLogin,
        setShowAdminLogin,
        adminPass,
        setAdminPass,
        adminError,
        setAdminError,
        adminTab,
        setAdminTab,
        pendingReviewHotels,
        reports,
        editingHotel,
        setEditingHotel,
        toastMessage,
        setToastMessage,
        reviewConfirm,
        setReviewConfirm,
        getLocationNameById,
        handleUserLocationUpdate,
        handleAdminLogin,
        approveRequest,
        rejectRequest,
        handleReviewApprove,
        handleReviewReject,
        handleRestoreHotel,
        permanentlyDeleteHotel,
        onProcessReport,
        startEditHotel,
        handleEditSuccess,
        hideHotel,
        deleteHotel,
        refreshReports,
        formatDate,
        handleCloseHotelDetail,
        filteredHotels,
        handleShare,
        isLoadingDetail
    };
};
