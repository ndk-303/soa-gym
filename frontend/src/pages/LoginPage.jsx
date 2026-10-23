import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { login, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!email || !password) {
      setError('Vui lòng nhập đầy đủ Email và Mật khẩu.')
      return
    }

    try {
      await login(email, password)
    } catch (err) {
      console.error('Login error:', err)
      const detail = err.response?.data?.detail || 'Đăng nhập không thành công. Vui lòng kiểm tra lại thông tin.'
      setError(detail)
    }
  }

  return (
    <div
      className="d-flex align-items-center justify-content-center min-vh-100 p-3"
      style={{ backgroundColor: 'var(--page-background)' }}
    >
      <div
        style={{
          maxWidth: '420px',
          width: '100%',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-md)',
          overflow: 'hidden',
        }}
      >
        <div className="pt-4 pb-2 px-4 text-center">
          <div
            className="d-inline-flex align-items-center justify-content-center mb-2"
            style={{
              width: '56px',
              height: '56px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--color-primary-subtle)',
              border: '1px solid var(--color-primary-border)',
            }}
          >
            <img src="/logo.svg" alt="SOA Gym Center" style={{ width: '34px', height: '34px' }} />
          </div>
          <h1 className="fw-bold mb-1" style={{ fontSize: '26px', color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>
            SOA Gym Center
          </h1>
          <p className="mb-0" style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Hệ thống Quản lý Vận hành Phòng Gym
          </p>
        </div>

        <div className="p-4 pt-3">
          <h2 className="fw-bold mb-3 text-center" style={{ fontSize: '16px', color: 'var(--text-primary)' }}>
            Đăng nhập tài khoản
          </h2>

          {error && (
            <div className="management-error mb-3" role="alert">
              <i className="bi bi-exclamation-triangle-fill flex-shrink-0"></i>
              <div>{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label htmlFor="login-email" className="form-label small fw-semibold" style={{ color: 'var(--text-secondary)' }}>
                Email đăng nhập
              </label>
              <div className="input-group">
                <span className="input-group-text bg-white border-end-0" style={{ color: 'var(--text-muted)' }}>
                  <i className="bi bi-envelope"></i>
                </span>
                <input
                  id="login-email"
                  type="email"
                  className="form-control border-start-0 ps-0"
                  placeholder="name@gym.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="mb-4">
              <label htmlFor="login-password" className="form-label small fw-semibold" style={{ color: 'var(--text-secondary)' }}>
                Mật khẩu
              </label>
              <div className="input-group">
                <span className="input-group-text bg-white border-end-0" style={{ color: 'var(--text-muted)' }}>
                  <i className="bi bi-lock"></i>
                </span>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-control border-start-0 ps-0"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="btn bg-white border border-start-0 shadow-none"
                  style={{ color: 'var(--text-muted)', minWidth: '44px' }}
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`} aria-hidden="true"></i>
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="management-primary-button w-100 justify-content-center py-2"
              disabled={loading}
              style={{ minHeight: '42px', fontSize: '14px' }}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Đang xác thực...
                </>
              ) : (
                <>
                  <i className="bi bi-box-arrow-in-right me-2"></i>
                  Đăng nhập
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
