import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

export const useSchemaManager = (api, onToast) => {
    const [schemas, setSchemas] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editingSchema, setEditingSchema] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'locationName', direction: 'asc' });

    const [formData, setFormData] = useState({
        locationName: '',
        lat: '',
        lng: '',
        radius: 2   
    });
    const [pickerPos, setPickerPos] = useState({ lat: 14.0583, lng: 108.2772 });
    const [isLocating, setIsLocating] = useState(false);
    const locationAttempts = useRef(0);

    const fetchSchemas = useCallback(async () => {
        try {
            setIsLoading(true);
            const data = await api.getSchemas();
            setSchemas(data || []);
            setError(null);
        } catch (err) {
            setError(err.message || 'Không thể tải danh sách khu vực. Vui lòng thử lại.');
            onToast('error', err.message || 'Lỗi tải dữ liệu khu vực.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [api, onToast]);

    useEffect(() => {
        fetchSchemas();
    }, [fetchSchemas]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        if (name === 'lat' || name === 'lng') {
            const lat = name === 'lat' ? parseFloat(value) : pickerPos.lat;
            const lng = name === 'lng' ? parseFloat(value) : pickerPos.lng;
            if (!isNaN(lat) && !isNaN(lng)) {
                setPickerPos({ lat, lng });
            }
        }
    };

    const handlePickerChange = (pos) => {
        setFormData(prev => ({
            ...prev,
            lat: pos.lat.toFixed(6),
            lng: pos.lng.toFixed(6)
        }));
        setPickerPos(pos);
    };

    const handleGetCurrentLocation = () => {
        if (!navigator.geolocation) {
            onToast('Trình duyệt của bạn không hỗ trợ GPS.');
            return;
        }

        setIsLocating(true);
        const maxAge = locationAttempts.current === 0 ? 30000 : 5000;
        locationAttempts.current += 1;

        navigator.geolocation.getCurrentPosition(
            (position) => {
                handlePickerChange({ lat: position.coords.latitude, lng: position.coords.longitude });
                setIsLocating(false);
                onToast('Đã cập nhật vị trí hiện tại của bạn!');
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

    const resetForm = () => {
        setFormData({ locationName: '', lat: '', lng: '', radius: 10 });
        setPickerPos({ lat: 14.0583, lng: 108.2772 });
        setEditingSchema(null);
    };

    const handleEdit = (schema) => {
        setEditingSchema(schema);
        setFormData({
            locationName: schema.locationName,
            lat: schema.lat,
            lng: schema.lng,
            radius: schema.radius || 10
        });
        setPickerPos({ lat: parseFloat(schema.lat) || 14.0583, lng: parseFloat(schema.lng) || 108.2772 });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (schemaId) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa khu vực này?')) {
            return;
        }
        try {
            await api.deleteSchema(schemaId);
            onToast('success', 'Xóa khu vực thành công!');
            fetchSchemas();
        } catch (err) {
            onToast('error', 'Xóa khu vực thất bại.');
            console.error(err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.locationName || !formData.lat || !formData.lng) {
            onToast('error', 'Vui lòng điền đầy đủ thông tin.');
            return;
        }

        const payload = {
            locationName: formData.locationName,
            lat: parseFloat(formData.lat),
            lng: parseFloat(formData.lng),
            radius: parseFloat(formData.radius || 10)
        };

        try {
            if (editingSchema) {
                const currentRadius = parseFloat(editingSchema.radius || 10);
                if (payload.radius < currentRadius) {
                    onToast('error', 'Không thể giảm bán kính nhỏ hơn mức hiện tại.');
                    return;
                }
                await api.updateSchema(editingSchema.id, payload);
                onToast('success', 'Cập nhật khu vực thành công!');
            } else {
                payload.filePathId = `hotel_${crypto.randomUUID()}.json`;
                await api.addSchema(payload);
                onToast('success', 'Thêm khu vực mới thành công!');
            }
            resetForm();
            fetchSchemas();
        } catch (err) {
            const action = editingSchema ? 'Cập nhật' : 'Thêm mới';
            onToast('error', `${action} khu vực thất bại.`);
            console.error(err);
        }
    };

    const handleSort = (key) => {
        setSortConfig(prev => {
            if (prev.key === key) {
                return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
            }
            return { key, direction: key === 'updatedAt' ? 'desc' : 'asc' };
        });
    };

    const filteredSchemas = useMemo(() => {
        let result = [...schemas];

        if (searchTerm.trim()) {
            const normalizedSearch = searchTerm.toLowerCase();
            const removeTones = (str) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
            result = result.filter(schema => 
                schema.locationName && removeTones(schema.locationName.toLowerCase()).includes(removeTones(normalizedSearch))
            );
        }

        result.sort((a, b) => {
            if (sortConfig.key === 'updatedAt') {
                const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
                const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
                const compareResult = dateA - dateB;
                return sortConfig.direction === 'asc' ? compareResult : -compareResult;
            } else {
                const nameA = a.locationName || '';
                const nameB = b.locationName || '';
                const compareResult = nameA.localeCompare(nameB, 'vi');
                return sortConfig.direction === 'asc' ? compareResult : -compareResult;
            }
        });

        return result;
    }, [schemas, searchTerm, sortConfig]);

    return {
        schemas,
        isLoading,
        error,
        editingSchema,
        searchTerm,
        setSearchTerm,
        sortConfig,
        formData,
        pickerPos,
        isLocating,
        handleInputChange,
        handlePickerChange,
        handleGetCurrentLocation,
        resetForm,
        handleEdit,
        handleDelete,
        handleSubmit,
        handleSort,
        filteredSchemas
    };
};
