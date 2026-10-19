# Member Portal Redesign & User Experience Specification

- **Date:** 2026-10-19
- **Author:** Antigravity (DeepMind Agentic Assistant) & User
- **Status:** Approved / Ready for Implementation Planning
- **Topic:** Dedicated Member Portal (Dashboard with Check-in Calendar, Plans, Classes, Transactions)

---

## 1. Overview & Problem Statement

Currently, the SOA Gym system serves an admin-centric interface consisting of 10 tabular CRUD pages. When regular gym members (`role: member` or `role: user`) log in, they either see admin CRUD tables or restricted views. 

This project designs and implements a dedicated, high-density, card-based **Member Portal** tailored specifically for gym members, isolating member features from admin management.

### Key Goals:
1. **Personalized Dashboard:** Display current membership plan details, days attended, remaining days, expiration date, and a visual 1-month check-in calendar.
2. **Membership Plans Catalog:** Modern card-based pricing grid with self-service registration.
3. **Gym Classes & Bookings:** Modern card-based class exploration paired with a "My Enrolled Classes" management view.
4. **Transaction History:** Clean ledger of personal invoices and payment history.
5. **Role-Based Isolation:** Clean separation between Admin Portal (CRUD management) and Member Portal (self-service member tools).

---

## 2. Architecture & Role-Based Routing

### 2.1 Navigation & Shell Isolation
In `frontend/src/App.jsx` and `frontend/src/components/Sidebar.jsx`:
- When `user.role === 'admin'`: Render the full Admin Portal (10 management modules).
- When `user.role === 'member'` or `'user'`: Render the streamlined **Member Portal** featuring only 4 dedicated menu items:
  1. **Dashboard (`dashboard`):** Overview, personal stats, and 1-month check-in calendar.
  2. **Gói tập (`plans`):** Card-based plans catalog with registration action.
  3. **Lớp học (`classes`):** Card-based class exploration + "Lớp đã đăng ký" tab.
  4. **Lịch sử giao dịch (`history`):** Personal invoices and receipts.

### 2.2 Component Directory Structure
All member portal components are housed in `frontend/src/pages/member/`:
```
frontend/src/pages/member/
├── MemberDashboard.jsx       # Personal overview and metrics
├── AttendanceCalendar.jsx    # Interactive 1-month check-in calendar grid
├── MemberPlansPage.jsx       # Card-based plans catalog
├── MemberClassesPage.jsx     # Class cards & My Bookings tab
└── MemberHistoryPage.jsx     # Personal invoice & transaction history
```

### 2.3 Member Identity Resolution
When a user logs in, their `user.id` is matched against `membersApi.getAll()` or `membersApi.getDetailed()`:
- If a matching `Member` record exists: Use `member.id`, `member.membership_plan_id`, `member.status`.
- If no record exists yet (new account): Automatically initialize a default Member record via `membersApi.create` so the member portal functions seamlessly without administrative blockers.

---

## 3. Detailed Component Specifications

### 3.1 Member Dashboard (`MemberDashboard.jsx`)
#### A. Personal KPI Cards (4 Metrics)
1. **Gói tập hiện tại (Current Plan):** 
   - Displays plan name (e.g. *Gói 3 Tháng VIP* or *Chưa đăng ký gói*).
   - Status badge: Active (`is-success`) / Expired (`is-danger`).
   - Price tag formatted in VND (`formatVnd`).
2. **Số ngày đã tập (Days Attended):** 
   - Total number of unique check-in days from `attendance_records` where `member_id === currentMember.id`.
   - Subtitle: *X lượt điểm danh tháng này*.
3. **Số ngày còn lại (Remaining Days):** 
   - Calculated from plan `duration_days` and activation date.
   - Highlights in blue; switches to warning amber if remaining days < 7.
4. **Ngày hết hạn gói tập (Expiration Date):** 
   - Precise date formatted as `dd/MM/yyyy`.

#### B. Full 1-Month Attendance Calendar (`AttendanceCalendar.jsx`)
- **Structure:** 
  - Standard 7-column grid (**T2, T3, T4, T5, T6, T7, CN**).
  - Header with month/year title and `< Tháng trước` / `Tháng sau >` navigation buttons.
  - Grid renders all 28-31 days of the selected month with leading empty slots matching the starting day of the week.
- **Visual Coding:**
  - **Check-in Days:** Highlighted with ice blue background (`#eff6ff`), border (`#93c5fd`), and green check icon (`bi-check-circle-fill`). Hovering displays a tooltip with check-in timestamp (e.g. `08:15 - Đã check-in`).
  - **Today:** Outlined with high-emphasis primary border (`#2563eb`).
  - **Rest Days:** Standard clean surface.
- **Legend:**
  - 🟢 *Ngày đã đi tập (Check-in)*
  - 🔵 *Hôm nay*
  - ⚪ *Ngày nghỉ*

---

