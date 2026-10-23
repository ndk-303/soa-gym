import { useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

export default function Navbar({ onMenuToggle }) {
  const { user, isAdmin, isTrainer, logout } = useAuth()

  useEffect(() => {
    document.documentElement.removeAttribute('data-theme')
    localStorage.removeItem('soa-theme')
  }, [])

  const roleLabel = isAdmin ? 'Quản trị viên' : isTrainer ? 'Huấn luyện viên' : 'Hội viên'
  const roleAvatarClass = isAdmin ? 'is-admin' : isTrainer ? 'is-trainer' : 'is-member'
  const roleInitial = isAdmin ? 'A' : isTrainer ? 'T' : 'M'

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
          className={`admin-avatar ${roleAvatarClass}`}
          title={`${roleLabel} - ${user?.email}`}
        >
          {roleInitial}
        </span>

        <div className="navbar-user-block">
          <span className="navbar-user-role">
            {roleLabel}
          </span>
          <span className="navbar-user-email">
            {user?.email}
          </span>
        </div>

        <button
          type="button"
          className="navbar-logout-btn"
          onClick={logout}
          title="Đăng xuất"
        >
          <i className="bi bi-box-arrow-right"></i>
          <span>Đăng xuất</span>
        </button>
      </div>
    </nav>
  )
}
