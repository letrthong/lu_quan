import test from 'node:test';
import assert from 'node:assert';
import { decodeBase64, encodeBase64, isValidPhoneNumber, calculateDistance, removeVietnameseTones } from '../utils.js';

test('utils - encodeBase64 and decodeBase64', (t) => {
    const raw = "Lữ Quán Việt Nam!";
    const encoded = encodeBase64(raw);
    const decoded = decodeBase64(encoded);
    assert.strictEqual(decoded, raw);
    
    // Empty inputs
    assert.strictEqual(encodeBase64(""), "");
    assert.strictEqual(decodeBase64(""), "");
});

test('utils - isValidPhoneNumber', (t) => {
    // Valid phone numbers
    assert.ok(isValidPhoneNumber("0912345678"));
    assert.ok(isValidPhoneNumber("0241234567"));
    assert.ok(isValidPhoneNumber("12345678")); // 8 digits
    assert.ok(isValidPhoneNumber("12345678901")); // 11 digits

    // Invalid phone numbers
    assert.ok(!isValidPhoneNumber(""));
    assert.ok(!isValidPhoneNumber("123")); // too short
    assert.ok(!isValidPhoneNumber("123456789012")); // too long
    assert.ok(!isValidPhoneNumber("0912abc345")); // contains letters
});

test('utils - calculateDistance', (t) => {
    // Distance to itself should be 0
    const lat = 21.0285;
    const lng = 105.8542;
    assert.strictEqual(calculateDistance(lat, lng, lat, lng), 0);

    // Distance between Hanoi (21.0285, 105.8542) and Ho Chi Minh City (10.8231, 106.6297)
    // ~1130-1160 km
    const distance = calculateDistance(21.0285, 105.8542, 10.8231, 106.6297);
    assert.ok(distance > 1100 && distance < 1200);

    // Null/undefined inputs should return Infinity
    assert.strictEqual(calculateDistance(null, lng, lat, lng), Infinity);
    assert.strictEqual(calculateDistance(lat, null, lat, lng), Infinity);
});

test('utils - removeVietnameseTones', (t) => {
    assert.strictEqual(removeVietnameseTones("Lữ Quán"), "lu quan");
    assert.strictEqual(removeVietnameseTones("Đà Nẵng"), "da nang");
    assert.strictEqual(removeVietnameseTones("   Tiếng    Việt   "), "tieng viet");
    assert.strictEqual(removeVietnameseTones(""), "");
});
