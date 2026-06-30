/**
 * SchemaManager Component
 * 
 * Component cho phép admin quản lý (thêm, sửa, xóa) các khu vực (schema).
 * Component này được viết bằng JSX và cần môi trường có Babel transpiler để chạy,
 * phù hợp với cấu trúc dự án đã mô tả trong README.md.
 * 
 * @param {object} props - Props của component.
 * @param {object} props.api - Đối tượng HotelAPI đã được khởi tạo để gọi API.
 * @param {function} props.onToast - Hàm để hiển thị thông báo (toast).
 */
function SchemaManager({ api, onToast }) {
    const { useState, useEffect, useCallback, useMemo } = React;

    const [schemas, setSchemas] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editingSchema, setEditingSchema] = useState(null); // null: thêm mới, object: chỉnh sửa
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'locationName', direction: 'asc' });

    // State cho form
    const [formData, setFormData] = useState({
        locationName: '',
        lat: '',
        lng: '',
        radius: 2   
    });
    const [pickerPos, setPickerPos] = useState({ lat: 14.0583, lng: 108.2772 }); // Mặc định ở trung tâm Việt Nam
    const [isLocating, setIsLocating] = useState(false);

    const fetchSchemas = useCallback(async () => {
        try {
            setIsLoading(true);
            const data = await api.getSchemas();
            setSchemas(data || []);
            setError(null);
        } catch (err) {
            setError('Không thể tải danh sách khu vực. Vui lòng thử lại.');
            onToast('error', 'Lỗi tải dữ liệu khu vực.');
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
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
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
            fetchSchemas(); // Tải lại danh sách
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
                // Cập nhật
                const currentRadius = parseFloat(editingSchema.radius || 10);
                if (payload.radius < currentRadius) {
                    onToast('error', 'Không thể giảm bán kính nhỏ hơn mức hiện tại.');
                    return;
                }
                await api.updateSchema(editingSchema.id, payload);
                onToast('success', 'Cập nhật khu vực thành công!');
            } else {
                // Thêm mới
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
            return { key, direction: key === 'updatedAt' ? 'desc' : 'asc' }; // Ngày cập nhật ưu tiên mới nhất
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
                const compareResult = nameA.localeCompare(nameB, 'vi'); // Hỗ trợ so sánh có dấu tiếng Việt
                return sortConfig.direction === 'asc' ? compareResult : -compareResult;
            }
        });

        return result;
    }, [schemas, searchTerm, sortConfig]);

    return (
        <div className="p-4 bg-gray-50 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">Quản lý Khu vực (Tỉnh/Thành phố)</h2>

            {/* Form thêm/sửa */}
            <form onSubmit={handleSubmit} className="mb-6 p-4 border rounded-lg bg-white">
                <h3 className="text-xl font-semibold mb-3">{editingSchema ? 'Chỉnh sửa khu vực' : 'Thêm khu vực mới'}</h3>
                
                <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-medium text-gray-700">Vị trí trung tâm khu vực (Kéo Marker hoặc Chạm trên bản đồ)</label>
                        <button 
                            type="button" 
                            onClick={handleGetCurrentLocation}
                            disabled={isLocating}
                            className="flex items-center gap-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-lg transition-colors active:scale-95 disabled:opacity-50"
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
                        <LocationPickerMap key={editingSchema ? editingSchema.id : 'new'} position={pickerPos} onPositionChange={handlePickerChange} />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label htmlFor="locationName" className="block text-sm font-medium text-gray-700">Tên khu vực</label>
                        <input type="text" id="locationName" name="locationName" value={formData.locationName} onChange={handleInputChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="Ví dụ: Đà Lạt" />
                    </div>
                    <div>
                        <label htmlFor="lat" className="block text-sm font-medium text-gray-700">Vĩ độ (Latitude)</label>
                        <input type="number" step="any" id="lat" name="lat" value={formData.lat} onChange={handleInputChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="Ví dụ: 11.9404" />
                    </div>
                    <div>
                        <label htmlFor="lng" className="block text-sm font-medium text-gray-700">Kinh độ (Longitude)</label>
                        <input type="number" step="any" id="lng" name="lng" value={formData.lng} onChange={handleInputChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="Ví dụ: 108.4583" />
                    </div>
                    <div>
                        <label htmlFor="radius" className="block text-sm font-medium text-gray-700">Bán kính giới hạn</label>
                        <select id="radius" name="radius" value={formData.radius} onChange={handleInputChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                            <option value="2" disabled={editingSchema && parseFloat(editingSchema.radius || 10) > 2}>2 km</option>
                            <option value="5" disabled={editingSchema && parseFloat(editingSchema.radius || 10) > 5}>5 km</option>
                            <option value="10" disabled={editingSchema && parseFloat(editingSchema.radius || 10) > 10}>10 km</option>
                            <option value="20" disabled={editingSchema && parseFloat(editingSchema.radius || 10) > 20}>20 km</option>
                            <option value="50" disabled={editingSchema && parseFloat(editingSchema.radius || 10) > 50}>50 km</option>
                        </select>
                    </div>
                </div>
                <div className="mt-4 flex items-center justify-end gap-2">
                    {editingSchema && (
                        <button type="button" onClick={resetForm} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Hủy</button>
                    )}
                    <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2">
                        {editingSchema ? 'Lưu thay đổi' : 'Thêm mới'}
                    </button>
                </div>
            </form>

            {/* Danh sách khu vực */}
            <div className="mt-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                    <h3 className="text-xl font-semibold">Danh sách khu vực hiện có</h3>
                    <input 
                        type="text" 
                        placeholder="Tìm kiếm khu vực..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full sm:w-64 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                </div>
                {isLoading && <p>Đang tải...</p>}
                {error && <p className="text-red-500">{error}</p>}
                {!isLoading && !error && (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-16">STT</th>
                                    <th 
                                        scope="col" 
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-200 select-none group transition-colors"
                                        onClick={() => handleSort('locationName')}
                                        title="Nhấn để sắp xếp"
                                    >
                                        <div className="flex items-center gap-1">
                                            Tên khu vực {sortConfig.key === 'locationName' && <span className="text-gray-400 group-hover:text-gray-700">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>}
                                        </div>
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vĩ độ</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kinh độ</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bán kính</th>
                                    <th 
                                        scope="col" 
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-200 select-none group transition-colors"
                                        onClick={() => handleSort('updatedAt')}
                                        title="Nhấn để sắp xếp"
                                    >
                                        <div className="flex items-center gap-1">
                                            Ngày cập nhật {sortConfig.key === 'updatedAt' && <span className="text-gray-400 group-hover:text-gray-700">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>}
                                        </div>
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hành động</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File Path ID</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredSchemas.length === 0 ? (
                                    <tr><td colSpan="8" className="px-6 py-4 text-center text-gray-500">{searchTerm ? 'Không tìm thấy khu vực nào phù hợp.' : 'Chưa có khu vực nào.'}</td></tr>
                                ) : filteredSchemas.map((schema, index) => (
                                    <tr key={schema.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center font-bold">{index + 1}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{schema.locationName}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{schema.lat}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{schema.lng}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{schema.radius || 10} km</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{schema.updatedAt ? schema.updatedAt.split('-').reverse().join('/') : 'Chưa rõ'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex gap-2">
                                            <button onClick={() => handleEdit(schema)} className="text-indigo-600 hover:text-indigo-900">Sửa</button>
                                            <button onClick={() => handleDelete(schema.id)} className="text-red-600 hover:text-red-900">Xóa</button>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{schema.filePathId}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}