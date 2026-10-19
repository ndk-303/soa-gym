import { useAuth } from '../context/AuthContext'

export default function Sidebar({ activeTab, onTabChange, isOpen }) {
  const { isAdmin } = useAuth()

  const allMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'bi-grid-1x2', section: 'Tổng quan' },
    { id: 'users', label: 'Tài khoản', icon: 'bi-person', section: 'Hội viên', adminOnly: true },
    { id: 'members', label: 'Hội viên', icon: 'bi-people', section: 'Hội viên', adminOnly: true },
    { id: 'plans', label: 'Gói tập', icon: 'bi-card-list', section: 'Hội viên', adminOnly: true },
    { id: 'classes', label: 'Lớp học', icon: 'bi-calendar-event', section: 'Vận hành' },
    { id: 'slots', label: 'Ca tập', icon: 'bi-clock', section: 'Vận hành' },
    { id: 'bookings', label: 'Đặt chỗ', icon: 'bi-bookmark-check', section: 'Vận hành' },
    { id: 'attendance', label: 'Điểm danh', icon: 'bi-qr-code-scan', section: 'Vận hành' },
    { id: 'invoices', label: 'Hóa đơn', icon: 'bi-receipt', section: 'Tài chính' },
    { id: 'payments', label: 'Thanh toán', icon: 'bi-credit-card', section: 'Tài chính', adminOnly: true },
  ]

  // Filter based on role
  const menuItems = allMenuItems.filter((item) => {
    if (item.adminOnly && !isAdmin) {
      return false
    }
    return true
  })

  const sections = ['Tổng quan', 'Hội viên', 'Vận hành', 'Tài chính'].filter((sec) =>
    menuItems.some((item) => item.section === sec)
  )

  return (
    <aside className={`app-sidebar ${isOpen ? 'is-open' : ''}`}>
      <div className="sidebar-caption">
        {isAdmin ? 'Quản trị hệ thống' : 'Không gian hội viên'}
      </div>

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
        <span className="sidebar-footer-icon">
          <i className={`bi ${isAdmin ? 'bi-shield-check text-primary' : 'bi-person-badge text-success'}`}></i>
        </span>
        <div>
          <div className="sidebar-footer-title">
            {isAdmin ? 'Quyền Quản trị viên' : 'Quyền Hội viên'}
          </div>
          <div className="sidebar-footer-text">
            {isAdmin ? 'Đầy đủ quyền CRUD' : 'Chế độ xem cá nhân'}
          </div>
        </div>
      </div>
    </aside>
  )
}
