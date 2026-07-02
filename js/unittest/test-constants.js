import test from 'node:test';
import assert from 'node:assert';
import { HOTEL_TYPES, OPTIONAL_PHONE_TYPES, getIconForHotelType, REPORT_REASONS, getReasonText, getTypeLabel } from '../constants.js';

test('constants - HOTEL_TYPES structure', (t) => {
    assert.ok(Array.isArray(HOTEL_TYPES));
    assert.ok(HOTEL_TYPES.length > 0);
    assert.strictEqual(HOTEL_TYPES[0].id, 'hotel');
});

test('constants - OPTIONAL_PHONE_TYPES', (t) => {
    assert.ok(Array.isArray(OPTIONAL_PHONE_TYPES));
    assert.ok(OPTIONAL_PHONE_TYPES.includes('entertainment'));
});

test('constants - getIconForHotelType mapping', (t) => {
    assert.strictEqual(getIconForHotelType('hotel'), 'building');
    assert.strictEqual(getIconForHotelType('restaurant'), 'utensils');
    assert.strictEqual(getIconForHotelType('coffee'), 'coffee');
    assert.strictEqual(getIconForHotelType('nonexistent'), 'map-pin');
});

test('constants - REPORT_REASONS structure', (t) => {
    assert.ok(REPORT_REASONS);
    assert.strictEqual(REPORT_REASONS.wrong_phone, 'Số điện thoại sai');
    assert.strictEqual(REPORT_REASONS.other, 'Lý do khác');
});

test('constants - getReasonText mapping', (t) => {
    assert.strictEqual(getReasonText('wrong_phone'), 'Số điện thoại sai');
    assert.strictEqual(getReasonText('other'), 'Lý do khác');
    assert.strictEqual(getReasonText('unknown_reason_code'), 'unknown_reason_code');
});

test('constants - getTypeLabel mapping', (t) => {
    assert.strictEqual(getTypeLabel('hotel'), 'Khách sạn');
    assert.strictEqual(getTypeLabel('coffee'), 'Quán cà phê');
    assert.strictEqual(getTypeLabel('nonexistent'), 'nonexistent');
});
