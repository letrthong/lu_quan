import test from 'node:test';
import assert from 'node:assert';
import HotelAPI from '../api.js';

test('api - getBannedWords success', async (t) => {
    const originalFetch = global.fetch;
    
    // Reset cache
    HotelAPI.bannedWords = null;
    
    // Mock fetch
    global.fetch = async (url) => {
        assert.ok(url.includes('banned_words.json'));
        return {
            ok: true,
            json: async () => ["banned1", "banned2"]
        };
    };

    try {
        const words = await HotelAPI.getBannedWords();
        assert.deepStrictEqual(words, ["banned1", "banned2"]);
        
        // Test cache: should not call fetch again
        global.fetch = () => { throw new Error("Should use cache"); };
        const cachedWords = await HotelAPI.getBannedWords();
        assert.deepStrictEqual(cachedWords, ["banned1", "banned2"]);
    } finally {
        global.fetch = originalFetch;
    }
});

test('api - getBannedWords fallback on error', async (t) => {
    const originalFetch = global.fetch;
    
    // Reset cache
    HotelAPI.bannedWords = null;
    
    global.fetch = async (url) => {
        return {
            ok: false
        };
    };

    try {
        const words = await HotelAPI.getBannedWords();
        assert.deepStrictEqual(words, ["sex", "tinhduc"]);
    } finally {
        global.fetch = originalFetch;
    }
});

test('api - fetchPendingRequests success', async (t) => {
    const originalFetch = global.fetch;
    
    global.fetch = async (url) => {
        assert.ok(url.includes('/api/hotelconnect/v1/hotels/request'));
        return {
            ok: true,
            json: async () => [{ id: "req1", name: "Hotel A" }]
        };
    };

    try {
        const res = await HotelAPI.fetchPendingRequests();
        assert.deepStrictEqual(res, [{ id: "req1", name: "Hotel A" }]);
    } finally {
        global.fetch = originalFetch;
    }
});

test('api - fetchPendingRequests error response', async (t) => {
    const originalFetch = global.fetch;
    
    global.fetch = async (url) => {
        return {
            ok: false
        };
    };

    try {
        await assert.rejects(
            async () => { await HotelAPI.fetchPendingRequests(); },
            /Lỗi khi tải danh sách yêu cầu chờ duyệt/
        );
    } finally {
        global.fetch = originalFetch;
    }
});
