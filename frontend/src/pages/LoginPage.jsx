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

  const handleFillAccount = (accEmail, accPass) => {
    setEmail(accEmail)
    setPassword(accPass)
    setError('')
  }

  return (
    <div className="d-flex align-items-center justify-content-center min-vh-100 p-3" style={{ backgroundColor: '#f1f5f9' }}>
      <div className="card shadow-sm border-0" style={{ maxWidth: '440px', width: '100%', borderRadius: '16px', overflow: 'hidden' }}>
        <div className="card-header bg-white border-0 pt-4 pb-2 text-center">
          <div className="d-inline-flex align-items-center justify-content-center p-2 rounded-circle bg-light mb-2" style={{ width: '64px', height: '64px' }}>
            <img src="/logo.svg" alt="SOA Gym Center" style={{ width: '40px', height: '40px' }} />
          </div>
          <h4 className="fw-bold text-dark mb-1">SOA Gym Center</h4>
          <p className="text-muted small mb-0">Hệ thống Quản lý Phòng Gym</p>
        </div>

        <div className="card-body p-4">
          <h5 className="card-title fw-semibold text-secondary mb-3 text-center">Đăng nhập</h5>

          {error && (
            <div className="alert alert-danger d-flex align-items-center py-2 px-3 small rounded-3 " role="alert">
              <i className="bi bi-exclamation-triangle-fill me-2 fs-6"></i>
              <div>{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label small fw-medium text-secondary">Email</label>
              <div className="input-group">
                <span className="input-group-text bg-white border-end-0 text-muted">
                  <i className="bi bi-envelope"></i>
                </span>
                <input
                  type="email"
                  className="form-control border-start-0 ps-0"
                  placeholder="name@gym.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="form-label small fw-medium text-secondary">Mật khẩu</label>
              <div className="input-group">
                <span className="input-group-text bg-white border-end-0 text-muted">
                  <i className="bi bi-lock"></i>
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-control border-start-0 ps-0"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="btn bg-white border border-start-0 shadow-none text-muted"
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
              className="btn btn-primary w-100 py-2 fw-medium rounded-3"
              disabled={loading}
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
