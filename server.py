import http.server
import socketserver
import urllib.request
import urllib.parse
import json
import os

# Lấy PORT từ biến môi trường (cần thiết khi deploy lên Render/Railway)
PORT = int(os.environ.get("PORT", 8000))

class SmartProxyHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # Kiểm tra xem có phải yêu cầu proxy check hay không
        parsed_path = urllib.parse.urlparse(self.path)
        if parsed_path.path == '/proxy-check':
            query = urllib.parse.parse_qs(parsed_path.query)
            target_url = query.get('url', [None])[0]
            
            if not target_url:
                self.send_response(400)
                self.end_headers()
                return

            result = {"live": False, "status": "Unknown"}
            try:
                # Giả lập một trình duyệt thật để tránh bị chặn
                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
                req = urllib.request.Request(target_url, headers=headers)
                
                # Cố gắng kết nối với timeout 10 giây
                with urllib.request.urlopen(req, timeout=10) as response:
                    code = response.getcode()
                    if 200 <= code < 400:
                        result["live"] = True
                        result["status"] = code
                    else:
                        result["live"] = False
                        result["status"] = code
            except urllib.error.HTTPError as e:
                # Đây là nơi bắt được lỗi 521, 404, 503...
                result["live"] = False
                result["status"] = e.code
            except Exception as e:
                result["live"] = False
                result["status"] = "Connection Failed"

            # Trả kết quả về cho giao diện
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(result).encode())
        else:
            # Nếu không phải proxy check, thì trả về file tĩnh (html, css, js) như bình thường
            return super().do_GET()

# Khởi động server
socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(("", PORT), SmartProxyHandler) as httpd:
    print(f"--- BẮT ĐẦU CHẠY SERVER THÔNG MINH ---")
    print(f"Truy cập tại: http://localhost:{PORT}")
    print(f"Tính năng kiểm tra Live/Die chính xác đã sẵn sàng.")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nĐã dừng server.")
        httpd.server_close()
