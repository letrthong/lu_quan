# Hướng dẫn CI/CD: Tự động build, test, deploy với Docker trên Ubuntu

## Mục tiêu
- Tự động kiểm thử (unit test) khi push code.
- Build image Docker và khởi động container trên server Ubuntu.
- Copy file cấu hình hoặc dữ liệu cần thiết vào container.

## Ví dụ workflow GitHub Actions
Tạo file `.github/workflows/deploy.yml` trong repo:

```yaml
name: CI/CD Docker Ubuntu
on:
  push:
    branches: [main]
jobs:
  build-test-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - run: pnpm install
      - run: pnpm vitest run
      - name: Build Docker image
        run: docker build -t hotel_connect .
      - name: Copy config files
        run: |
          docker create --name temp_container hotel_connect
          docker cp ./config/ temp_container:/app/config/
          docker commit temp_container hotel_connect:with-config
          docker rm temp_container
      - name: Run Docker container
        run: |
          docker stop hotel_connect || true
          docker rm hotel_connect || true
          docker run -d --name hotel_connect -p 80:80 hotel_connect:with-config
```

## Giải thích
- Khi push lên nhánh main:
  - Cài dependencies, chạy unit test.
  - Build Docker image.
  - Copy thư mục `config/` vào image (nếu cần).
  - Khởi động lại container với image mới.

## Lưu ý
- Server cần cài sẵn Docker.
- Có thể chỉnh sửa đường dẫn, port, tên image/container cho phù hợp.
- Nếu deploy lên server riêng, nên dùng thêm bước SSH hoặc rsync để copy code lên server trước khi build.
