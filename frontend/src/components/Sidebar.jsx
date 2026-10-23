import { useAuth } from '../context/AuthContext'

export default function Sidebar({ activeTab, onTabChange, isOpen }) {
  const { isAdmin, isTrainer } = useAuth()

  const adminMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'bi-grid-1x2', section: 'Tổng quan' },
    { id: 'users', label: 'Tài khoản', icon: 'bi-person', section: 'Hội viên' },
    { id: 'members', label: 'Hội viên', icon: 'bi-people', section: 'Hội viên' },
    { id: 'plans', label: 'Gói tập', icon: 'bi-card-list', section: 'Hội viên' },
    { id: 'classes', label: 'Lớp học', icon: 'bi-calendar-event', section: 'Vận hành' },
    { id: 'slots', label: 'Ca tập', icon: 'bi-clock', section: 'Vận hành' },
    { id: 'bookings', label: 'Đặt chỗ', icon: 'bi-bookmark-check', section: 'Vận hành' },
    { id: 'attendance', label: 'Điểm danh', icon: 'bi-qr-code-scan', section: 'Vận hành' },
    { id: 'invoices', label: 'Hóa đơn', icon: 'bi-receipt', section: 'Tài chính' },
    { id: 'payments', label: 'Thanh toán', icon: 'bi-credit-card', section: 'Tài chính' },
  ]

  const trainerMenuItems = [
    { id: 'dashboard', label: 'Tổng quan', icon: 'bi-grid-1x2', section: 'HLV Portal' },
    { id: 'schedule', label: 'Lịch dạy & Ca tập', icon: 'bi-clock', section: 'Giảng dạy' },
    { id: 'classes', label: 'Lớp phụ trách', icon: 'bi-calendar-event', section: 'Giảng dạy' },
    { id: 'trainees', label: 'Học viên & Đặt chỗ', icon: 'bi-people', section: 'Học viên' },
    { id: 'attendance', label: 'Điểm danh ca tập', icon: 'bi-qr-code-scan', section: 'Học viên' },
  ]

  const memberMenuItems = [
    { id: 'dashboard', label: 'Tổng quan', icon: 'bi-grid-1x2', section: 'Cá nhân' },
    { id: 'plans', label: 'Gói tập', icon: 'bi-card-list', section: 'Dịch vụ' },
    { id: 'classes', label: 'Lớp học', icon: 'bi-calendar-event', section: 'Dịch vụ' },
    { id: 'history', label: 'Lịch sử giao dịch', icon: 'bi-receipt', section: 'Tài chính' },
  ]

  const menuItems = isAdmin ? adminMenuItems : isTrainer ? trainerMenuItems : memberMenuItems

  const sections = Array.from(new Set(menuItems.map((item) => item.section)))

  return (
    <aside className={`app-sidebar ${isOpen ? 'is-open' : ''}`}>
      <div className="sidebar-navigation">
        {sections.map((section) => (
          <div key={section} className="sidebar-group">
            <div className="sidebar-section-label">
              {section}
            </div>
            <div>
              {menuItems
                .filter((item) => item.section === section)
                .map((item) => {
                  const isActive = activeTab === item.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-current={isActive ? 'page' : undefined}
                      onClick={() => onTabChange(item.id)}
                      className={`sidebar-link ${isActive ? 'is-active' : ''}`}
                    >
                      <i className={`bi ${item.icon}`}></i>
                      <span>{item.label}</span>
                    </button>
                  )
                })}
            </div>
          </div>
        ))}
      </div>

      <div className="sidebar-footer">
        <div className="sidebar-status-tag">
          <span className="status-dot"></span>
          <span>SOA Gym v1.0</span>
        </div>
      </div>
    </aside>
  )
}
