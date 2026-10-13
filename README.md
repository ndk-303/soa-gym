# Gym Management System — FastAPI Modular Monolith (SQLite + Pure SQLAlchemy 2.0)

Dự án Hệ Thống Quản Lý Phòng Tập (Gym Management System) được tổ chức theo kiến trúc **Modular Monolith** bằng **FastAPI**, **SQLAlchemy 2.0** (Mapped/mapped_column) và lưu trữ dữ liệu bền vững bằng **SQLite**. Toàn bộ 9 domain modules được tích hợp vào một ứng dụng duy nhất chạy trên cổng `8000`.

---

## 🚀 Khởi Chạy Nhanh

### Cài Đặt Môi Trường
```bash
pip install fastapi uvicorn pydantic sqlalchemy pytest httpx
```

### Nạp Dữ Liệu Mẫu (Tùy Chọn)
Khởi tạo cấu trúc bảng và nạp sẵn dữ liệu mẫu vào file `gym.db`:
```bash
python seed.py
```

### Khởi Động Ứng Dụng
```bash
python run.py
```
Hoặc dùng uvicorn trực tiếp:
```bash
uvicorn app.main:app --reload --port 8000
```

- **Root API / Health:** [http://localhost:8000/](http://localhost:8000/)
- **Swagger UI Interactive Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc:** [http://localhost:8000/redoc](http://localhost:8000/redoc)

### Chạy Kiểm Thử Tự Động
Toàn bộ test suite chạy trên SQLite in-memory (`sqlite:///:memory:`), không ảnh hưởng tới file `gym.db`:
```bash
pytest tests/ -v
```

---

## 🏗️ Cấu Trúc Thư Mục Dự Án

```
gym-models/
├── app/
│   ├── models/            # Pure SQLAlchemy 2.0 ORM Entities (Base, Mapped, mapped_column)
│   │   ├── base.py        # DeclarativeBase với MappedAsDataclass
│   │   ├── user.py
│   │   ├── membership_plan.py
│   │   ├── member.py
│   │   ├── gym_class.py
│   │   ├── class_slot.py
│   │   ├── booking.py
│   │   ├── invoice.py
│   │   ├── payment.py
│   │   └── attendance.py
│   ├── schemas/           # Pydantic V2 Request & Response DTOs
│   │   ├── user.py
│   │   ├── membership_plan.py
│   │   ├── member.py
│   │   ├── gym_class.py
│   │   ├── class_slot.py
│   │   ├── booking.py
│   │   ├── invoice.py
│   │   ├── payment.py
│   │   └── attendance.py
│   ├── database/          # SQLite Connection Engine, Session & Seeder
│   │   ├── session.py     # engine, get_session, create_db_and_tables
│   │   └── seed.py        # Dữ liệu mẫu & hàm seed_database
│   ├── routers/           # FastAPI APIRouters (CRUD & Domain Logic với SQLAlchemy)
│   │   ├── users.py
│   │   ├── membership_plans.py
│   │   ├── members.py
│   │   ├── gym_classes.py
│   │   ├── class_slots.py
│   │   ├── bookings.py
│   │   ├── invoices.py
│   │   ├── payments.py
│   │   └── attendance.py
│   └── main.py            # FastAPI Application Assembly & Lifespan DB init
├── tests/                 # Automated Unit & E2E Integration Test Suites
│   ├── conftest.py        # In-memory SQLite fixtures & session override
│   ├── test_models.py
│   ├── test_schemas.py
│   ├── test_database.py
│   ├── test_routers_logic.py
│   ├── test_main_app.py
│   └── test_monolith_api.py
├── run.py                 # Application Launcher Script
├── seed.py                # Standalone CLI Database Seeder
├── pytest.ini             # Test Configuration
└── README.md
```

---

## 📦 Danh Sách Domain Modules & API Routes

| Module | Route Prefix | Tags | Chức Năng Chính |
|---|---|---|---|
| `users` | `/users` | `Users` | Quản lý tài khoản (Admin, Trainer, Member) |
| `membership_plans` | `/membership_plans` | `Membership Plans` | Quản lý gói tập (giá, thời hạn ngày) |
| `members` | `/members` | `Members` | Quản lý hội viên (kiểm tra `user_id` và `plan_id`) |
| `gym_classes` | `/gym_classes` | `Gym Classes` | Quản lý lớp tập (Yoga, Boxing, HIIT...) |
| `class_slots` | `/class_slots` | `Class Slots` | Khung giờ tập và giới hạn sức chứa (capacity) |
| `bookings` | `/bookings` | `Bookings` | Đặt chỗ lớp học & tự động đưa vào Waitlist khi đầy |
| `invoices` | `/invoices` | `Invoices` | Hóa đơn thanh toán gói tập |
| `payments` | `/payments` | `Payments` | Thanh toán và tự động cập nhật trạng thái hóa đơn |
| `attendance` | `/attendance` | `Attendance` | Điểm danh ra/vào phòng tập |

---

## ⚡ Nghiệp Vụ Tích Hợp với SQLAlchemy & SQLite

1. **Session Lifecycle:** Mọi router endpoint đều inject `session: Session = Depends(get_session)` với cơ chế quản lý giao dịch an toàn.
2. **Member Validation:** Khi tạo Member (`POST /members/create_member`), router kiểm tra sự tồn tại của `user_id` và `membership_plan_id` trong SQLite qua `session.get()`, trả về 400 nếu không hợp lệ.
3. **Booking & Slot Capacity:** Khi tạo Booking (`POST /bookings/create_booking`), router kiểm tra Member có đang active và Class Slot có bị hủy (`is_cancelled`) hay không. Nếu slot còn chỗ (`current_bookings < max_capacity`), xác nhận booking (`confirmed`) và tăng `current_bookings`. Nếu slot đã đầy, tự động chuyển sang `waitlisted` kèm vị trí hàng đợi dựa trên số lượng booking đang chờ trong cơ sở dữ liệu.
4. **Payment & Invoice Settlement:** Khi tạo Payment (`POST /payments/create_payment`), router kiểm tra Invoice tồn tại và chưa thanh toán đầy đủ. Sau khi ghi nhận payment, cập nhật `amount_paid` và tự động chuyển trạng thái Invoice sang `paid` khi hoàn tất.
