# Member Portal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dedicated, modern, card-based Member Portal for gym members with a personalized Dashboard, 1-Month Check-in Calendar, Plan Registration Cards, Class Exploration & Booking management, and Transaction History.

**Architecture:** Separate member views from admin views in `App.jsx` based on `user.role`. Create a dedicated member suite in `src/pages/member/` consuming existing backend microservices via `api.js` while strictly respecting tokens defined in `DESIGN.md`.

**Tech Stack:** React 19, Vite 8, Bootstrap 5.3 (grid/utilities), Bootstrap Icons, Axios, Native CSS design tokens.

**Spec:** `docs/superpowers/specs/2026-10-19-member-portal-design.md`

## Global Constraints

- **Design Tokens:** Strict adherence to `DESIGN.md` (`--radius-sm: 6px`, `--radius-md: 10px`, `--color-primary: #2563eb`).
- **Typography:** Body 14px, numbers right-aligned with `tabular-nums`, no micro-text (<11.5px), no kicker/eyebrow labels.
- **Microservices Compatibility:** Works with existing `membersApi`, `plansApi`, `classesApi`, `slotsApi`, `bookingsApi`, `attendanceApi`, and `invoicesApi`.
- **Zero Lint / Build Errors:** Code must compile cleanly via `npm run build` and pass `oxlint`.

## Review Focus

1. **New User Without Member Profile:** Auto-provision a default Member record if `user.id` is not yet in `members` table.
2. **Member With No Active Plan:** Graceful empty state on Dashboard with a direct call-to-action button to the Plans catalog.
3. **Month Boundaries & Leap Years in Calendar:** Correct calculation of days and start-of-week offsets across all 12 months.
4. **Duplicate Booking Prevention:** Prevent double-booking the same class slot if already confirmed in member bookings.
5. **Instant Synchronization:** Plan registration in testing mode immediately updates member plan and generates a paid invoice.

---

### Task 1: Member Identity Resolution & Portal Shell Routing

**Files:**
- Create: `frontend/src/utils/memberSession.js`
- Modify: `frontend/src/components/Sidebar.jsx`
- Modify: `frontend/src/App.jsx`

**Interfaces:**
- Produces: `getCurrentMember(user): Promise<Member>` helper function
- Consumes: `useAuth()`, `membersApi.getAll()`, `membersApi.create()`

- [ ] **Step 1: Create `memberSession.js` helper to resolve and ensure member profile**

```javascript
// frontend/src/utils/memberSession.js
import { membersApi } from '../services/api'

export async function resolveCurrentMember(user) {
  if (!user) return null
  const res = await membersApi.getAll()
  const members = res.data || []
  let member = members.find((m) => String(m.user_id) === String(user.id))
  if (!member) {
    // Auto-provision member record for user in test environment
    const createRes = await membersApi.create({
      user_id: user.id,
      full_name: user.email.split('@')[0],
      email: user.email,
      status: 'active',
      membership_plan_id: null,
    })
    member = createRes.data
  }
  return member
}
```

- [ ] **Step 2: Update `Sidebar.jsx` to render member navigation when `!isAdmin`**

When `!isAdmin`, `Sidebar` renders 4 items:
1. `dashboard`: "Tổng quan", icon `bi-grid-1x2`
2. `plans`: "Gói tập", icon `bi-card-list`
3. `classes`: "Lớp học", icon `bi-calendar-event`
4. `history`: "Lịch sử giao dịch", icon `bi-receipt`

- [ ] **Step 3: Update `App.jsx` to route member tabs to member components**

Update `App.jsx` tab rendering logic to route `dashboard`, `plans`, `classes`, and `history` to member components when `!isAdmin`.

- [ ] **Step 4: Verify in browser / build**

