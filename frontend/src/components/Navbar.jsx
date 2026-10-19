export default function Navbar({ onMenuToggle }) {
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
        <span className="status-dot"></span>
        <span className="d-none d-sm-inline">Hệ thống đang hoạt động</span>
        <span className="navbar-divider"></span>
        <span className="admin-avatar">A</span>
        <span className="d-none d-md-inline">Quản trị viên</span>
      </div>
    </nav>
  )
}
