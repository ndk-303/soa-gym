# Gym Models — FastAPI Simple CRUD Pattern

Thư mục này chứa các file định nghĩa Model và API CRUD theo phong cách tinh gọn của `books.py`.
Mỗi file là một ứng dụng FastAPI độc lập, lưu trữ dữ liệu in-memory mẫu, có Pydantic validation (`Field` limits: `min_length`, `max_length`, `gt`, `lt`) và `Config.json_schema_extra` example.

---

## Danh Sách Các File Models

| File | Model | Mô Tả | Lệnh Khởi Chạy (Chạy độc lập) |
|---|---|---|---|
| `users.py` | `User` | Quản lý người dùng (Admin, Trainer, Member) | `uvicorn users:app --reload --port 8001` |
| `membership_plans.py` | `MembershipPlan` | Quản lý các gói tập (1 tháng, 3 tháng, 1 năm...) | `uvicorn membership_plans:app --reload --port 8002` |
| `members.py` | `Member` | Quản lý hồ sơ hội viên và liên kết gói | `uvicorn members:app --reload --port 8003` |
| `gym_classes.py` | `GymClass` | Quản lý các lớp học (Yoga, Boxing, HIIT...) | `uvicorn gym_classes:app --reload --port 8004` |
| `class_slots.py` | `ClassSlot` | Quản lý khung giờ tập (Slot) của lớp học | `uvicorn class_slots:app --reload --port 8005` |
| `bookings.py` | `Booking` | Quản lý đặt chỗ lớp học và hàng đợi (Waitlist) | `uvicorn bookings:app --reload --port 8006` |
| `invoices.py` | `Invoice` | Quản lý hóa đơn tiền gói tập | `uvicorn invoices:app --reload --port 8007` |
| `payments.py` | `Payment` | Quản lý thanh toán hóa đơn | `uvicorn payments:app --reload --port 8008` |
| `attendance.py` | `AttendanceRecord` | Quản lý lượt ra vào điểm danh (Check-in/Check-out) | `uvicorn attendance:app --reload --port 8009` |

---

## Cấu Trúc Mỗi File Chuẩn Theo `books.py`

1. **Python Class**: Khởi tạo object với phương thức `__init__`.
2. **Pydantic Request Model (`BaseModel`)**:
   - `id: Optional[int] = Field(title="id is not needed")`
   - Các trường dữ liệu đi kèm giới hạn: `min_length`, `max_length`, `gt`, `lt`, `ge`.
   - `class Config`: Cung cấp `json_schema_extra` làm mẫu dữ liệu example trong Swagger Docs `/docs`.
3. **Danh sách in-memory**: Mảng Python chứa sẵn 3-4 bản ghi mẫu.
4. **Các API Endpoints**:
   - `GET /`: Trang chủ
   - `GET /<entities>`: Lấy toàn bộ danh sách
   - `GET /<entities>/get_...`: Lọc dữ liệu theo điều kiện (query param)
   - `GET /<entities>/{id}`: Lấy chi tiết 1 đối tượng theo ID
   - `POST /<entity>/create_<entity>`: Thêm mới đối tượng, tự động tăng ID qua hàm `find_<entity>_id`
   - `PUT /<entity>/update_<entity>`: Cập nhật thông tin đối tượng
   - `DELETE /<entities>/delete_<entity>/{id}`: Xóa đối tượng theo ID
