import React, { useEffect, useRef, useState } from 'react';

export const createHotelIcon = (hotel, isSelected) => {
    let bgColor = 'bg-stone-500'; // Màu xám trung tính mặc định cho các loại "Khác"
    let svgPath = '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3"></circle>'; // Icon map-pin

    if (hotel.type === 'hotel') {
        bgColor = 'bg-indigo-600'; // Màu xanh Indigo sang trọng cho Khách sạn lớn
        svgPath = '<path d="M10 22v-6.57"/><path d="M12 11h.01"/><path d="M12 7h.01"/><path d="M16 11h.01"/><path d="M16 7h.01"/><path d="M8 11h.01"/><path d="M8 7h.01"/><path d="M20 22v-6.57"/><path d="M4 22v-6.57"/><path d="M22 22H2"/><path d="M2 15h20"/><path d="M2 9a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v13H2V9z"/>'; // Icon hotel chính thức của Lucide
    } else if (hotel.type === 'motel') {
        bgColor = 'bg-blue-400'; // Màu xanh lam nhạt cho Nhà nghỉ
        svgPath = '<path d="M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8"/><path d="M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4"/><path d="M12 4v6"/><path d="M2 18h20"/>'; // Icon bed-double
    } else if (hotel.type === 'restaurant') {
        bgColor = 'bg-orange-600'; // Màu cam đậm cho Nhà hàng
        svgPath = '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>'; // Icon utensils
    } else if (hotel.type === 'entertainment') {
        bgColor = 'bg-purple-600'; // Màu tím cho Điểm tham quan
        svgPath = '<path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/>'; // Icon ticket
    } else if (hotel.type === 'resort') {
        bgColor = 'bg-emerald-600'; // Màu xanh ngọc cho Resort
        svgPath = '<path d="M22 12a10.06 10.06 1 0 0-20 0Z"/><path d="M12 12v8a2 2 0 0 0 4 0"/><path d="M12 2v1"/>'; // Icon umbrella
    } else if (hotel.type === 'villa') {
        bgColor = 'bg-blue-600'; // Màu xanh dương cho Biệt thự (Villa)
        svgPath = '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>'; // Icon home
    } else if (hotel.type === 'homestay') {
        bgColor = 'bg-pink-400'; // Màu hồng nhẹ nhàng cho Homestay
        svgPath = '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>'; // Icon heart
    } else if (hotel.type === 'shop') {
        bgColor = 'bg-amber-600'; // Màu vàng hổ phách cho Cửa hàng
        svgPath = '<path d="m2 7 4.04-4.04c.1-.1.22-.16.36-.16h11.2c.14 0 .26.06.36.16L22 7M2 7v14a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7M2 7h20M12 22V7"/>'; // Icon store
    } else if (hotel.type === 'car') {
        bgColor = 'bg-sky-600'; // Màu xanh da trời cho Taxi
        svgPath = '<path d="M22 17v-4.5C22 10.6 18.2 9 15.5 9h-7C5.8 9 2 10.6 2 12.5V17c0 .6.4 1 1 1h1c.6 0 1-.4 1-1v-2h14v2c0 .6.4 1 1 1h1c.6 0 1-.4 1-1Z"/><path d="M2 12.5 5.3 7c.2-.4.7-.6 1.2-.6h11c.5 0 1 .2 1.2.6l3.3 5.5"/><path d="M6 14h.01"/><path d="M18 14h.01"/><path d="M10 6.4V4c0-.6.4-1 1-1h2c.6 0 1 .4 1 1v2.4"/>'; // Icon car-taxi
    } else if (hotel.type === 'medical') {
        bgColor = 'bg-red-500'; // Màu đỏ tươi cho Cơ sở y tế (chữ thập đỏ)
        svgPath = '<path d="M11 2a2 2 0 0 0-2 2v5H4a2 2 0 0 0-2 2v2c0 1.1.9 2 2 2h5v5c0 1.1.9 2 2 2h2a2 2 0 0 0 2-2v-5h5a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-5V4a2 2 0 0 0-2-2h-2z"/>'; // Icon cross (chữ thập)
    } else if (hotel.type === 'transport') {
        bgColor = 'bg-cyan-600'; // Màu xanh lơ cho phương tiện di chuyển
        svgPath = '<path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19.6"/><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/><circle cx="7" cy="18" r="2"/><circle cx="16" cy="18" r="2"/>'; // Icon bus
    } else if (hotel.type === 'coffee') {
        bgColor = 'bg-amber-800'; // Màu nâu cà phê ấm áp cho Quán cà phê
        svgPath = '<path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><line x1="6" x2="6" y1="2" y2="4"/><line x1="10" x2="10" y1="2" y2="4"/><line x1="14" x2="14" y1="2" y2="4"/>'; // Icon coffee
    } else if (hotel.type === 'local_food') {
        bgColor = 'bg-orange-500'; // Màu cam sáng cho Quán bán món địa phương
        svgPath = '<path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><line x1="6" x2="6" y1="2" y2="4"/><line x1="10" x2="10" y1="2" y2="4"/><line x1="14" x2="14" y1="2" y2="4"/>'; // Icon coffee
    } else if (hotel.type === 'religion') {
        bgColor = 'bg-amber-500'; // Màu vàng gold cho Cơ sở tôn giáo
        svgPath = '<line x1="3" x2="21" y1="22" y2="22"/><line x1="6" x2="6" y1="18" y2="11"/><line x1="10" x2="10" y1="18" y2="11"/><line x1="14" x2="14" y1="18" y2="11"/><line x1="18" x2="18" y1="18" y2="11"/><polygon points="12 2 20 7 4 7"/>'; // Icon landmark
    } else if (hotel.type === 'gas_station') {
        bgColor = 'bg-sky-500'; // Màu xanh da trời cho Trạm xăng
        svgPath = '<line x1="3" x2="15" y1="22" y2="22"/><line x1="4" x2="14" y1="9" y2="9"/><path d="M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18"/><path d="M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V9.83a2 2 0 0 0-.59-1.42L18 5"/>'; // Icon fuel
    } else if (hotel.type === 'ev_station') {
        bgColor = 'bg-green-500'; // Màu xanh lá cây cho Trạm sạc xe điện
        svgPath = '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>'; // Icon zap (sấm sét)
    }

    if (isSelected) {
        bgColor = 'bg-moss'; // Khi được click chọn, tất cả marker đều đổi màu thành xanh moss
    }

    return window.L.divIcon({
        className: "", // Để trống để xóa viền và nền trắng mặc định của Leaflet
        html: `<div class="relative w-full h-full flex justify-center">
            <div class="flex items-center justify-center w-8 h-8 rounded-full shadow-lg transition-all duration-300 ${
                isSelected 
                ? `${bgColor} text-white scale-125 z-50 border-4 border-white animate-bounce` 
                : `${bgColor} text-white border-2 border-white`
            }">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${svgPath}</svg>
            </div>
            <div class="absolute top-9 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-white/90 backdrop-blur-md rounded shadow-sm border text-[9px] font-black uppercase tracking-tight text-center min-w-max max-w-[120px] truncate transition-all duration-300 ${
                isSelected ? 'text-moss border-moss scale-110 z-50 ring-2 ring-moss/20' : 'text-stone-700 border-stone-200'
            }">
                ${hotel.name}
            </div>
        </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32]
    });
};

// Custom Component cho Bản đồ chính
export const MainLeafletMap = ({ hotels, selectedHotel, onSelectHotel, filterCity, viewMode }) => {
    const mapRef = useRef(null);
    const mapInstance = useRef(null);
    const clusterGroupRef = useRef(null);
    const markersRef = useRef({});
    const isInitialMount = useRef(true);
    const previousSelectedHotelRef = useRef(null);

    useEffect(() => {
        if (!mapRef.current) return;
        // Khởi tạo map 1 lần duy nhất
        if (!mapInstance.current) {
            let initialCenter = [14.0583, 108.2772]; // Mặc định trung tâm Việt Nam
            let initialZoom = 6;

            // Đọc vị trí lưu gần nhất từ Local Storage
            try {
                const savedState = localStorage.getItem('luquan_map_state');
                if (savedState) {
                    const parsedState = JSON.parse(savedState);
                    if (parsedState.center && parsedState.zoom) {
                        initialCenter = parsedState.center;
                        initialZoom = parsedState.zoom;
                    }
                }
            } catch (e) {
                console.error("Lỗi đọc map state:", e);
            }

            mapInstance.current = window.L.map(mapRef.current, { zoomControl: false }).setView(initialCenter, initialZoom);
            window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap'
            }).addTo(mapInstance.current);
            window.L.control.zoom({ position: 'bottomright' }).addTo(mapInstance.current);
            
            // Lưu lại vị trí mỗi khi người dùng di chuyển hoặc zoom bản đồ xong
            mapInstance.current.on('moveend', () => {
                const center = mapInstance.current.getCenter();
                const zoom = mapInstance.current.getZoom();
                localStorage.setItem('luquan_map_state', JSON.stringify({ center: [center.lat, center.lng], zoom }));
            });
        }

        // Kích hoạt kích thước map ngay sau khi DOM và Flexbox đã chia khung xong (An sau ResizeObserver)
        const initTimeout = setTimeout(() => {
            if (mapInstance.current) mapInstance.current.invalidateSize();
        }, 200);
        return () => clearTimeout(initTimeout);
    }, []);

    useEffect(() => {
        if (!mapInstance.current) return;
        const map = mapInstance.current;

        // Cho phép tự đóng popup chi tiết khi người dùng nhấp vào vùng trống trên bản đồ
        map.off('click');
        map.on('click', () => {
            onSelectHotel(null);
        });

        // Khởi tạo hoặc dọn dẹp cluster group
        if (!clusterGroupRef.current) {
            clusterGroupRef.current = window.L.markerClusterGroup({
                maxClusterRadius: 50,
                disableClusteringAtZoom: 15,
                iconCreateFunction: function(cluster) {
                    const count = cluster.getChildCount();
                    let size = ' w-10 h-10 text-base';
                    if (count >= 10) size = ' w-12 h-12 text-lg';
                    if (count >= 100) size = ' w-14 h-14 text-xl';
                    
                    return window.L.divIcon({
                        html: `<div class="flex items-center justify-center rounded-full bg-moss text-white font-black border-4 border-white/50 shadow-lg ${size}">` + count + '</div>',
                        className: '',
                        iconSize: null
                    });
                }
            });
            map.addLayer(clusterGroupRef.current);
        }
        clusterGroupRef.current.clearLayers();
        markersRef.current = {};

        // Thêm marker mới
        hotels.forEach(hotel => {
            const isSelected = selectedHotel?.id === hotel.id;
            const customIcon = createHotelIcon(hotel, isSelected);

            const marker = window.L.marker([hotel.lat, hotel.lng], { icon: customIcon });
            marker.on('click', (e) => {
                window.L.DomEvent.stopPropagation(e);
                onSelectHotel(hotel);
            });
            clusterGroupRef.current.addLayer(marker);
            markersRef.current[hotel.id] = marker;
        });
    }, [hotels, onSelectHotel]);

    // Tách riêng hiệu ứng cập nhật icon khi chọn hotel để tránh re-render toàn bộ layer
    useEffect(() => {
        const prevHotel = previousSelectedHotelRef.current;
        if (prevHotel) {
            const prevMarker = markersRef.current[prevHotel.id];
            if (prevMarker) {
                prevMarker.setIcon(createHotelIcon(prevHotel, false));
                prevMarker.setZIndexOffset(0);
            }
        }

        if (selectedHotel) {
            const newMarker = markersRef.current[selectedHotel.id];
            if (newMarker) {
                newMarker.setIcon(createHotelIcon(selectedHotel, true));
                if (!newMarker.__parent) { newMarker.setZIndexOffset(1000); }
            }
        }
        
        previousSelectedHotelRef.current = selectedHotel;
    }, [selectedHotel]);

    // Tự động zoom và di chuyển bản đồ đến khu vực Tỉnh/Thành được lọc
    useEffect(() => {
        if (!mapInstance.current) return;

        const isFirstRun = isInitialMount.current;
        isInitialMount.current = false;

        if (selectedHotel) {
            const marker = markersRef.current[selectedHotel.id];
            if (marker) {
                const zoomAndFly = () => {
                    setTimeout(() => {
                        if (mapInstance.current) {
                            mapInstance.current.flyTo([selectedHotel.lat, selectedHotel.lng], 12, { duration: 0.4 });
                        }
                    }, 100);
                };
                clusterGroupRef.current.zoomToShowLayer(marker, zoomAndFly);
            }
        } 
        else if (filterCity && hotels.length > 0) {
            const bounds = window.L.latLngBounds(hotels.map(h => [h.lat, h.lng]));
            mapInstance.current.flyToBounds(bounds, { padding: [50, 50], maxZoom: 13, duration: 1.5 });
        } 
        else if (!filterCity) {
            if (isFirstRun) {
                return;
            }
            mapInstance.current.flyTo([14.0583, 108.2772], 6, { duration: 1.5 });
        }
    }, [filterCity, hotels, selectedHotel]);

    useEffect(() => {
        if (mapInstance.current) {
            const t1 = setTimeout(() => mapInstance.current.invalidateSize(), 100);
            const t2 = setTimeout(() => mapInstance.current.invalidateSize(), 350);
            return () => { clearTimeout(t1); clearTimeout(t2); };
        }
    }, [viewMode]);

    return <div ref={mapRef} className="w-full h-full bg-stone-200 relative z-0"></div>;
};

// Helper function to calculate distance between two lat/lng points using Haversine formula
const haversine = (lat1, lng1, lat2, lng2) => {
    if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) return 0;
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

// Custom Component cho Bản đồ chọn vị trí (Form)
export const LocationPickerMap = ({ position, onPositionChange, areaCenter, locationName, areaRadius = 2 }) => {
    const mapRef = useRef(null);
    const mapInstance = useRef(null);
    const markerInstance = useRef(null);
    const centerMarkerRef = useRef(null);
    const circleRef = useRef(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [warning, setWarning] = useState(null);

    useEffect(() => {
        if (!mapRef.current || mapInstance.current) return;
        
        mapInstance.current = window.L.map(mapRef.current).setView([position.lat, position.lng], 12);
        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapInstance.current);
        
        const customIcon = window.L.divIcon({
            className: "", 
            html: `<div class="flex items-center justify-center w-10 h-10 rounded-full shadow-2xl bg-orange-700 text-white border-4 border-white animate-bounce cursor-grab active:cursor-grabbing">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            </div>`,
            iconSize: [40, 40],
            iconAnchor: [20, 40]
        });

        markerInstance.current = window.L.marker([position.lat, position.lng], { draggable: true, icon: customIcon }).addTo(mapInstance.current);
        
        markerInstance.current.on('dragend', function () {
            const latlng = markerInstance.current.getLatLng();
            onPositionChange({ lat: latlng.lat, lng: latlng.lng });
        });

        mapInstance.current.on('click', function (e) {
            markerInstance.current.setLatLng(e.latlng);
            onPositionChange({ lat: e.latlng.lat, lng: e.latlng.lng });
        });

        setTimeout(() => {
            if (mapInstance.current) mapInstance.current.invalidateSize();
        }, 250);
    }, []);

    useEffect(() => {
        if (mapInstance.current && markerInstance.current) {
            const newLat = parseFloat(position.lat);
            const newLng = parseFloat(position.lng);
            
            if (!isNaN(newLat) && !isNaN(newLng)) {
                const currentLatLng = markerInstance.current.getLatLng();
                if (Math.abs(currentLatLng.lat - newLat) > 0.000001 || Math.abs(currentLatLng.lng - newLng) > 0.000001) {
                    markerInstance.current.setLatLng([newLat, newLng]);
                    mapInstance.current.flyTo([newLat, newLng], mapInstance.current.getZoom(), { animate: true, duration: 0.5 });
                }
            }
        }
    }, [position.lat, position.lng]);

    useEffect(() => {
        if (!mapInstance.current) return;

        if (circleRef.current) {
            circleRef.current.remove();
            circleRef.current = null;
        }
        if (centerMarkerRef.current) {
            centerMarkerRef.current.remove();
            centerMarkerRef.current = null;
        }

        if (!areaCenter || areaCenter.lat == null || areaCenter.lng == null) {
            return;
        }

        let isOutside = false;
        if (position && position.lat != null && position.lng != null) {
            isOutside = haversine(position.lat, position.lng, areaCenter.lat, areaCenter.lng) > areaRadius;
        }
        const colorHex = isOutside ? '#ef4444' : '#16a34a';
        const colorClass = isOutside ? 'bg-red-500' : 'bg-moss';

        circleRef.current = window.L.circle([areaCenter.lat, areaCenter.lng], {
            radius: areaRadius * 1000,
            color: colorHex,
            fillColor: colorHex,
            fillOpacity: 0.1,
            weight: 2,
            dashArray: '5, 5'
        }).addTo(mapInstance.current);
        
        const centerIcon = window.L.divIcon({
            className: "",
            html: `<div class="flex flex-col items-center justify-end h-full w-full pointer-events-none">
                        <div class="px-2 py-0.5 ${colorClass} text-white rounded-full shadow-lg text-[9px] font-black uppercase tracking-tight text-center whitespace-nowrap transition-colors duration-300">
                            Trung tâm ${locationName}
                        </div>
                        <div class="w-2.5 h-2.5 ${colorClass} rounded-full border-2 border-white shadow-md -mt-1 transition-colors duration-300"></div>
                   </div>`,
            iconSize: [150, 30],
            iconAnchor: [75, 30]
        });

        centerMarkerRef.current = window.L.marker([areaCenter.lat, areaCenter.lng], {
            icon: centerIcon,
            interactive: false,
            draggable: false,
            zIndexOffset: -100
        }).addTo(mapInstance.current);

        mapInstance.current.flyTo([areaCenter.lat, areaCenter.lng], 13, { duration: 1 });
    }, [areaCenter, locationName, areaRadius]);

    useEffect(() => {
        if (!areaCenter || areaCenter.lat == null || areaCenter.lng == null || !position || position.lat == null || position.lng == null) {
            setWarning(null);
            return;
        }

        const distance = haversine(position.lat, position.lng, areaCenter.lat, areaCenter.lng);
        const isOutside = distance > areaRadius;

        if (isOutside) {
            const warningMessage = `Vị trí đã chọn cách trung tâm ${locationName} khoảng ${distance.toFixed(2)} km. Vui lòng chọn trong khu vực vòng tròn (${areaRadius} km) cho phép.`;
            setWarning(warningMessage);
        } else {
            setWarning(null);
        }

        if (circleRef.current) {
            const colorHex = isOutside ? '#ef4444' : '#16a34a';
            circleRef.current.setStyle({
                color: colorHex,
                fillColor: colorHex
            });
        }

        if (centerMarkerRef.current) {
            const colorClass = isOutside ? 'bg-red-500' : 'bg-moss';
            const centerIcon = window.L.divIcon({
                className: "", 
                html: `<div class="flex flex-col items-center justify-end h-full w-full pointer-events-none">
                            <div class="px-2 py-0.5 ${colorClass} text-white rounded-full shadow-lg text-[9px] font-black uppercase tracking-tight text-center whitespace-nowrap transition-colors duration-300">
                                Trung tâm ${locationName}
                            </div>
                            <div class="w-2.5 h-2.5 ${colorClass} rounded-full border-2 border-white shadow-md -mt-1 transition-colors duration-300"></div>
                       </div>`,
                iconSize: [150, 30], 
                iconAnchor: [75, 30] 
            });
            centerMarkerRef.current.setIcon(centerIcon);
        }
    }, [position, areaCenter, locationName, areaRadius]);

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery + ', Vietnam')}&limit=1`);
            const data = await response.json();
            
            if (data && data.length > 0) {
                const lat = parseFloat(data[0].lat);
                const lon = parseFloat(data[0].lon);
                
                if (mapInstance.current && markerInstance.current) {
                    mapInstance.current.flyTo([lat, lon], 12);
                    markerInstance.current.setLatLng([lat, lon]);
                }
                
                onPositionChange({ lat, lng: lon });
            } else {
                alert("Không tìm thấy địa điểm này!");
            }
        } catch (error) {
            console.error("Lỗi tìm kiếm địa điểm:", error);
            alert("Có lỗi xảy ra khi tìm kiếm.");
        } finally {
            setIsSearching(false);
        }
    };

    return (
        <div className="flex flex-col gap-3 w-full h-full">
            <div className="z-[10] flex flex-col gap-2 shrink-0">
                <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-3 space-y-3">
                    <div className="flex-1 flex overflow-hidden shadow-sm">
                        <input 
                            type="text" 
                            placeholder="Tìm địa chỉ, địa danh..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleSearch();
                                }
                            }}
                            className="flex-1 px-3 py-2.5 text-xs font-bold text-stone-700 focus:outline-none bg-stone-50 rounded-l-lg border border-stone-200 focus:border-blue-600"
                        />
                        <button type="button" onClick={handleSearch} disabled={isSearching} className="px-4 py-2.5 bg-stone-100 text-stone-600 hover:bg-stone-200 border-y border-r border-stone-200 text-xs font-black disabled:opacity-50 rounded-r-lg transition-colors">
                            {isSearching ? '...' : 'TÌM'}
                        </button>
                    </div>
                    <div className="flex gap-3">
                        <div className="flex-1">
                            <label className="text-[9px] font-black text-stone-500 uppercase tracking-wider mb-1 block">Vĩ độ (Lat)</label>
                            <input
                                type="number"
                                step="any"
                                value={position.lat || ''}
                                onChange={(e) => onPositionChange({ ...position, lat: e.target.value })}
                                className="w-full px-3 py-2 text-xs font-bold text-stone-700 bg-stone-50 rounded-lg border border-stone-200 focus:outline-none focus:border-blue-600 shadow-sm"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="text-[9px] font-black text-stone-500 uppercase tracking-wider mb-1 block">Kinh độ (Lng)</label>
                            <input
                                type="number"
                                step="any"
                                value={position.lng || ''}
                                onChange={(e) => onPositionChange({ ...position, lng: e.target.value })}
                                className="w-full px-3 py-2 text-xs font-bold text-stone-700 bg-stone-50 rounded-lg border border-stone-200 focus:outline-none focus:border-blue-600 shadow-sm"
                            />
                        </div>
                    </div>
                </div>
                {warning && (
                    <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 text-xs rounded-r-xl shadow-sm" role="alert">
                        <p className="font-black uppercase text-sm mb-1">⚠️ Cảnh báo vị trí</p>
                        <p>{warning}</p>
                    </div>
                )}
            </div>
            <div className="relative flex-1 w-full min-h-[250px] rounded-2xl border-2 border-stone-200 overflow-hidden shadow-inner bg-stone-100 z-0">
                <div ref={mapRef} className="w-full h-full z-0"></div>
            </div>
        </div>
    );
};