### 3.2 Membership Plans Page (`MemberPlansPage.jsx`)
- **Format:** Responsive grid of modern pricing cards (`kpi-grid` / 3 columns).
- **Card Contents:**
  - Plan name (e.g., *Gói 1 Tháng Cơ Bản*, *Gói 3 Tháng VIP*, *Gói 1 Năm Platinum*).
  - Price prominently formatted: e.g., `1.350.000 ₫`.
  - Duration badge: e.g., `90 ngày`.
  - Feature list: checkmark bullet points for amenities (Check-in không giới hạn, Tủ đồ thông minh, HLV hướng dẫn, v.v.).
- **Actions:**
  - If current plan: Displays prominent badge `Gói hiện tại của bạn`.
  - If another plan: Blue primary button `Đăng ký ngay`.
  - **Testing Workflow:** Clicking `Đăng ký ngay` opens a confirmation modal. On confirm:
    1. Updates member's plan via `membersApi.update(memberId, { membership_plan_id: planId })`.
    2. Automatically creates a paid invoice in `invoicesApi.create({ member_id: memberId, amount: plan.price, status: 'paid' })`.
    3. Triggers immediate dashboard and transaction synchronization.

---

### 3.3 Gym Classes & Bookings Page (`MemberClassesPage.jsx`)
Features a 2-tab navigation header:
- **Tab 1: Khám phá lớp học (Available Classes):**
  - Grid of class cards (Yoga, Boxing, HIIT, Pilates, etc.).
  - Card details: Class title, category tag, trainer badge, active status.
  - Upcoming slots list: shows date/time, capacity bar (e.g., `14/20 chỗ`), and button `Đặt chỗ`.
  - Clicking `Đặt chỗ` invokes `bookingsApi.create({ member_id: memberId, slot_id: slot.id, status: 'confirmed' })`.
- **Tab 2: Lớp học của tôi (My Enrolled Classes):**
  - Displays list of booked slots for `currentMember.id`.
  - Shows class name, start time, booking status badge (`Đã xác nhận` / `Hàng chờ`).
  - Action button: `Hủy đặt chỗ` (calls `bookingsApi.delete(bookingId)` with confirmation).

---

### 3.4 Transaction History Page (`MemberHistoryPage.jsx`)
- Simple, high-density ledger displaying the member's personal billing records.
- Filtered to only display records where `invoice.member_id === currentMember.id`.
- Columns:
  1. **Mã hóa đơn:** `#HĐ-XXX` (`tabular-nums`).
  2. **Nội dung:** E.g., *Đăng ký Gói 3 Tháng VIP*.
  3. **Số tiền:** Right-aligned VND currency formatted via `formatVnd`.
  4. **Trạng thái:** `StatusBadge` (Paid / Pending / Cancelled).
  5. **Ngày giao dịch:** Formatted datetime.

---

## 4. Integration & Data Flow

```
[Member Logs In]
       │
       ▼
[Resolve Member ID via membersApi]
       │
       ├──► MemberDashboard:
       │      ├─ membersApi (Plan ID)
       │      ├─ plansApi (Duration & Name)
       │      └─ attendanceApi (Check-in dates for calendar & attendance count)
       │
       ├──► MemberPlansPage:
       │      ├─ plansApi.getAll()
       │      └─ On register: membersApi.update() + invoicesApi.create(status='paid')
       │
       ├──► MemberClassesPage:
       │      ├─ classesApi.getDetailed() + slotsApi.getAll()
       │      └─ bookingsApi (Filtered by member_id; create/delete bookings)
       │
       └──► MemberHistoryPage:
              └─ invoicesApi.getAll() (Filtered by member_id)
```

---

## 5. Error Handling & Edge Cases

1. **Member Has No Active Plan:**
   - Dashboard displays "Chưa đăng ký gói tập" with a direct button leading to `plans`.
   - Remaining days shows "—" and expiration shows "Chưa kích hoạt".
2. **Member Has No Attendance Records:**
   - Calendar renders smoothly with 0 highlighted days.
   - Empty banner: *"Chưa có lượt tập nào trong tháng này. Hãy đến phòng gym để bắt đầu!"*
3. **Slot Fully Booked:**
   - Slot button switches to `Hết chỗ` (disabled) or `Vào hàng chờ` (waitlist status).
4. **Backend Service Latency / Failure:**
   - Fallback `LoadingSpinner` during async resolution.
   - Non-blocking alerts for any disconnected microservice.

---

## 6. Verification & Testing Checklist

- [ ] Log in with a `member` user account (e.g. `member.an@gym.com`).
- [ ] Verify Member Portal navigation displays only 4 items (Dashboard, Gói tập, Lớp học, Lịch sử).
- [ ] Verify Member Dashboard displays correct current plan, days attended, remaining days, and expiration date.
- [ ] Verify Attendance Calendar displays current month grid with check-ins highlighted in blue/green.
- [ ] Verify Month switcher navigates between previous and next months.
- [ ] In "Gói tập", register for a new plan and verify instant activation and sync to Dashboard.
- [ ] In "Lớp học", explore class cards, book a slot, and verify it appears in "Lớp học của tôi".
- [ ] In "Lớp học của tôi", cancel a booking and verify cancellation.
- [ ] In "Lịch sử giao dịch", verify invoices list displays user's transactions with correct VND amounts and status badges.
- [ ] Run `npm run build` and `oxlint` to guarantee zero build errors and zero linter warnings.
