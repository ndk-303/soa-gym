import { useState, useEffect, useMemo } from 'react'
import { usersApi } from '../services/api'
import StatusBadge from '../components/StatusBadge'
import { ActionMenu, ManagementHeader, ManagementTable, ManagementFilterBar } from '../components/ManagementUI'
import ConfirmDialog from '../components/ConfirmDialog'

export default function UsersPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')

  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null, loading: false })
  
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

  async function fetchUsers() {
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
      password: '',
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
        const payload = {
          email: formData.email,
          role: formData.role,
          is_active: formData.is_active,
        }
        if (formData.password && formData.password.trim()) {
          payload.password = formData.password
        }
        await usersApi.update(editingId, payload)
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

  const handleOpenDelete = (id) => {
    setDeleteConfirm({ isOpen: true, id, loading: false })
  }

  const handleConfirmDelete = async () => {
    if (!deleteConfirm.id) return
    setDeleteConfirm((prev) => ({ ...prev, loading: true }))
    try {
      await usersApi.delete(deleteConfirm.id)
      setDeleteConfirm({ isOpen: false, id: null, loading: false })
      fetchUsers()
    } catch (err) {
      setDeleteConfirm({ isOpen: false, id: null, loading: false })
      setError('Lỗi xóa: ' + (err.response?.data?.detail || err.message))
    }
  }

  const roleLabels = { admin: 'Quản trị viên', trainer: 'Huấn luyện viên', member: 'Hội viên' }

  const roleOptions = [
    { value: 'all', label: 'Tất cả vai trò' },
    { value: 'admin', label: 'admin (Quản trị viên)' },
    { value: 'trainer', label: 'trainer (Huấn luyện viên)' },
    { value: 'member', label: 'member (Hội viên)' },
  ]

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = searchTerm.trim().toLowerCase()
      const matchSearch =
        !q ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        String(u.id).includes(q)
      const matchRole = roleFilter === 'all' || u.role === roleFilter
      return matchSearch && matchRole
    })
  }, [users, searchTerm, roleFilter])

  const handleResetFilter = () => {
    setSearchTerm('')
    setRoleFilter('all')
  }

  return (
    <div>
      <ManagementHeader
        title="Tài khoản"
        description="Quản lý tài khoản đăng nhập và phân quyền truy cập"
        onRefresh={fetchUsers}
        onAdd={handleOpenAdd}
        addLabel="Thêm tài khoản"
        count={users.length}
      />

      {error && (
        <div className="management-error" role="alert">
          <i className="bi bi-exclamation-circle me-2"></i>{error}
        </div>
      )}

      <ManagementFilterBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Tìm theo email hoặc ID tài khoản..."
        filterValue={roleFilter}
        onFilterChange={setRoleFilter}
        filterOptions={roleOptions}
        filterLabel="Lọc theo vai trò"
        totalCount={users.length}
        filteredCount={filteredUsers.length}
        onReset={handleResetFilter}
      />

      <ManagementTable
        columns={[
          { key: 'email', label: 'Email', width: '42%' },
          { key: 'role', label: 'Vai trò', width: '18%' },
          { key: 'status', label: 'Trạng thái', width: '18%' },
          { key: 'actions', label: 'Hành động', width: '190px', align: 'center' },
        ]}
        loading={loading}
        loadingMessage="Đang tải dữ liệu Users từ API..."
        isEmpty={users.length === 0 || filteredUsers.length === 0}
        emptyMessage={users.length === 0 ? 'Chưa có dữ liệu tài khoản nào' : 'Không tìm thấy tài khoản nào phù hợp với bộ lọc'}
        emptyIcon={users.length === 0 ? 'bi-inbox' : 'bi-search'}
        emptyAction={
          users.length > 0 && filteredUsers.length === 0 ? (
            <button
              type="button"
              className="management-secondary-button mt-3"
              onClick={handleResetFilter}
            >
              <i className="bi bi-arrow-counterclockwise"></i> Đặt lại bộ lọc
            </button>
          ) : null
        }
        minWidth={640}
      >
        {filteredUsers.map((u) => (
                  <tr key={u.id}>
                    <td><div className="primary-cell">{u.email}</div><div className="secondary-cell">Tài khoản #{u.id}</div></td>
                    <td>
                      <span className="semantic-badge">{roleLabels[u.role] || u.role}</span>
                    </td>
                    <td>
                      <StatusBadge status={u.is_active ? 'active' : 'inactive'} />
                    </td>
                    <td className="text-end">
                      <ActionMenu onEdit={() => handleOpenEdit(u)} onDelete={() => handleOpenDelete(u.id)} />
                    </td>
                  </tr>
                ))}
      </ManagementTable>

      {showModal && (
        <div
          className="modal show d-block"
          tabIndex="-1"
          role="dialog"
          aria-modal="true"
          aria-labelledby="user-modal-title"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.45)' }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header">
                <h5 className="modal-title fw-bold" id="user-modal-title">
                  {editingId ? `Cập nhật Tài khoản #${editingId}` : 'Thêm mới Tài khoản'}
                </h5>
                <button type="button" className="btn-close" onClick={handleCloseModal} aria-label="Đóng"></button>
              </div>
              <form onSubmit={handleSave}>
                <div className="modal-body">
                  {formError && (
                    <div className="alert alert-danger py-2 small mb-3">
                      <i className="bi bi-exclamation-triangle me-1"></i> {formError}
                    </div>
                  )}
                  <div className="mb-3">
                    <label htmlFor="user-email" className="form-label small fw-bold">Email</label>
                    <input
                      id="user-email"
                      type="email"
                      className="form-control"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="user-password" className="form-label small fw-bold">
                      {editingId ? 'Mật khẩu mới (Tùy chọn)' : 'Mật khẩu'}
                    </label>
                    <input
                      id="user-password"
                      type="password"
                      className="form-control"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required={!editingId}
                      placeholder={editingId ? 'Để trống nếu không muốn đổi mật khẩu' : 'Tối thiểu 6 ký tự'}
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="user-role" className="form-label small fw-bold">Vai trò (Role)</label>
                    <select
                      id="user-role"
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
                  <button type="button" className="management-secondary-button" onClick={handleCloseModal}>
                    Hủy
                  </button>
                  <button type="submit" className="management-primary-button" disabled={submitting}>
                    {submitting ? 'Đang lưu...' : (editingId ? 'Lưu thay đổi' : 'Thêm mới')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Xác nhận xóa Tài khoản"
        message={`Bạn có chắc muốn xóa Tài khoản #${deleteConfirm.id}? Thao tác này sẽ xóa quyền đăng nhập của người dùng.`}
        confirmText="Xóa tài khoản"
        cancelText="Hủy bỏ"
        variant="danger"
        loading={deleteConfirm.loading}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, id: null, loading: false })}
      />
    </div>
  )
}
