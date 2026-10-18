export default function Sidebar({ activeTab, onTabChange }) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'bi-speedometer2', section: 'Overview' },
    { id: 'users', label: 'Tài khoản (Users)', icon: 'bi-people-fill', section: 'Quản lý Hội viên' },
    { id: 'members', label: 'Hội viên (Members)', icon: 'bi-person-badge', section: 'Quản lý Hội viên' },
    { id: 'plans', label: 'Gói tập (Plans)', icon: 'bi-card-checklist', section: 'Quản lý Hội viên' },
    { id: 'classes', label: 'Lớp học (Classes)', icon: 'bi-calendar-event', section: 'Lớp học & Lịch tập' },
    { id: 'slots', label: 'Ca tập (Slots)', icon: 'bi-clock-history', section: 'Lớp học & Lịch tập' },
    { id: 'bookings', label: 'Đặt chỗ (Bookings)', icon: 'bi-bookmark-check', section: 'Lớp học & Lịch tập' },
    { id: 'attendance', label: 'Điểm danh (Attendance)', icon: 'bi-qr-code-scan', section: 'Lớp học & Lịch tập' },
    { id: 'invoices', label: 'Hóa đơn (Invoices)', icon: 'bi-receipt', section: 'Tài chính & Thu chi' },
    { id: 'payments', label: 'Thanh toán (Payments)', icon: 'bi-credit-card-2-front', section: 'Tài chính & Thu chi' },
  ]

  const sections = ['Overview', 'Quản lý Hội viên', 'Lớp học & Lịch tập', 'Tài chính & Thu chi']

  return (
    <div className="bg-white border-end h-100 p-3 shadow-sm d-flex flex-column" style={{ width: '280px', minWidth: '280px' }}>
      <div className="text-uppercase text-muted fw-bold small mb-2 px-2">Hệ thống Gym</div>

      <div className="overflow-auto flex-grow-1">
        {sections.map((section) => (
          <div key={section} className="mb-3">
            <div className="text-secondary small fw-semibold px-2 mb-1 text-uppercase" style={{ fontSize: '0.75rem' }}>
              {section}
            </div>
            <div className="list-group list-group-flush">
              {menuItems
                .filter((item) => item.section === section)
                .map((item) => {
                  const isActive = activeTab === item.id
                  return (
                    <button
                      key={item.id}
                      onClick={() => onTabChange(item.id)}
                      className={`list-group-item list-group-item-action border-0 rounded-2 py-2 px-3 d-flex align-items-center gap-2 mb-1 ${
                        isActive
                          ? 'active bg-primary text-white shadow-sm'
                          : 'text-dark hover-bg-light'
                      }`}
                      style={{ cursor: 'pointer', transition: 'all 0.15s ease' }}
                    >
                      <i className={`bi ${item.icon} fs-5 ${isActive ? 'text-white' : 'text-secondary'}`}></i>
                      <span className="fw-medium text-truncate">{item.label}</span>
                    </button>
                  )
                })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
