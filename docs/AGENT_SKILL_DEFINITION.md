# Định nghĩa Agent & Skill trong dự án hotel_connect

## Agent là gì?
- Agent là một thành phần phần mềm tự động thực hiện một nhiệm vụ cụ thể trong hệ thống.
- Có thể là một service, bot, worker, hoặc module backend đảm nhận logic nghiệp vụ riêng biệt (ví dụ: phê duyệt, kiểm tra trạng thái, gửi thông báo...).
- Agent có thể hoạt động độc lập, giao tiếp với các thành phần khác qua API, message queue, hoặc sự kiện.

## Skill là gì?
- Skill là tập hợp kiến thức, quy tắc, hướng dẫn kỹ thuật, best practice... được ghi lại dưới dạng tài liệu (thường là file .md trong .gemini).
- Skill giúp team phát triển, bảo trì, vận hành dự án hiệu quả, đảm bảo tuân thủ quy trình và tiêu chuẩn chung.
- Skill không phải là mã nguồn thực thi, mà là "bộ kỹ năng"/"knowledge base" cho dự án.

## Ví dụ
- Agent: Một script Python tự động kiểm tra trạng thái khách sạn và cập nhật database mỗi đêm.
- Skill: File PAGINATION_RULES.md mô tả quy tắc phân trang API và frontend.

## Ví dụ tích hợp skill bên ngoài
- Để thêm skill (ví dụ: design system, component, template) vào dự án Node.js/JS, có thể dùng lệnh:

  npx skills add https://github.com/wshobson/agents --skill tailwind-design-system

- Lệnh này sẽ tự động tải và tích hợp bộ skill tailwind-design-system từ repo ngoài vào workspace, giúp tăng tốc phát triển frontend.
- Sau khi thêm, đọc hướng dẫn sử dụng skill để import component hoặc cấu hình vào dự án.

## Hướng dẫn sử dụng skill sau khi add
1. Sau khi chạy lệnh npx skills add ... kiểm tra thư mục .skills hoặc các file mới được thêm vào dự án.
2. Đọc file README.md hoặc hướng dẫn sử dụng trong thư mục skill (ví dụ: .skills/tailwind-design-system/README.md).
3. Nếu skill là bộ component UI:
   - Import component vào code React/Vue/... của bạn, ví dụ:
     ```js
     import { Button, Card } from '.skills/tailwind-design-system';
     ```
   - Sử dụng component như bình thường trong JSX/TSX.
4. Nếu skill có cấu hình tailwind:
   - Merge hoặc import cấu hình vào tailwind.config.js của dự án.
   - Khởi động lại server dev để nhận config mới.
5. Nếu skill là script/tool:
   - Làm theo hướng dẫn trong README của skill để chạy hoặc tích hợp vào workflow.
6. Nếu gặp lỗi, kiểm tra log terminal và đảm bảo đã cài đủ dependency (npm, tailwind, ...).

> Luôn đọc kỹ hướng dẫn của từng skill vì mỗi skill có thể có cách tích hợp khác nhau.

## Lưu ý
- .gemini chỉ chứa skill (tài liệu), không chứa agent (mã nguồn thực thi).
- Agent thường nằm ở src/, backend/, hoặc các thư mục mã nguồn khác.