Run: `npm run build` in `frontend` directory.
Expected: Build succeeds with 0 errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/utils/memberSession.js frontend/src/components/Sidebar.jsx frontend/src/App.jsx
git commit -m "feat(member): add member session resolution and portal routing"
```

---

### Task 2: Interactive 1-Month Attendance Calendar Component

**Files:**
- Create: `frontend/src/pages/member/AttendanceCalendar.jsx`
- Create: `frontend/src/styles/calendar.css`
- Modify: `frontend/src/main.jsx` (import `calendar.css`)

**Interfaces:**
- Produces: `<AttendanceCalendar checkInRecords={records} />`
- Props: `checkInRecords: Array<{ check_in_time: string, status: string }>`

- [ ] **Step 1: Create `calendar.css` with token-based styles**

Implement responsive 7-column calendar grid, rounded 6px date cells, ice-blue highlight (`#eff6ff` / `#93c5fd`) for check-in days, and legend.

- [ ] **Step 2: Implement `AttendanceCalendar.jsx`**

- Month state: `currentDate = new Date()` with Prev/Next month controls.
- Compute days in month: `new Date(year, month + 1, 0).getDate()`.
- Compute starting day of week (Monday as 0, Sunday as 6).
- Filter `checkInRecords` matching day in month.
- Display green badge/icon for check-in days with tooltip `HH:mm - Đã check-in`.

- [ ] **Step 3: Verify build and styling**

Run: `npm run build` in `frontend`.
Expected: Build succeeds with 0 errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/member/AttendanceCalendar.jsx frontend/src/styles/calendar.css frontend/src/main.jsx
git commit -m "feat(member): add 1-month attendance calendar component"
```

---

### Task 3: Member Dashboard View

**Files:**
- Create: `frontend/src/pages/member/MemberDashboard.jsx`
- Modify: `frontend/src/App.jsx`

**Interfaces:**
- Consumes: `resolveCurrentMember()`, `plansApi`, `attendanceApi`, `<AttendanceCalendar />`
- Produces: `<MemberDashboard onTabChange={fn} />`

- [ ] **Step 1: Implement data fetching and metrics calculation in `MemberDashboard.jsx`**

- Load `currentMember`, active plan from `plansApi.getAll()`, and attendance logs from `attendanceApi.getAll()`.
- Calculate:
  - Plan name & status badge.
  - Days attended (count of check-ins).
  - Remaining days (from plan `duration_days` and creation date).
  - Expiration date.
- Render 4 KPI metric cards in responsive grid.
- Render `<AttendanceCalendar />` with member check-in history.
- Empty plan banner if member has no plan: "Bạn chưa đăng ký gói tập nào" + button "Xem gói tập ngay".

- [ ] **Step 2: Connect `MemberDashboard` in `App.jsx`**

Wire `MemberDashboard` to `activeTab === 'dashboard'` when `!isAdmin`.

- [ ] **Step 3: Verify build**

Run: `npm run build` in `frontend`.
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/member/MemberDashboard.jsx frontend/src/App.jsx
git commit -m "feat(member): implement member dashboard with personal metrics"
```

---

### Task 4: Card-Based Membership Plans Catalog

**Files:**
- Create: `frontend/src/pages/member/MemberPlansPage.jsx`
- Modify: `frontend/src/App.jsx`

**Interfaces:**
- Consumes: `plansApi.getAll()`, `membersApi.update()`, `invoicesApi.create()`
- Produces: `<MemberPlansPage onPlanRegistered={fn} />`

- [ ] **Step 1: Implement `MemberPlansPage.jsx`**

- Fetch all active plans from `plansApi.getAll()`.
- Display plans in responsive 3-column card grid.
- Each card shows: Name, formatted price in VND (`formatVnd`), duration in days, feature bullets list.
- Action:
  - If member currently has this plan: display badge `Gói hiện tại của bạn`.
  - Otherwise: button `Đăng ký ngay`.
- Confirmation modal on click:
  - Updates member's `membership_plan_id` via `membersApi.update`.
  - Creates a paid invoice via `invoicesApi.create({ member_id, amount, status: 'paid' })`.
  - Shows success notification and refreshes state.

- [ ] **Step 2: Connect `MemberPlansPage` in `App.jsx`**

