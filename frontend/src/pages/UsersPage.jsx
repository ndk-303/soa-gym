import { useState, useEffect } from 'react'
import { usersApi } from '../services/api'
import StatusBadge from '../components/StatusBadge'
import LoadingSpinner from '../components/LoadingSpinner'

export default function UsersPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    email: '',
    role: 'member',
    password: '',
    is_active: true,
  })
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await usersApi.getAll()
      setUsers(res.data)
    } catch (err) {
      setError(err.message || 'Lỗi khi tải danh sách người dùng')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenAdd = () => {
    setEditingId(null)
    setFormData({
      email: '',
      role: 'member',
      password: '',
      is_active: true,
    })
    setFormError(null)
    setShowModal(true)
  }

  const handleOpenEdit = (user) => {
    setEditingId(user.id)
    setFormData({
      email: user.email,
      role: user.role,
      password: user.password || '',
      is_active: user.is_active,
    })
    setFormError(null)
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingId(null)
    setFormError(null)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setFormError(null)
    try {
      if (editingId) {
        await usersApi.update(editingId, formData)
      } else {
        await usersApi.create(formData)
      }
      handleCloseModal()
      fetchUsers()
    } catch (err) {
      setFormError(err.response?.data?.detail || err.message || 'Lỗi xử lý')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm(`Bạn có chắc muốn xóa User ID #${id}?`)) return
    try {
      await usersApi.delete(id)
      fetchUsers()
    } catch (err) {
      alert('Lỗi xóa: ' + (err.response?.data?.detail || err.message))
    }
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h3 className="fw-bold mb-1">
            <i className="bi bi-people-fill text-secondary me-2"></i>
            Quản lý Tài khoản (Users)
          </h3>
          <p className="text-muted small mb-0">Quản lý tài khoản đăng nhập, phân quyền (admin, trainer, member)</p>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary btn-sm" onClick={fetchUsers}>
            <i className="bi bi-arrow-clockwise me-1"></i> Làm mới
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleOpenAdd}>
            <i className="bi bi-plus-lg me-1"></i> Thêm Tài khoản
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger py-2 small" role="alert">
          <i className="bi bi-exclamation-circle me-2"></i> {error}
        </div>
      )}

      <div className="card border-0 shadow-sm">
        <div className="table-responsive">
          {loading ? (
            <LoadingSpinner message="Đang tải dữ liệu Users từ API..." />
          ) : users.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="bi bi-inbox fs-1 d-block mb-2 text-secondary"></i>
              Chưa có dữ liệu tài khoản nào
            </div>
          ) : (
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th style={{ width: '60px' }}>ID</th>
                  <th>Email</th>
                  <th>Vai trò (Role)</th>
                  <th>Trạng thái</th>
                  <th style={{ width: '140px' }} className="text-end">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="fw-bold text-secondary">#{u.id}</td>
                    <td className="fw-medium">{u.email}</td>
                    <td>
                      <span className={`badge ${u.role === 'admin' ? 'bg-danger-subtle text-danger' : u.role === 'trainer' ? 'bg-info-subtle text-info' : 'bg-primary-subtle text-primary'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={u.is_active ? 'active' : 'inactive'} />
                    </td>
                    <td className="text-end">
                      <button className="btn btn-sm btn-outline-primary me-1" onClick={() => handleOpenEdit(u)}>
                        <i className="bi bi-pencil"></i>
                      </button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(u.id)}>
                        <i className="bi bi-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">
                  {editingId ? `Cập nhật Tài khoản #${editingId}` : 'Thêm mới Tài khoản'}
                </h5>
                <button type="button" className="btn-close" onClick={handleCloseModal}></button>
              </div>
              <form onSubmit={handleSave}>
                <div className="modal-body">
                  {formError && (
                    <div className="alert alert-danger py-2 small mb-3">
                      <i className="bi bi-exclamation-triangle me-1"></i> {formError}
                    </div>
                  )}
                  <div className="mb-3">
                    <label className="form-label small fw-bold">Email</label>
                    <input
                      type="email"
                      className="form-control"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-bold">Mật khẩu</label>
                    <input
                      type="password"
                      className="form-control"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                      placeholder="Tối thiểu 6 ký tự"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-bold">Vai trò (Role)</label>
                    <select
                      className="form-select"
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    >
                      <option value="member">member</option>
                      <option value="trainer">trainer</option>
                      <option value="admin">admin</option>
                    </select>
                  </div>
                  <div className="form-check form-switch mb-2">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="userActiveSwitch"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    />
                    <label className="form-check-label small" htmlFor="userActiveSwitch">
                      Kích hoạt tài khoản
                    </label>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={handleCloseModal}>
                    Hủy
                  </button>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
                    {submitting ? 'Đang lưu...' : (editingId ? 'Lưu thay đổi' : 'Thêm mới')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
