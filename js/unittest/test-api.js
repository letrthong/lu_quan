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

test('api - fetchSosRequests success', async (t) => {
    const originalFetch = global.fetch;
    global.fetch = async (url) => {
        assert.ok(url.includes('/api/hotelconnect/v1/sos'));
        return {
            ok: true,
            json: async () => [{ id: "sos1", name: "User A" }]
        };
    };
    try {
        const res = await HotelAPI.fetchSosRequests();
        assert.deepStrictEqual(res, [{ id: "sos1", name: "User A" }]);
    } finally {
        global.fetch = originalFetch;
    }
});

test('api - submitSosRequest success', async (t) => {
    const originalFetch = global.fetch;
    const body = { name: "User A", phone: "123", lat: 10, lng: 20, message: "help" };
    global.fetch = async (url, options) => {
        assert.ok(url.includes('/api/hotelconnect/v1/sos'));
        assert.strictEqual(options.method, 'POST');
        assert.deepStrictEqual(JSON.parse(options.body), body);
        return {
            ok: true,
            json: async () => ({ success: true })
        };
    };
    try {
        const res = await HotelAPI.submitSosRequest(body);
        assert.deepStrictEqual(res, { success: true });
    } finally {
        global.fetch = originalFetch;
    }
});
test('api - updateSosStatus success', async (t) => {
    const originalFetch = global.fetch;
    
    // Test with isAdmin = true
    let calledUrlWithAdmin = null;
    global.fetch = async (url, options) => {
        calledUrlWithAdmin = url;
        assert.strictEqual(options.method, 'PUT');
        assert.deepStrictEqual(JSON.parse(options.body), { status: 'resolved' });
        return {
            ok: true,
            json: async () => ({ success: true })
        };
    };
    try {
        const res = await HotelAPI.updateSosStatus('sos1', 'resolved', true);
        assert.deepStrictEqual(res, { success: true });
        assert.ok(calledUrlWithAdmin.includes('/api/hotelconnect/v1/sos/sos1?is_admin=true'));
    } finally {
        global.fetch = originalFetch;
    }
});
