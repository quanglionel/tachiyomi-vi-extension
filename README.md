# Tachiyomi Vietnamese Extensions Viewer

Ứng dụng hiển thị và kiểm tra trạng thái các Extension Tachiyomi nguồn Tiếng Việt.

## Cách chạy Local
1. Cài đặt Python.
2. Chạy lệnh: `python server.py`
3. Truy cập: `http://localhost:8000`

## Cách Deploy (Triển khai lên mạng)
### Lên Render.com (Khuyên dùng)
1. Tạo một Repository mới trên GitHub và đẩy toàn bộ code lên đó.
2. Truy cập [Render.com](https://render.com), tạo một **Web Service** mới.
3. Kết nối với Repo GitHub của bạn.
4. Cấu hình:
   - **Environment**: `Python`
   - **Build Command**: `pip install -r requirements.txt` (Dù file trống vẫn nên để)
   - **Start Command**: `python server.py`
5. Nhấn Deploy và chờ Render cấp link cho bạn!
