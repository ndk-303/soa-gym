# SOA Gym Management — Kiến Trúc Microservices (FastAPI + SQLite + API Gateway)

Hệ thống quản lý phòng tập Gym theo kiến trúc **Microservices (SOA)** bao gồm **6 services độc lập** và **1 API Gateway tập trung**.

---

## 1. Cấu Trúc Thư Mục Backend

```text
gym-models/
├── api-gateway/                      # [PORT 8000] Entry Point tập trung, Reverse Proxy, CORS, Health Check
│   ├── config.py                     # Danh sách URL và Port của các service
│   ├── main.py                       # HTTPX Connection Pooling & Dynamic Routing
│   └── test_gateway.py               # Unit test cho Gateway
├── services/
│   ├── user-service/                 # [PORT 8001] Quản lý User (user.db)
│   ├── membership-service/           # [PORT 8002] Quản lý Member, MembershipPlan (membership.db)
│   ├── class-service/                # [PORT 8003] Quản lý GymClass, ClassSlot (class.db)
│   ├── booking-service/              # [PORT 8004] Quản lý Booking (booking.db)
│   ├── billing-service/              # [PORT 8005] Quản lý Invoice, Payment (billing.db)
│   └── attendance-service/           # [PORT 8006] Quản lý AttendanceRecord (attendance.db)
├── run_all.py                        # Script khởi chạy đồng thời 7 tiến trình
├── run_all.bat                       # Script 1-click khởi chạy cho Windows
├── test_e2e_system.py                # Bộ test tích hợp toàn diện End-to-End
└── requirements.txt                  # Thư viện phụ thuộc
```

---

## 2. Danh Mục Service & Port

| Module / Service | Cổng (Port) | Database File | Models đảm nhiệm |
| :--- | :--- | :--- | :--- |
| **API Gateway** | **8000** | *(None)* | Reverse Proxy, Swagger UI tổng, Health Check |
| **User Service** | **8001** | `user.db` | `User` |
| **Membership Service** | **8002** | `membership.db` | `Member`, `MembershipPlan` |
| **Class Service** | **8003** | `class.db` | `GymClass`, `ClassSlot` |
| **Booking Service** | **8004** | `booking.db` | `Booking` |
| **Billing Service** | **8005** | `billing.db` | `Invoice`, `Payment` |
| **Attendance Service** | **8006** | `attendance.db` | `AttendanceRecord` |

---

## 3. Hướng Dẫn Khởi Chạy

### Cách 1: Sử dụng Python Runner (Khuyên dùng)
```bash
cd gym-models
python run_all.py
```

### Cách 2: Nhấp đúp chuột vào file `run_all.bat` (Windows)
File `run_all.bat` sẽ tự động kích hoạt môi trường và khởi chạy toàn bộ 6 microservices cùng API Gateway.

- 👉 **Swagger UI tập trung**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- 👉 **Kiểm tra trạng thái hệ thống**: [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)
- 👉 **Tắt hệ thống**: Bấm `Ctrl + C` trên cửa sổ dòng lệnh để tắt đồng thời tất cả các tiến trình con an toàn.

---

## 4. Chạy Kiểm Thử Tích Hợp (E2E Tests)
```bash
cd gym-models
pytest test_e2e_system.py -v
```
