const test = require('node:test');
const assert = require('node:assert');
const constants = require('../constants.js');

test('constants - HOTEL_TYPES structure', (t) => {
    assert.ok(Array.isArray(constants.HOTEL_TYPES));
    assert.ok(constants.HOTEL_TYPES.length > 0);
    assert.strictEqual(constants.HOTEL_TYPES[0].id, 'hotel');
});

test('constants - OPTIONAL_PHONE_TYPES', (t) => {
    assert.ok(Array.isArray(constants.OPTIONAL_PHONE_TYPES));
    assert.ok(constants.OPTIONAL_PHONE_TYPES.includes('entertainment'));
});

test('constants - getIconForHotelType mapping', (t) => {
    assert.strictEqual(constants.getIconForHotelType('hotel'), 'building');
    assert.strictEqual(constants.getIconForHotelType('restaurant'), 'utensils');
    assert.strictEqual(constants.getIconForHotelType('nonexistent'), 'map-pin');
});
