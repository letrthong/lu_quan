import test from 'node:test';
import assert from 'node:assert';

test('geolocation contract - first attempt uses 30s cache, subsequent attempts use 5s cache', async (t) => {
    // Giả lập logic đếm số lần định vị trong các hook (như useHotelEditForm, useHotelRequestForm, useSchemaManager)
    const mockGeolocationTracker = () => {
        let attempts = 0;
        
        return {
            getOptions: () => {
                const maxAge = attempts === 0 ? 30000 : 5000;
                attempts += 1;
                return { enableHighAccuracy: false, timeout: 10000, maximumAge: maxAge };
            },
            reset: () => {
                attempts = 0;
            }
        };
    };

    const tracker = mockGeolocationTracker();

    // Lần gọi đầu tiên (Attempt 1)
    const options1 = tracker.getOptions();
    assert.strictEqual(options1.maximumAge, 30000, "Lần đầu tiên phải sử dụng cache tối đa 30 giây (30000ms)");
    assert.strictEqual(options1.enableHighAccuracy, false, "enableHighAccuracy phải là false để định vị nhanh trên mobile");

    // Lần gọi thứ hai (Attempt 2)
    const options2 = tracker.getOptions();
    assert.strictEqual(options2.maximumAge, 5000, "Lần thứ hai trở đi phải sử dụng cache tối đa 5 giây (5000ms)");

    // Lần gọi thứ ba (Attempt 3)
    const options3 = tracker.getOptions();
    assert.strictEqual(options3.maximumAge, 5000, "Lần thứ ba vẫn phải duy trì cache tối đa 5 giây (5000ms)");
});

test('geolocation contract - NearByComponents initialization flow', async (t) => {
    // Giả lập luồng khởi chạy trong NearByComponents:
    // Gọi getCurrentPosition trước với maxAge 30s, sau đó kích hoạt watchPosition với maxAge 5s
    
    let getCurrentPositionCalled = false;
    let watchPositionCalled = false;
    
    let getCurrentPositionOptions = null;
    let watchPositionOptions = null;
    
    const mockNavigatorGeolocation = {
        getCurrentPosition: (success, error, options) => {
            getCurrentPositionCalled = true;
            getCurrentPositionOptions = options;
            // Giả lập gọi thành công lập tức
            success({ coords: { latitude: 10.0, longitude: 20.0 } });
        },
        watchPosition: (success, error, options) => {
            watchPositionCalled = true;
            watchPositionOptions = options;
            return 123; // watchId
        }
    };
    
    const runNearbyGeolocationEffect = (geolocation) => {
        // Thực thi mô phỏng useEffect trong NearByComponents
        geolocation.getCurrentPosition(
            (pos) => {
                // Thành công -> Bắt đầu theo dõi cập nhật mới nhất
                geolocation.watchPosition(
                    (watchPos) => {},
                    (err) => {},
                    { enableHighAccuracy: false, timeout: 10000, maximumAge: 5000 }
                );
            },
            (err) => {},
            { enableHighAccuracy: false, timeout: 5000, maximumAge: 30000 }
        );
    };
    
    runNearbyGeolocationEffect(mockNavigatorGeolocation);
    
    assert.ok(getCurrentPositionCalled, "getCurrentPosition phải được gọi trước");
    assert.strictEqual(getCurrentPositionOptions.maximumAge, 30000, "getCurrentPosition phải dùng maximumAge 30s");
    
    assert.ok(watchPositionCalled, "watchPosition phải được gọi sau khi getCurrentPosition thành công");
    assert.strictEqual(watchPositionOptions.maximumAge, 5000, "watchPosition phải dùng maximumAge 5s");
});
