import { useAuth } from '../context/AuthContext'

export default function Navbar({ onMenuToggle }) {
  const { user, isAdmin, logout } = useAuth()

  return (
    <nav className="app-navbar">
      <div className="app-navbar-brand">
        <button className="mobile-menu-button" type="button" onClick={onMenuToggle} aria-label="Mở menu">
          <i className="bi bi-list"></i>
        </button>
        <span className="brand-mark">
          <img src="/logo.svg" alt="SOA Gym Center" className="brand-logo" />
        </span>
        <span>SOA Gym Center</span>
      </div>

      <div className="app-navbar-meta">
        <span
          className={`admin-avatar ${isAdmin ? 'is-admin' : 'is-member'}`}
          title={user?.email}
        >
          {isAdmin ? 'A' : 'M'}
        </span>

        <div className="d-flex flex-column text-start ms-1 d-none d-md-block" style={{ lineHeight: 1.2 }}>
          <span className="fw-semibold small text-dark">
            {isAdmin ? 'Quản trị viên' : 'Hội viên'}
          </span>
          <span className="text-muted" style={{ fontSize: '0.75rem' }}>
            {user?.email}
          </span>
        </div>

        <button
          type="button"
          className="btn btn-outline-danger btn-sm ms-3 d-flex align-items-center py-1 px-2 rounded-2"
          onClick={logout}
          title="Đăng xuất"
        >
          <i className="bi bi-box-arrow-right me-1"></i>
          <span className="d-none d-sm-inline">Đăng xuất</span>
        </button>
      </div>
    </nav>
  )
}