Wire `MemberPlansPage` to `activeTab === 'plans'` when `!isAdmin`.

- [ ] **Step 3: Verify build**

Run: `npm run build` in `frontend`.
Expected: Build succeeds with 0 errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/member/MemberPlansPage.jsx frontend/src/App.jsx
git commit -m "feat(member): implement card-based plans catalog and registration"
```

---

### Task 5: Card-Based Gym Classes & Bookings Management

**Files:**
- Create: `frontend/src/pages/member/MemberClassesPage.jsx`
- Modify: `frontend/src/App.jsx`

**Interfaces:**
- Consumes: `classesApi.getDetailed()`, `slotsApi.getAll()`, `bookingsApi`
- Produces: `<MemberClassesPage />`

- [ ] **Step 1: Implement `MemberClassesPage.jsx` with 2-tab view**

- Tab 1: **Khám phá lớp học**
  - Renders classes as cards: Class name, category badge, trainer name.
  - Lists available slots for each class with time and capacity meter (`current_bookings / max_capacity`).
  - Button `Đặt chỗ` -> invokes `bookingsApi.create({ member_id, slot_id, status: 'confirmed' })`.
- Tab 2: **Lớp học của tôi**
  - Displays all bookings where `booking.member_id === currentMember.id`.
  - Shows booked class name, slot start time, status badge.
  - Button `Hủy đặt chỗ` -> calls `bookingsApi.delete(bookingId)`.

- [ ] **Step 2: Connect `MemberClassesPage` in `App.jsx`**

Wire `MemberClassesPage` to `activeTab === 'classes'` when `!isAdmin`.

- [ ] **Step 3: Verify build**

Run: `npm run build` in `frontend`.
Expected: Build succeeds with 0 errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/member/MemberClassesPage.jsx frontend/src/App.jsx
git commit -m "feat(member): implement class cards catalog and bookings management"
```

---

### Task 6: Personal Transaction History Page

**Files:**
- Create: `frontend/src/pages/member/MemberHistoryPage.jsx`
- Modify: `frontend/src/App.jsx`

**Interfaces:**
- Consumes: `invoicesApi.getAll()`, `formatVnd`, `StatusBadge`
- Produces: `<MemberHistoryPage />`

- [ ] **Step 1: Implement `MemberHistoryPage.jsx`**

- Fetch all invoices from `invoicesApi.getAll()`.
- Filter strictly by `invoice.member_id === currentMember.id`.
- Render clean table:
  - Column 1: Mã hóa đơn (`#HĐ-XXX`)
  - Column 2: Nội dung thanh toán
  - Column 3: Số tiền (`tabular-nums` right-aligned with `formatVnd`)
  - Column 4: Trạng thái (`StatusBadge`)
  - Column 5: Ngày giao dịch
- Empty state: "Bạn chưa có giao dịch nào".

- [ ] **Step 2: Connect `MemberHistoryPage` in `App.jsx`**

Wire `MemberHistoryPage` to `activeTab === 'history'` when `!isAdmin`.

- [ ] **Step 3: Verify build**

Run: `npm run build` in `frontend`.
Expected: Build succeeds with 0 errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/member/MemberHistoryPage.jsx frontend/src/App.jsx
git commit -m "feat(member): implement personal transaction history page"
```

---

### Task 7: Build, Lint & Design Detector Verification

**Files:**
- Audit targets: All files in `frontend/src/pages/member/` and `frontend/src/styles/`

- [ ] **Step 1: Run linter**

Run: `npm run lint` in `frontend`.
Expected: 0 errors.

- [ ] **Step 2: Run production build**

Run: `npm run build` in `frontend`.
Expected: 0 errors, successful bundle output.

- [ ] **Step 3: Run Impeccable Mechanical Detector**

Run: `impeccable detect --json frontend/src`
Expected: 0 antipatterns found (`[]`).

- [ ] **Step 4: Commit and finalize**

```bash
git commit --allow-empty -m "chore(member): finalize member portal verification"
```
