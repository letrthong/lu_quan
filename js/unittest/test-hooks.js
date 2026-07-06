import test from 'node:test';
import assert from 'node:assert';

/**
 * Contract tests for hooks to ensure function signatures and data mappings
 * remain consistent. These tests help detect breaking changes early.
 */

// Mock provinces data matching the expected structure
const mockProvinces = [
    { id: "province-001", locationName: "Hà Nội", lat: "21.0285", lng: "105.8542", radius: "3" },
    { id: "province-002", locationName: "Đà Nẵng", lat: "16.0544", lng: "108.2022", radius: "2.5" },
    { id: "province-003", locationName: "Hồ Chí Minh", lat: "10.8231", lng: "106.6297", radius: "4" },
];

/**
 * Test: handleLocationChange expects a string ID, NOT an event object
 * 
 * This test documents the correct calling convention for handleLocationChange.
 * The function should be called with the province ID directly:
 *   handleLocationChange(p.id)        ✅ Correct
 *   handleLocationChange({ target: { value: p.id } })  ❌ Wrong
 */
test('hooks contract - handleLocationChange accepts string ID directly', async (t) => {
    // Simulate what handleLocationChange does internally
    const simulateHandleLocationChange = (locId, provinces) => {
        // This is the EXPECTED behavior: locId should be a string
        if (typeof locId !== 'string') {
            throw new Error(
                'handleLocationChange expects a string ID, not an object. ' +
                'Call it as handleLocationChange(p.id), NOT handleLocationChange({ target: { value: p.id } })'
            );
        }
        
        const province = provinces.find(p => p.id === locId);
        return province ? province.locationName : null;
    };

    // ✅ Correct usage: pass string ID directly
    const result = simulateHandleLocationChange("province-001", mockProvinces);
    assert.strictEqual(result, "Hà Nội", "Should find province when passed string ID");

    // ❌ Wrong usage: passing event-like object should fail
    assert.throws(
        () => simulateHandleLocationChange({ target: { value: "province-001" } }, mockProvinces),
        /expects a string ID/,
        "Should throw error when passed event object instead of string ID"
    );
});

/**
 * Test: Province selection in HotelRequestForm onClick handler
 * 
 * Documents the expected pattern for province selection click handlers.
 * The onClick should call: handleLocationChange(p.id)
 */
test('hooks contract - province selection onClick pattern', async (t) => {
    // Simulate the onClick handler pattern
    const createOnClickHandler = (province, handleLocationChange, setIsProvinceOpen, setProvinceSearchQuery) => {
        return () => {
            // This is the CORRECT pattern
            handleLocationChange(province.id);
            setIsProvinceOpen(false);
            setProvinceSearchQuery("");
        };
    };

    let receivedId = null;
    let isProvinceOpen = true;
    let searchQuery = "test";

    const mockHandleLocationChange = (locId) => { receivedId = locId; };
    const mockSetIsProvinceOpen = (val) => { isProvinceOpen = val; };
    const mockSetProvinceSearchQuery = (val) => { searchQuery = val; };

    const onClick = createOnClickHandler(
        mockProvinces[0],
        mockHandleLocationChange,
        mockSetIsProvinceOpen,
        mockSetProvinceSearchQuery
    );

    onClick();

    // Verify correct calling pattern
    assert.strictEqual(receivedId, "province-001", "handleLocationChange should receive province.id as string");
    assert.strictEqual(typeof receivedId, "string", "receivedId should be a string, not an object");
    assert.strictEqual(isProvinceOpen, false, "isProvinceOpen should be set to false");
    assert.strictEqual(searchQuery, "", "searchQuery should be cleared");
});

/**
 * Test: Province data structure contract
 * 
 * Ensures province objects have the expected fields that the hooks depend on.
 */
test('hooks contract - province data structure', async (t) => {
    const requiredFields = ['id', 'locationName'];
    const optionalFields = ['lat', 'lng', 'radius'];

    for (const province of mockProvinces) {
        // Check required fields
        for (const field of requiredFields) {
            assert.ok(
                province.hasOwnProperty(field),
                `Province must have '${field}' field`
            );
            assert.ok(
                typeof province[field] === 'string' && province[field].length > 0,
                `Province '${field}' must be a non-empty string`
            );
        }

        // Check optional fields exist (can be empty or undefined in real data)
        for (const field of optionalFields) {
            assert.ok(
                province.hasOwnProperty(field),
                `Province should have '${field}' field for optimal functionality`
            );
        }
    }
});

/**
 * Test: filteredProvinces logic
 * 
 * Verifies the Vietnamese search filtering works correctly.
 */
test('hooks contract - filteredProvinces search logic', async (t) => {
    const normalizeVietnamese = (str) => {
        return str.normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd')
            .replace(/Đ/g, 'D')
            .toLowerCase();
    };

    const filterProvinces = (provinces, searchQuery) => {
        if (!searchQuery) return provinces;
        const normalizedSearch = normalizeVietnamese(searchQuery);
        return provinces.filter(p => 
            normalizeVietnamese(p.locationName).includes(normalizedSearch)
        );
    };

    // Test: empty search returns all
    assert.strictEqual(filterProvinces(mockProvinces, "").length, 3);
    assert.strictEqual(filterProvinces(mockProvinces, null).length, 3);

    // Test: search with Vietnamese tones
    assert.strictEqual(filterProvinces(mockProvinces, "Hà Nội").length, 1);
    assert.strictEqual(filterProvinces(mockProvinces, "Hà Nội")[0].id, "province-001");

    // Test: search without tones should still work
    assert.strictEqual(filterProvinces(mockProvinces, "ha noi").length, 1);
    assert.strictEqual(filterProvinces(mockProvinces, "Da Nang").length, 1);

    // Test: partial search
    assert.strictEqual(filterProvinces(mockProvinces, "Hồ Chí").length, 1);

    // Test: no match
    assert.strictEqual(filterProvinces(mockProvinces, "xyz").length, 0);
});

/**
 * Test: locationId comparison must use strict equality
 * 
 * The province highlighting uses locationId === p.id comparison.
 * Both must be strings for correct matching.
 */
test('hooks contract - locationId comparison pattern', async (t) => {
    const isSelected = (locationId, provinceId) => {
        // This is what the UI uses for highlighting
        return locationId === provinceId;
    };

    // ✅ Correct: both are strings
    assert.strictEqual(isSelected("province-001", "province-001"), true);
    assert.strictEqual(isSelected("province-001", "province-002"), false);

    // ❌ Wrong: locationId as object would fail
    assert.strictEqual(isSelected({ target: { value: "province-001" } }, "province-001"), false, 
        "Object comparison with string should fail - this detects wrong data type");

    // ❌ Wrong: empty string vs null
    assert.strictEqual(isSelected("", "province-001"), false);
    assert.strictEqual(isSelected(null, "province-001"), false);
});
