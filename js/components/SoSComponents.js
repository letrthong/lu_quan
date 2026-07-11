import React, { useState, useEffect, useMemo, useRef } from 'react';
import Icon from './Icon';
import { calculateDistance } from '../utils';
import HotelAPI from '../api';

const compressImage = (file, callback) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 800;
            const MAX_HEIGHT = 800;
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }
            } else {
                if (height > MAX_HEIGHT) {
                    width *= MAX_HEIGHT / height;
                    height = MAX_HEIGHT;
                }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
            callback(dataUrl);
        };
    };
};

const getTimeAgo = (dateStr) => {
    if (!dateStr) return "Chưa rõ";
    const elapsedMs = new Date() - new Date(dateStr);
    const elapsedHrs = elapsedMs / (1000 * 60 * 60);

    if (elapsedHrs < 1) {
        const mins = Math.max(1, Math.round(elapsedHrs * 60));
        return `${mins} phút trước`;
    }
    const hrs = Math.round(elapsedHrs);
    return `${hrs} giờ trước`;
};

const SoSComponents = ({ setViewMode, isActive, onToast, isSOSModalOpen, setIsSOSModalOpen, isAdmin, selectedSOS: propSelectedSOS, onSelectSOS }) => {
    const [userLocation, setUserLocation] = useState(null);
    const [searchLocation, setSearchLocation] = useState(null);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [retries, setRetries] = useState(0);
    const [radius, setRadius] = useState(() => {
        const savedRadius = localStorage.getItem('luquan_sos_radius');
        return savedRadius ? Number(savedRadius) : 10;
    });

    const [sosRequests, setSosRequests] = useState([]);
    const [localSelectedSOS, setLocalSelectedSOS] = useState(null);
    const selectedSOS = propSelectedSOS !== undefined ? propSelectedSOS : localSelectedSOS;
    const setSelectedSOS = onSelectSOS !== undefined ? onSelectSOS : setLocalSelectedSOS;
    const [sosComments, setSosComments] = useState([]);
    const [newCommentText, setNewCommentText] = useState("");
    const [isSubmittingComment, setIsSubmittingComment] = useState(false);
    const [sosForm, setSosForm] = useState({ name: '', phone: '', message: '', urgency: 'medium', image: null });
    const [isSubmittingSOS, setIsSubmittingSOS] = useState(false);

    const mapRef = useRef(null);
    const mapInstance = useRef(null);
    const userMarkerRef = useRef(null);
    const circleRef = useRef(null);
    const markersGroupRef = useRef(null);

    useEffect(() => {
        localStorage.setItem('luquan_sos_radius', radius);
    }, [radius]);

    const fetchComments = async (sosId) => {
        try {
            const data = await HotelAPI.fetchSosComments(sosId);
            setSosComments(data || []);
        } catch (err) {
            console.error("Lỗi khi tải bình luận:", err);
        }
    };

    useEffect(() => {
        if (selectedSOS && selectedSOS.id) {
            fetchComments(selectedSOS.id);
            setNewCommentText("");
        } else {
            setSosComments([]);
        }
    }, [selectedSOS?.id, selectedSOS?.status, selectedSOS?.updatedAt]);

    useEffect(() => {
        if (selectedSOS && selectedSOS.id && mapInstance.current) {
            mapInstance.current.flyTo([selectedSOS.lat, selectedSOS.lng], 15, { animate: true, duration: 0.8 });
        }
    }, [selectedSOS?.id]);

    // Fetch SOS requests
    const fetchSos = async () => {
        try {
            const data = await HotelAPI.fetchSosRequests(isAdmin);
            // If admin, show all (including resolved/cancelled), otherwise only pending/processing
            const filteredSos = isAdmin 
                ? data 
                : data.filter(item => item.status === 'pending' || item.status === 'processing');
            setSosRequests(filteredSos);
        } catch (err) {
            console.error("Lỗi khi tải danh sách cứu hộ SOS:", err);
        }
    };

    useEffect(() => {
        if (!isActive) return;
        fetchSos();
        const interval = setInterval(fetchSos, 15000); // 15 seconds live refresh
        return () => clearInterval(interval);
    }, [isActive]);

    // Watch position
    useEffect(() => {
        if (!isActive) return;

        setIsLoading(true);
        setError(null);

        let watchId;

        const startWatching = (initialLoc = null) => {
            if (initialLoc) {
                setUserLocation(initialLoc);
                setIsLoading(false);
                setError(null);
            }

            watchId = navigator.geolocation.watchPosition(
                (position) => {
                    const newLoc = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    setUserLocation(newLoc);
                    setIsLoading(false);
                    setError(null);
                },
                (err) => {
                    console.error("Lỗi cập nhật vị trí SOS watchPosition:", err);
                    if (!initialLoc) {
                        let errorMessage = "Không thể xác định vị trí của bạn. Vui lòng bật GPS.";
                        setError(errorMessage);
                        if (onToast) onToast(errorMessage);
                        setIsLoading(false);
                    }
                },
                { enableHighAccuracy: false, timeout: 10000, maximumAge: 5000 }
            );
        };

        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const firstLoc = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    startWatching(firstLoc);
                },
                (err) => {
                    console.warn("Lấy vị trí nhanh qua cache thất bại, watchPosition trực tiếp:", err);
                    startWatching(null);
                },
                { enableHighAccuracy: false, timeout: 5000, maximumAge: 30000 }
            );
        } else {
            setError("Trình duyệt của bạn không hỗ trợ định vị GPS.");
            if (onToast) onToast("Trình duyệt của bạn không hỗ trợ định vị GPS.");
            setIsLoading(false);
        }

        return () => {
            if (watchId) navigator.geolocation.clearWatch(watchId);
        };
    }, [isActive, retries]);

    const nearbySosRequests = useMemo(() => {
        const center = searchLocation || userLocation;
        if (!center || !sosRequests) return [];

        return sosRequests.map(sos => {
            const distance = calculateDistance(center.lat, center.lng, sos.lat, sos.lng);
            return { ...sos, distance };
        }).filter(sos => sos.distance <= radius);
    }, [searchLocation, userLocation, sosRequests, radius]);

    // Initialize Map
    useEffect(() => {
        if (!isActive || !userLocation || !mapRef.current) return;

        if (!mapInstance.current) {
            mapInstance.current = window.L.map(mapRef.current, { zoomControl: false }).setView([userLocation.lat, userLocation.lng], 12);
            window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap'
            }).addTo(mapInstance.current);

            markersGroupRef.current = window.L.layerGroup().addTo(mapInstance.current);

            const userIcon = window.L.divIcon({
                className: "",
                html: `<div class="relative flex items-center justify-center w-12 h-12 cursor-pointer group" title="Vị trí của bạn">
                        <div class="absolute w-full h-full bg-blue-500 rounded-full animate-ping opacity-30"></div>
                        <div class="absolute w-6 h-6 bg-white rounded-full shadow-md"></div>
                        <div class="relative w-4 h-4 bg-blue-500 rounded-full shadow-inner group-hover:scale-110 transition-transform"></div>
                       </div>`,
                iconSize: [48, 48],
                iconAnchor: [24, 24]
            });
            userMarkerRef.current = window.L.marker([userLocation.lat, userLocation.lng], { icon: userIcon, zIndexOffset: 1000 }).addTo(mapInstance.current);

            userMarkerRef.current.on('click', () => {
                const currentPos = userMarkerRef.current.getLatLng();
                if (circleRef.current) {
                    mapInstance.current?.fitBounds(circleRef.current.getBounds(), { padding: [20, 20], animate: true, duration: 0.5 });
                } else {
                    mapInstance.current?.flyTo(currentPos, 15, { animate: true, duration: 0.5 });
                }
            });

            circleRef.current = window.L.circle([userLocation.lat, userLocation.lng], {
                radius: radius * 1000,
                color: '#ef4444',
                fillColor: '#ef4444',
                fillOpacity: 0.03,
                weight: 1.5,
                dashArray: '5, 5'
            }).addTo(mapInstance.current);

            mapInstance.current.on('dragend', () => {
                const center = mapInstance.current.getCenter();
                setSearchLocation({ lat: center.lat, lng: center.lng });
            });

            setTimeout(() => mapInstance.current.invalidateSize(), 200);
        } else {
            userMarkerRef.current.setLatLng([userLocation.lat, userLocation.lng]);
        }
    }, [isActive, userLocation]);

    // Handle Radius & Circle updates
    useEffect(() => {
        const center = searchLocation || userLocation;
        if (circleRef.current && center) {
            circleRef.current.setLatLng([center.lat, center.lng]);
            circleRef.current.setRadius(radius * 1000);
        }
    }, [searchLocation, userLocation, radius]);

    useEffect(() => {
        if (circleRef.current && mapInstance.current) {
            mapInstance.current.setMaxZoom(18);
            mapInstance.current.fitBounds(circleRef.current.getBounds(), { padding: [20, 20], maxZoom: 15, animate: true, duration: 0.5 });
        }
    }, [radius]);

    // Update SOS markers on the map
    useEffect(() => {
        if (!mapInstance.current || !markersGroupRef.current) return;

        markersGroupRef.current.clearLayers();

        nearbySosRequests.forEach(sos => {
            const elapsedHrs = (new Date() - new Date(sos.createdAt)) / (1000 * 60 * 60);

            let bgColor = 'bg-stone-500';
            let pulseAnim = '';
            let labelStyle = 'border-stone-200 text-stone-700 bg-stone-50';

            const isUserOwnSos = sos.deviceId === localStorage.getItem('luquan_sos_device_id');
            const isCurrentlySelected = selectedSOS && selectedSOS.id === sos.id;

            if (isCurrentlySelected) {
                bgColor = 'bg-red-600 scale-125';
                pulseAnim = 'animate-ping scale-150';
                labelStyle = 'border-red-400 text-red-800 bg-red-100 font-bold';
            } else if (sos.status === 'resolved') {
                bgColor = 'bg-emerald-600';
                pulseAnim = '';
                labelStyle = 'border-emerald-200 text-emerald-800 bg-emerald-100';
            } else if (sos.status === 'cancelled') {
                bgColor = 'bg-stone-500';
                pulseAnim = '';
                labelStyle = 'border-stone-300 text-stone-700 bg-stone-100';
            } else if (elapsedHrs >= 12) {
                bgColor = 'bg-red-600';
                pulseAnim = 'animate-ping';
                labelStyle = 'border-red-200 text-red-700 bg-red-50';
            } else if (elapsedHrs >= 8) {
                bgColor = 'bg-orange-500';
                pulseAnim = 'animate-pulse';
                labelStyle = 'border-orange-200 text-orange-700 bg-orange-50';
            } else if (elapsedHrs >= 4) {
                bgColor = 'bg-yellow-500';
                pulseAnim = 'animate-pulse';
                labelStyle = 'border-yellow-200 text-yellow-700 bg-yellow-50';
            }

            const sosIcon = window.L.divIcon({
                className: "",
                html: `<div class="relative w-full h-full flex justify-center">
                    <div class="absolute w-8 h-8 rounded-full ${bgColor} opacity-40 ${pulseAnim}"></div>
                    ${isUserOwnSos ? `<div class="absolute -top-1.5 w-11 h-11 rounded-full border-2 border-dashed border-red-500 animate-spin opacity-80 z-20"></div>` : ''}
                    <div class="flex items-center justify-center w-8 h-8 rounded-full shadow-lg border-2 border-white ${bgColor} text-white z-10 transition-all duration-300">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-alert-triangle"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    </div>
                    <div class="absolute top-9 left-1/2 -translate-x-1/2 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-tight border rounded shadow-sm min-w-max ${labelStyle}">
                        🆘 SOS: ${sos.name} (${getTimeAgo(sos.createdAt)})
                    </div>
                </div>`,
                iconSize: [32, 32],
                iconAnchor: [16, 32]
            });

            const marker = window.L.marker([sos.lat, sos.lng], { icon: sosIcon });
            marker.on('click', (e) => {
                window.L.DomEvent.stopPropagation(e);
                setSelectedSOS(sos);
            });
            markersGroupRef.current.addLayer(marker);
        });

    }, [nearbySosRequests, selectedSOS]);

    const handleSOSSubmit = async (e) => {
        e.preventDefault();
        if (!userLocation) {
            if (onToast) onToast("Không thể gửi SOS khi chưa xác định vị trí của bạn.");
            return;
        }

        setIsSubmittingSOS(true);
        try {
            let deviceId = localStorage.getItem('luquan_sos_device_id');
            if (!deviceId) {
                deviceId = window.crypto?.randomUUID ? window.crypto.randomUUID() : (Math.random().toString(36).substring(2) + Date.now().toString(36));
                localStorage.setItem('luquan_sos_device_id', deviceId);
            }

            const reqData = {
                name: sosForm.name,
                phone: sosForm.phone,
                message: sosForm.message,
                urgency: 'medium',
                lat: userLocation.lat,
                lng: userLocation.lng,
                deviceId: deviceId,
                image: sosForm.image
            };
            await HotelAPI.submitSosRequest(reqData);
            if (onToast) onToast("🚨 Gửi yêu cầu cứu hộ SOS thành công! Hãy duy trì kết nối điện thoại.");
            setIsSOSModalOpen(false);
            setSosForm({ name: '', phone: '', message: '', urgency: 'medium', image: null });
            fetchSos();
        } catch (err) {
            if (onToast) onToast(err.message || "Lỗi khi gửi yêu cầu cứu hộ SOS");
        } finally {
            setIsSubmittingSOS(false);
        }
    };

    const handleResolveSOS = async (sosId) => {
        if (!window.confirm("Bạn có chắc chắn muốn đánh dấu ca cứu nạn này là ĐÃ ĐƯỢC CỨU? Yêu cầu này sẽ được đưa vào lịch sử lưu trữ.")) {
            return;
        }
        try {
            await HotelAPI.updateSosStatus(sosId, 'resolved', isAdmin);
            if (onToast) onToast("🎉 Đánh dấu đã cứu nạn thành công!");
            setSelectedSOS(null);
            fetchSos();
        } catch (err) {
            if (onToast) onToast(err.message || "Lỗi khi cập nhật trạng thái");
        }
    };

    const handleCommentSubmit = async (e) => {
        e.preventDefault();
        if (!newCommentText.trim() || !selectedSOS) return;
        
        setIsSubmittingComment(true);
        try {
            const deviceId = localStorage.getItem('luquan_sos_device_id') || "";
            const commentData = {
                message: newCommentText,
                deviceId: deviceId
            };
            await HotelAPI.submitSosComment(selectedSOS.id, commentData, isAdmin);
            setNewCommentText("");
            fetchComments(selectedSOS.id);
            if (onToast) onToast("💬 Đăng cập nhật tình hình thành công!");
        } catch (err) {
            if (onToast) onToast(err.message || "Lỗi khi gửi bình luận");
        } finally {
            setIsSubmittingComment(false);
        }
    };

    if (isLoading && !userLocation) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-4 text-center text-stone-500 bg-stone-50">
                <Icon name="loader" size={32} className="animate-spin mb-2 text-red-600" />
                <p className="text-xs font-bold uppercase tracking-widest text-stone-600">Đang tìm vị trí GPS của bạn...</p>
            </div>
        );
    }

    if (error && !userLocation) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-4 text-center text-red-500 bg-stone-50">
                <Icon name="map-pin-off" size={32} className="mb-4" />
                <p className="text-sm font-bold mb-4">{error}</p>

                <div className="text-left text-xs text-stone-600 bg-stone-100 p-4 rounded-2xl border border-stone-200 max-w-sm w-full space-y-2 shadow-sm">
                    <p className="font-black text-stone-700">💡 HƯỚNG DẪN BẬT GPS ĐỊNH VỊ:</p>
                    <ul className="list-decimal list-inside space-y-1.5 font-medium">
                        <li><b>Trên điện thoại:</b> Bật định vị/GPS trên thanh trạng thái hoặc trong mục cài đặt.</li>
                        <li><b>Trình duyệt:</b> Đồng ý cấp quyền truy cập vị trí khi trình duyệt yêu cầu.</li>
                    </ul>
                </div>

                <div className="flex gap-3 mt-6">
                    <button onClick={() => setViewMode('list')} className="px-5 py-3 bg-stone-200 text-stone-700 rounded-xl text-xs font-black uppercase tracking-widest active:scale-95 transition-all">Quay lại</button>
                    <button onClick={() => setRetries(r => r + 1)} className="px-5 py-3 bg-red-600 text-white rounded-xl text-xs font-black uppercase tracking-widest active:scale-95 transition-all flex items-center gap-2 shadow-lg shadow-red-500/30">
                        <Icon name="refresh-cw" size={14} /> Thử lại
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-stone-50 overflow-hidden relative">
            <div className="flex-1 w-full h-full relative z-0 pb-safe pb-[60px]">
                <div ref={mapRef} className="w-full h-full bg-stone-200"></div>

                {/* Radius filter area selector */}
                <div className="absolute top-4 left-4 z-[1000] pointer-events-none">
                    <div className="bg-white/95 backdrop-blur-sm px-4 py-2 rounded-2xl shadow-lg border border-red-100 flex flex-col pointer-events-auto">
                        <div className="flex items-center gap-1">
                            <span className="text-[11px] font-black uppercase text-red-600 tracking-widest flex items-center gap-1">
                                <Icon name="alert-triangle" size={12} className="text-red-500" />
                                Phạm Vi SOS
                            </span>
                            <select
                                value={radius}
                                onChange={(e) => setRadius(Number(e.target.value))}
                                className="bg-white border border-stone-200 text-red-700 text-[11px] font-black rounded-md outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 cursor-pointer mx-1 px-1.5 py-0.5 shadow-sm"
                            >
                                <option value={2}>2km</option>
                                <option value={5}>5km</option>
                                <option value={10}>10km</option>
                                <option value={20}>20km</option>
                                <option value={30}>30km</option>
                            </select>
                            <span className="text-[11px] font-black uppercase text-stone-600 tracking-widest">: {nearbySosRequests.length} Yêu cầu</span>
                        </div>
                        <span className="text-[9px] font-bold text-stone-500 flex items-center gap-1 mt-0.5">
                            <Icon name="compass" size={10} className="text-red-500 animate-pulse" /> Live updates: 15s
                        </span>
                    </div>
                </div>

                {/* Floating SOS button */}
                <div className={`absolute right-4 z-[1000] pointer-events-none transition-all duration-300 ${selectedSOS ? 'bottom-[24rem]' : 'bottom-44'}`}>
                    <button
                        onClick={() => {
                            const deviceId = localStorage.getItem('luquan_sos_device_id') || "";
                            const existingSos = sosRequests.find(r => r.deviceId === deviceId);
                            if (existingSos) {
                                setSelectedSOS(existingSos);
                                if (mapInstance.current) {
                                    mapInstance.current.flyTo([existingSos.lat, existingSos.lng], 15, { animate: true, duration: 0.8 });
                                }
                                if (onToast) onToast("⚠️ Bạn đã có 1 ca cứu nạn đang mở. Đang định vị ca cứu hộ của bạn.");
                            } else {
                                setIsSOSModalOpen(true);
                            }
                        }}
                        className="w-12 h-12 bg-red-600 text-white rounded-full flex flex-col items-center justify-center shadow-[0_8px_30px_rgba(220,38,38,0.4)] border border-red-500 pointer-events-auto cursor-pointer hover:bg-red-700 active:scale-95 transition-all group animate-pulse-soft"
                        title="Gửi yêu cầu cứu hộ SOS khẩn cấp"
                    >
                        <Icon name="alert-triangle" size={16} className="text-white group-hover:scale-110 transition-transform" />
                        <span className="text-[8px] font-black tracking-tighter mt-0.5">SOS</span>
                    </button>
                </div>

                {/* Centering button */}
                <div className={`absolute right-4 z-[1000] pointer-events-none transition-all duration-300 ${selectedSOS ? 'bottom-[20rem]' : 'bottom-28'}`}>
                    <button
                        onClick={() => {
                            setSearchLocation(null);
                            if (circleRef.current && mapInstance.current) {
                                mapInstance.current.fitBounds(circleRef.current.getBounds(), { padding: [20, 20], animate: true, duration: 0.5 });
                            } else {
                                mapInstance.current?.flyTo([userLocation.lat, userLocation.lng], 15, { animate: true, duration: 0.5 });
                            }
                        }}
                        className="w-12 h-12 bg-white text-stone-600 rounded-full flex items-center justify-center shadow-[0_8px_30px_rgba(0,0,0,0.15)] border border-stone-100 pointer-events-auto cursor-pointer hover:text-red-600 hover:bg-stone-50 active:scale-95 transition-all group"
                        title="Định tâm vị trí của bạn"
                    >
                        <Icon name="crosshair" size={24} className="group-hover:scale-110 transition-transform" />
                    </button>
                </div>

                {/* Selected SOS info details card overlay */}
                {selectedSOS && (
                    <div className="absolute bottom-24 left-4 right-4 z-[1000] bg-white rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.15)] border border-red-100 p-5 flex flex-col gap-3 transition-all duration-300 pointer-events-auto max-h-[65vh] overflow-y-auto scrollbar-hide">
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="flex gap-1.5 items-center flex-wrap">
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${selectedSOS.urgency === 'high' ? 'bg-red-100 text-red-700' : (selectedSOS.urgency === 'medium' ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700')
                                        }`}>
                                        SOS: {selectedSOS.urgency === 'high' ? 'Rất khẩn cấp' : (selectedSOS.urgency === 'medium' ? 'Cần cứu hộ' : 'Hỗ trợ')}
                                    </span>
                                    {selectedSOS.status && (
                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                                            selectedSOS.status === 'pending' ? 'bg-red-50 text-red-700 border-red-100' : 
                                            selectedSOS.status === 'processing' ? 'bg-orange-50 text-orange-700 border-orange-100' : 
                                            selectedSOS.status === 'resolved' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                                            'bg-stone-50 text-stone-600 border-stone-200'
                                        }`}>
                                            Trạng thái: {
                                                selectedSOS.status === 'pending' ? 'Đang Chờ' : 
                                                selectedSOS.status === 'processing' ? 'Đang Xử Lý' : 
                                                selectedSOS.status === 'resolved' ? 'Đã Hỗ Trợ' : 
                                                selectedSOS.status === 'cancelled' ? 'Đã Hủy' : 
                                                selectedSOS.status
                                            }
                                        </span>
                                    )}
                                </div>
                                <h4 className="text-sm font-black text-stone-800 mt-1 flex items-center gap-1.5 leading-none">
                                    <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping"></span>
                                    {selectedSOS.name}
                                </h4>
                                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                    <span className="text-[10px] text-stone-500 font-bold flex items-center gap-1">
                                        📍 GPS: {selectedSOS.lat.toFixed(6)}, {selectedSOS.lng.toFixed(6)}
                                    </span>
                                    <a
                                        href={`https://www.google.com/maps/search/?api=1&query=${selectedSOS.lat},${selectedSOS.lng}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded text-[9px] font-black uppercase tracking-wider transition-colors shadow-sm cursor-pointer"
                                        title="Mở Google Maps dẫn đường"
                                    >
                                        Chỉ đường
                                    </a>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedSOS(null)}
                                className="text-stone-400 hover:text-stone-600 p-1 rounded-full hover:bg-stone-100 active:scale-95 transition-all"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                            </button>
                        </div>

                        <div className="text-xs text-stone-600 bg-stone-50 p-3 rounded-2xl border border-stone-100 font-medium max-h-24 overflow-y-auto">
                            <p className="font-semibold text-stone-500 text-[10px] uppercase tracking-wider mb-1">📢 Nội dung hỗ trợ:</p>
                            {selectedSOS.message}
                        </div>

                        {selectedSOS.hasImage && (
                            <div className="w-full rounded-2xl overflow-hidden border border-stone-100 shadow-sm max-h-48 flex items-center justify-center bg-stone-50">
                                <img
                                    src={`${HotelAPI.baseUrl}/api/hotelconnect/v1/sos/${selectedSOS.id}/image`}
                                    alt="Ảnh cứu nạn thực tế"
                                    className="w-full h-full object-cover max-h-48 cursor-pointer"
                                    onError={(e) => { e.target.style.display = 'none'; }}
                                    onClick={() => window.open(`${HotelAPI.baseUrl}/api/hotelconnect/v1/sos/${selectedSOS.id}/image`, '_blank')}
                                />
                            </div>
                        )}

                        {/* List of comments */}
                        <div className="space-y-1.5 max-h-32 overflow-y-auto mt-1 border-t border-stone-100 pt-2 pb-1">
                            <p className="font-semibold text-stone-500 text-[10px] uppercase tracking-wider mb-1">💬 Nhật ký cập nhật ({sosComments.length}):</p>
                            {sosComments.length === 0 ? (
                                <p className="text-[10px] text-stone-400 italic">Chưa có cập nhật tình hình nào.</p>
                            ) : (
                                sosComments.map((comment) => (
                                    <div key={comment.id} className="text-[10px] leading-relaxed bg-stone-50 p-2 rounded-xl border border-stone-100 flex flex-col">
                                        <div className="flex justify-between items-center font-black uppercase text-[8px] tracking-wider mb-0.5">
                                            <span className={comment.isAdmin ? "text-red-600" : "text-stone-600"}>
                                                👤 {comment.author}
                                            </span>
                                            <span className="text-stone-400 font-bold lowercase">
                                                {getTimeAgo(comment.createdAt)}
                                            </span>
                                        </div>
                                        <p className="font-medium text-stone-700">{comment.message}</p>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Add comment form */}
                        {(isAdmin || selectedSOS.deviceId === localStorage.getItem('luquan_sos_device_id')) ? (
                            <form onSubmit={handleCommentSubmit} className="flex gap-2 items-center mt-1 border-t border-stone-100 pt-2">
                                <input 
                                    type="text"
                                    placeholder="Cập nhật tình hình mới nhất..."
                                    value={newCommentText}
                                    onChange={(e) => setNewCommentText(e.target.value)}
                                    disabled={isSubmittingComment}
                                    className="flex-1 px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-[10px] font-semibold focus:border-red-500 outline-none"
                                />
                                <button
                                    type="submit"
                                    disabled={isSubmittingComment || !newCommentText.trim()}
                                    className="px-3 py-2 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider disabled:opacity-50 transition-all cursor-pointer shrink-0"
                                >
                                    {isSubmittingComment ? "..." : "Gửi"}
                                </button>
                            </form>
                        ) : (
                            <div className="text-[9px] text-stone-400 italic text-center mt-1 border-t border-stone-100 pt-2">
                                🔒 Chỉ người báo tin hoặc lực lượng Cứu hộ mới có quyền cập nhật tình hình.
                            </div>
                        )}

                        <div className="flex gap-1.5 mt-1 flex-wrap">
                            {isAdmin && selectedSOS.phone && !selectedSOS.phone.includes('*') && (
                                <a
                                    href={`tel:${selectedSOS.phone}`}
                                    className="flex-1 min-w-[80px] py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wide text-center flex items-center justify-center gap-1 hover:bg-blue-700 active:scale-95 shadow-md shadow-blue-500/20 transition-all"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-phone"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg> Gọi Nạn Nhân: {selectedSOS.phone}
                                </a>
                            )}
                            <a
                                href="tel:112"
                                className="flex-1 min-w-[80px] py-2.5 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wide text-center flex items-center justify-center gap-1 hover:bg-red-700 active:scale-95 shadow-md shadow-red-500/20 transition-all"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-phone-call"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/><path d="M14.05 2a9 9 0 0 1 8 7.94M14.05 6a5 5 0 0 1 4 4"/></svg> Gọi 112
                            </a>
                            <button
                                onClick={() => {
                                    const shareUrl = `${window.location.origin}${window.location.pathname}?sos=${selectedSOS.id}`;
                                    navigator.clipboard.writeText(shareUrl);
                                    if (onToast) onToast("📋 Đã sao chép liên kết chia sẻ ca cứu hộ này!");
                                }}
                                className="flex-1 min-w-[80px] py-2.5 bg-stone-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wide flex items-center justify-center gap-1 hover:bg-stone-800 active:scale-95 shadow-md shadow-stone-500/20 transition-all cursor-pointer"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-share-2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg> Chia sẻ
                            </button>
                            {isAdmin && (
                                <button
                                    onClick={() => handleResolveSOS(selectedSOS.id)}
                                    className="flex-1 min-w-[80px] py-2.5 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wide flex items-center justify-center gap-1 hover:bg-emerald-700 active:scale-95 shadow-md shadow-emerald-500/20 transition-all"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check-circle"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> Đã Được Cứu
                                </button>
                            )}
                        </div>

                        <div className="text-[9px] text-stone-400 font-bold text-center">
                            Gửi lúc: {new Date(selectedSOS.createdAt).toLocaleString('vi-VN')}
                        </div>
                    </div>
                )}

                {/* SOS emergency submit request form modal dialog */}
                {isSOSModalOpen && (
                    <div
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                        className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4 pointer-events-auto"
                    >
                        <form
                            onSubmit={handleSOSSubmit}
                            onClick={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                            onTouchStart={(e) => e.stopPropagation()}
                            className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-stone-200 p-6 flex flex-col gap-4 overflow-y-auto max-h-[85vh]"
                        >
                            <div className="flex justify-between items-center border-b border-stone-100 pb-3">
                                <h3 className="text-base font-black text-red-600 uppercase tracking-wide flex items-center gap-2">
                                    <Icon name="alert-triangle" size={20} className="animate-bounce text-red-600" />
                                    Gửi Yêu Cầu Cứu Hộ SOS
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => setIsSOSModalOpen(false)}
                                    className="text-stone-400 hover:text-stone-600 p-1 rounded-full hover:bg-stone-100 transition-all"
                                >
                                    <Icon name="x" size={20} />
                                </button>
                            </div>

                            <div className="bg-amber-50 text-amber-900 text-[10px] p-3.5 rounded-2xl border border-amber-200 leading-relaxed font-semibold space-y-1.5">
                                <p className="text-red-600 font-black uppercase tracking-wider flex items-center gap-1.5 text-[11px] mb-1">
                                    ⚠️ KHUYẾN CÁO KHẨN CẤP:
                                </p>
                                <p>1. Trong trường hợp nguy hiểm đe dọa tính mạng, <strong>HÃY GỌI NGAY đường dây cứu nạn quốc gia (112) hoặc chính quyền địa phương</strong>. Bản đồ này là kênh thông tin tự nguyện của cộng đồng, không thể thay thế lực lượng cứu nạn chính quy.</p>
                                <p>2. Vui lòng điền đúng Tên, SĐT. Hệ thống sẽ tự động đính kèm GPS của bạn. Hãy giữ điện thoại hoạt động và tìm nơi cao ráo an toàn nếu nước tiếp tục dâng.</p>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-stone-500 tracking-wider mb-1.5">Họ tên người cần hỗ trợ *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Ví dụ: Nguyễn Văn A"
                                        value={sosForm.name}
                                        onChange={(e) => setSosForm({ ...sosForm, name: e.target.value })}
                                        className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black uppercase text-stone-500 tracking-wider mb-1.5">Số điện thoại liên hệ *</label>
                                    <input
                                        type="tel"
                                        required
                                        placeholder="Ví dụ: 0912345678"
                                        value={sosForm.phone}
                                        onChange={(e) => setSosForm({ ...sosForm, phone: e.target.value })}
                                        className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black uppercase text-stone-500 tracking-wider mb-1.5">Mô tả tình trạng và nhu cầu cứu hộ *</label>
                                    <textarea
                                        required
                                        rows="3"
                                        placeholder="Ví dụ: Cần hỗ trợ thức ăn, nước uống..."
                                        value={sosForm.message}
                                        onChange={(e) => setSosForm({ ...sosForm, message: e.target.value })}
                                        className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-all resize-none"
                                    />

                                    {/* Quick SOS Suggestions */}
                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                        {[
                                            { label: "Cần thức ăn 🍞", text: "Cần hỗ trợ thức ăn, nước uống" },
                                            { label: "Cần y tế 🚑", text: "Cần hỗ trợ y tế, thuốc men" },
                                            { label: "Nước dâng cần di dời 🌊", text: "Nước ngập cao cần di dời khẩn cấp" },
                                            { label: "Cần phao cứu sinh 🛟", text: "Cần hỗ trợ phao cứu sinh, xuồng ghe" },
                                            { label: "Cần sạc pin/liên lạc 🔋", text: "Cần hỗ trợ sạc pin điện thoại, liên lạc" }
                                        ].map((suggest, idx) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => {
                                                    setSosForm(prev => ({
                                                        ...prev,
                                                        message: prev.message ? `${prev.message}, ${suggest.text}` : suggest.text
                                                    }));
                                                }}
                                                className="px-2 py-1 bg-stone-100 hover:bg-stone-200 active:bg-stone-300 text-stone-700 rounded-lg text-[9px] font-black uppercase tracking-wider border border-stone-200 transition-all active:scale-95 cursor-pointer"
                                            >
                                                {suggest.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black uppercase text-stone-500 tracking-wider mb-1.5 font-bold">Hình ảnh thực tế (không bắt buộc)</label>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="file"
                                            id="sos-image-input"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => {
                                                const file = e.target.files[0];
                                                if (file) {
                                                    compressImage(file, (base64Data) => {
                                                        setSosForm(prev => ({ ...prev, image: base64Data }));
                                                    });
                                                }
                                            }}
                                        />
                                        <label
                                            htmlFor="sos-image-input"
                                            className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-black uppercase tracking-wider border border-stone-200 transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                                        >
                                            <Icon name="camera" size={14} /> Chọn ảnh
                                        </label>
                                        {sosForm.image && (
                                            <div className="relative w-12 h-12 rounded-xl border border-stone-200 overflow-hidden">
                                                <img src={sosForm.image} className="w-full h-full object-cover" />
                                                <button
                                                    type="button"
                                                    onClick={() => setSosForm(prev => ({ ...prev, image: null }))}
                                                    className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full p-0.5"
                                                >
                                                    <Icon name="x" size={10} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {userLocation ? (
                                    <div className="text-[10px] font-bold text-emerald-600 flex items-center gap-1.5 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-100">
                                        <Icon name="check-circle" size={12} /> Đã xác định tọa độ GPS: {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
                                    </div>
                                ) : (
                                    <div className="text-[10px] font-bold text-red-600 flex items-center gap-1.5 bg-red-50 px-3 py-2 rounded-xl border border-red-100">
                                        <Icon name="alert-circle" size={12} /> Đang dò tìm tín hiệu GPS. Vui lòng bật vị trí của bạn.
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-3 border-t border-stone-100 pt-4 mt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsSOSModalOpen(false)}
                                    className="flex-1 py-3 bg-stone-100 text-stone-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-stone-200 active:scale-95 transition-all"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmittingSOS || !userLocation}
                                    className="flex-1 py-3 bg-red-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-700 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none shadow-lg shadow-red-600/20"
                                >
                                    {isSubmittingSOS ? "Đang gửi..." : "Gửi Cứu Hộ SOS"}
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SoSComponents;
