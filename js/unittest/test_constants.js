import test from 'node:test';
import assert from 'node:assert';
import { HOTEL_TYPES, OPTIONAL_PHONE_TYPES, getIconForHotelType } from '../constants.js';

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
    assert.strictEqual(getIconForHotelType('nonexistent'), 'map-pin');
});
