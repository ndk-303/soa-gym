# SOA Gym Management — Giữa Kỳ (FastAPI + SQLite + SQLAlchemy)

Cấu trúc chuẩn theo bài mẫu **`Nhom2_Book`**:
- `database.py`: Khởi tạo SQLite engine (`sqlite:///./gym.db`), `SessionLocal`, `Base = declarative_base()`.
- `models.py`: Khai báo 9 bảng CSDL SQLAlchemy ORM kế thừa từ `Base`.
- `main.py`: Khởi tạo bảng CSDL, cấu hình CORS Middleware (sẵn sàng kết nối Frontend), tiêm phụ thuộc `get_db()`, và đầy đủ CRUD cho cả 9 Models.

---

## 1. Cấu Trúc Thư Mục Backend

```
soa-gym-gk/
└── gym-models/
    ├── database.py         # Kết nối CSDL SQLite (sqlite:///./gym.db) & Base
    ├── models.py           # Định nghĩa 9 bảng CSDL (SQLAlchemy ORM)
    ├── main.py             # Ứng dụng trung tâm FastAPI xử lý CRUD cho cả 9 Models
    └── README.md           # Hướng dẫn
```

---

## 2. Hướng Dẫn Khởi Chạy

```bash
cd soa-gym-gk/gym-models
uvicorn main:app --reload --port 8000
```
👉 Truy cập Swagger UI kiểm tra 9 Models và test API tại: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
