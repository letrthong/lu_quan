import test from 'node:test';
import assert from 'node:assert';

// Mô phỏng logic tìm kiếm và sắp xếp trong useSchemaManager.js để viết unit test
const mockSchemas = [
    { id: "1", locationName: "Lâm Đồng - Chợ Đà Lạt", lat: 11.9, lng: 108.4, radius: 2, updatedAt: "2026-03-31" },
    { id: "2", locationName: "Đà Nẵng - Biển Mỹ Khê", lat: 16.0, lng: 108.2, radius: 2, updatedAt: "2026-04-12" },
    { id: "3", locationName: "Hà Nội - Hồ Hoàn Kiếm", lat: 21.0, lng: 105.8, radius: 5, updatedAt: "2026-04-01" }
];

function getFilteredAndSortedSchemas(schemas, searchTerm, sortConfig) {
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
}

test('schema manager - search filtering with Vietnamese tones', () => {
    // Tìm kiếm không phân biệt dấu tiếng Việt
    const searchDaLat = getFilteredAndSortedSchemas(mockSchemas, "da lat", { key: 'locationName', direction: 'asc' });
    assert.strictEqual(searchDaLat.length, 1);
    assert.strictEqual(searchDaLat[0].id, "1");

    const searchDaNang = getFilteredAndSortedSchemas(mockSchemas, "Đà Nẵng", { key: 'locationName', direction: 'asc' });
    assert.strictEqual(searchDaNang.length, 1);
    assert.strictEqual(searchDaNang[0].id, "2");
});

test('schema manager - sorting by locationName and updatedAt', () => {
    // Sắp xếp theo tên tăng dần (A-Z tiếng Việt)
    // Thứ tự đúng: Đà Nẵng (2) -> Hà Nội (3) -> Lâm Đồng (1)
    const sortedByNameAsc = getFilteredAndSortedSchemas(mockSchemas, "", { key: 'locationName', direction: 'asc' });
    assert.strictEqual(sortedByNameAsc[0].id, "2"); // Đà Nẵng
    assert.strictEqual(sortedByNameAsc[1].id, "3"); // Hà Nội
    assert.strictEqual(sortedByNameAsc[2].id, "1"); // Lâm Đồng

    // Sắp xếp theo tên giảm dần (Z-A tiếng Việt)
    // Thứ tự đúng: Lâm Đồng (1) -> Hà Nội (3) -> Đà Nẵng (2)
    const sortedByNameDesc = getFilteredAndSortedSchemas(mockSchemas, "", { key: 'locationName', direction: 'desc' });
    assert.strictEqual(sortedByNameDesc[0].id, "1"); // Lâm Đồng
    assert.strictEqual(sortedByNameDesc[1].id, "3"); // Hà Nội
    assert.strictEqual(sortedByNameDesc[2].id, "2"); // Đà Nẵng

    // Sắp xếp theo ngày cập nhật tăng dần
    const sortedByDateAsc = getFilteredAndSortedSchemas(mockSchemas, "", { key: 'updatedAt', direction: 'asc' });
    assert.strictEqual(sortedByDateAsc[0].id, "1"); // 2026-03-31
    assert.strictEqual(sortedByDateAsc[1].id, "3"); // 2026-04-01
    assert.strictEqual(sortedByDateAsc[2].id, "2"); // 2026-04-12
});

test('schema manager - validation payload conversion', () => {
    // Mô phỏng chuẩn bị dữ liệu trong useSchemaManager.js handleSubmit
    const preparePayload = (formData) => {
        if (!formData.locationName || !formData.lat || !formData.lng) {
            throw new Error("Missing required fields");
        }
        return {
            locationName: formData.locationName,
            lat: parseFloat(formData.lat),
            lng: parseFloat(formData.lng),
            radius: parseFloat(formData.radius || 10)
        };
    };

    // Trường hợp chuyển đổi hợp lệ
    const validForm = { locationName: "Huế", lat: "16.45", lng: "107.57", radius: "20" };
    const payload = preparePayload(validForm);
    assert.deepStrictEqual(payload, {
        locationName: "Huế",
        lat: 16.45,
        lng: 107.57,
        radius: 20
    });

    // Trường hợp thiếu dữ liệu
    const invalidForm = { locationName: "", lat: "16.45", lng: "107.57" };
    assert.throws(() => preparePayload(invalidForm), /Missing required fields/);
});

test('schema manager - validation: cannot reduce radius', () => {
    // Mô phỏng nghiệp vụ không được phép giảm bán kính của khu vực có sẵn
    const validateRadiusChange = (editingSchema, newRadiusInput) => {
        const currentRadius = parseFloat(editingSchema.radius || 10);
        const newRadius = parseFloat(newRadiusInput || 10);
        if (newRadius < currentRadius) {
            throw new Error("Cannot reduce radius");
        }
        return true;
    };

    const schema = { id: "1", radius: 10 };
    
    // Hợp lệ: Giữ nguyên hoặc tăng bán kính
    assert.ok(validateRadiusChange(schema, "10"));
    assert.ok(validateRadiusChange(schema, "20"));

    // Không hợp lệ: Giảm bán kính xuống nhỏ hơn bán kính hiện tại
    assert.throws(() => validateRadiusChange(schema, "5"), /Cannot reduce radius/);
});
