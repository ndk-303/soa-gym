# SOA Gym Center - Frontend (React + Bootstrap)

Giao diện quản lý phòng tập Gym - Dự án kiến trúc hướng dịch vụ (SOA - Giữa kỳ).

## 🚀 Công nghệ sử dụng
- **React 19**
- **Bootstrap 5.3 & Bootstrap Icons**
- **Axios** (API Client kết nối với FastAPI Backend)
- **Vite** (Build tool siêu nhanh)

## 📁 Cấu trúc thư mục Khung xương (Skeleton)
```
frontend/
├── public/
├── src/
│   ├── components/         # Các component dùng chung
│   │   ├── Navbar.jsx      # Thanh điều hướng trên cùng
│   │   ├── Sidebar.jsx     # Menu 9 module + Dashboard
│   │   ├── StatusBadge.jsx # Badge hiển thị trạng thái động
│   │   └── LoadingSpinner.jsx
│   ├── pages/              # Màn hình chức năng cho từng Entity
│   │   ├── Dashboard.jsx   # Tổng quan số liệu thống kê
│   │   ├── UsersPage.jsx   # Quản lý tài khoản
│   │   ├── MembersPage.jsx # Quản lý hội viên
│   │   ├── PlansPage.jsx   # Quản lý gói tập
│   │   ├── ClassesPage.jsx # Quản lý lớp học
│   │   ├── SlotsPage.jsx   # Quản lý ca tập
│   │   ├── BookingsPage.jsx# Quản lý đặt chỗ
│   │   ├── AttendancePage.jsx # Quản lý điểm danh
│   │   ├── InvoicesPage.jsx# Quản lý hóa đơn
│   │   └── PaymentsPage.jsx# Quản lý thanh toán
│   ├── services/
│   │   └── api.js          # API Client kết nối http://127.0.0.1:8000
│   ├── App.jsx             # Component chính điều phối tab & layout
│   ├── index.css           # Custom styling
│   └── main.jsx            # Entry point với Bootstrap CSS
├── index.html
├── package.json
└── vite.config.js
```

## 🛠️ Hướng dẫn khởi chạy

### 1. Khởi động Backend trước:
```bash
cd soa-gym-gk/gym-models
uvicorn main:app --reload --port 8000
```
Backend API docs: http://127.0.0.1:8000/docs

### 2. Khởi động Frontend:
```bash
cd soa-gym-gk/frontend
npm run dev
```
Truy cập: `http://localhost:5173`
