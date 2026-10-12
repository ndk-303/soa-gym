# Gym Management System — FastAPI Modular Monolith

Dự án Hệ Thống Quản Lý Phòng Tập (Gym Management System) được tổ chức theo kiến trúc **Modular Monolith** bằng **FastAPI** và **Pydantic V2**. Toàn bộ 9 domain modules được tích hợp vào một ứng dụng duy nhất chạy trên cổng `8000`.

---

## 🚀 Khởi Chạy Nhanh

### Cài Đặt Môi Trường
```bash
pip install fastapi uvicorn pydantic pytest httpx
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
```bash
pytest tests/ -v
```

---

## 🏗️ Cấu Trúc Thư Mục Dự Án

```
gym-models/
├── app/
│   ├── models/            # Pure Python Entity Classes (Domain Entities)
│   │   ├── user.py
│   │   ├── membership_plan.py
│   │   ├── member.py
│   │   ├── gym_class.py
│   │   ├── class_slot.py
│   │   ├── booking.py
│   │   ├── invoice.py
│   │   ├── payment.py
│   │   └── attendance.py
│   ├── schemas/           # Pydantic V2 Request & Validation Schemas
│   │   ├── user.py
│   │   ├── membership_plan.py
│   │   ├── member.py
│   │   ├── gym_class.py
│   │   ├── class_slot.py
│   │   ├── booking.py
│   │   ├── invoice.py
│   │   ├── payment.py
│   │   └── attendance.py
│   ├── database/          # Centralized In-Memory Datastore & Seed Data
│   │   └── db.py
│   ├── routers/           # FastAPI APIRouters (CRUD & Domain Logic)
│   │   ├── users.py
│   │   ├── membership_plan.py
│   │   ├── members.py
│   │   ├── gym_classes.py
│   │   ├── class_slots.py
│   │   ├── bookings.py
│   │   ├── invoices.py
│   │   ├── payments.py
│   │   └── attendance.py
│   └── main.py            # FastAPI Application Assembly
├── tests/                 # Automated Unit & E2E Integration Test Suites
│   ├── test_models.py
│   ├── test_schemas.py
│   ├── test_database.py
│   ├── test_routers_logic.py
│   ├── test_main_app.py
│   └── test_monolith_api.py
├── run.py                 # Application Launcher Script
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

## ⚡ Nghiệp Vụ Tích Hợp In-Memory

1. **Member Validation:** Khi tạo Member (`POST /members/create_member`), router kiểm tra trực tiếp sự tồn tại của `user_id` và `membership_plan_id` trong database chung, trả về 400 nếu không hợp lệ.
2. **Booking & Slot Capacity:** Khi tạo Booking (`POST /bookings/create_booking`), router kiểm tra Member có đang active và Class Slot có hợp lệ hay không. Nếu slot còn chỗ (`current_bookings < max_capacity`), xác nhận booking (`confirmed`) và tăng `current_bookings`. Nếu slot đã đầy, tự động chuyển sang `waitlisted` kèm vị trí hàng đợi.
3. **Payment & Invoice Settlement:** Khi tạo Payment (`POST /payments/create_payment`), router kiểm tra Invoice tồn tại và chưa thanh toán. Sau khi ghi nhận payment, cập nhật `amount_paid` và chuyển trạng thái Invoice sang `paid`.
