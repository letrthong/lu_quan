# Quy tắc & Hướng dẫn Unit Test (Frontend)

## Mục đích
- Đảm bảo các hàm, component hoạt động đúng, ổn định khi thay đổi code.
- Phát hiện lỗi sớm, tăng độ tin cậy khi refactor.

## Công nghệ đề xuất
- [Vitest](https://vitest.dev/) (tích hợp tốt với Vite, React)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)

## Quy tắc viết Unit Test
- Mỗi hàm, component quan trọng đều cần có test.
- Đặt file test cùng cấp với file nguồn, tên dạng: `TenComponent.test.js` hoặc `TenComponent.spec.js`.
- Test phải độc lập, không phụ thuộc trạng thái ngoài.
- Ưu tiên test logic, hành vi, không test chi tiết UI cụ thể.
- Đảm bảo coverage tối thiểu 70% với các module nghiệp vụ.

## Ví dụ cấu trúc
```
js/
  components/
    HotelList.js
    HotelList.test.js
  utils/
    helpers.js
    helpers.test.js
```

## Chạy test
- Dùng lệnh: `npx vitest` hoặc `pnpm vitest`
- Có thể tích hợp CI để tự động chạy test khi push code.

## Ghi chú
- Luôn cập nhật test khi thay đổi logic.
- Review code phải kiểm tra test pass trước khi merge.
