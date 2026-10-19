import { useState, useEffect } from 'react'
import { membersApi, usersApi, plansApi } from '../services/api'
import StatusBadge from '../components/StatusBadge'
import { ActionMenu, ManagementHeader, ManagementTable } from '../components/ManagementUI'

export default function MembersPage() {
  const [members, setMembers] = useState([])
  const [users, setUsers] = useState([])
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    user_id: '',
    full_name: '',
    email: '',
    status: 'active',
    membership_plan_id: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    setError(null)
    try {
      const [membersRes, usersRes, plansRes] = await Promise.all([
        membersApi.getDetailed(),
        usersApi.getAll(),
        plansApi.getAll(),
      ])
      setMembers(membersRes.data)
      setUsers(usersRes.data)
      setPlans(plansRes.data)
    } catch (err) {
      setError(err.message || 'Lỗi khi tải dữ liệu hội viên')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenAdd = () => {
    setEditingId(null)
    const assignedUserIds = members.map((m) => m.user_id)
    const availableUsers = users.filter((u) => !assignedUserIds.includes(u.id))
    const defaultUser = availableUsers.length > 0 ? availableUsers[0] : (users[0] || null)

    setFormData({
      user_id: defaultUser ? defaultUser.id : '',
      full_name: '',
      email: defaultUser ? defaultUser.email : '',
      status: 'active',
      membership_plan_id: plans.length > 0 ? plans[0].id : '',
    })
    setFormError(null)
    setShowModal(true)
  }

  const handleOpenEdit = (m) => {
    setEditingId(m.id)
    setFormData({
      user_id: m.user_id,
      full_name: m.full_name,
      email: m.email,
      status: m.status,
      membership_plan_id: m.membership_plan_id !== null && m.membership_plan_id !== undefined ? m.membership_plan_id : '',
    })
    setFormError(null)
    setShowModal(true)
  }

  const handleUserSelect = (selectedUserId) => {
    const selectedUser = users.find((u) => String(u.id) === String(selectedUserId))
    setFormData({
      ...formData,
      user_id: selectedUserId,
      email: selectedUser ? selectedUser.email : formData.email,
    })
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
      const payload = {
        user_id: Number(formData.user_id),
        full_name: formData.full_name,
        email: formData.email,
        status: formData.status,
        membership_plan_id: formData.membership_plan_id ? Number(formData.membership_plan_id) : null,
      }
      if (editingId) {
        await membersApi.update(editingId, payload)
      } else {
        await membersApi.create(payload)
      }
      handleCloseModal()
      fetchData()
    } catch (err) {
      setFormError(err.response?.data?.detail || err.message || 'Lỗi xử lý')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm(`Bạn có chắc muốn xóa Hội viên ID #${id}?`)) return
    try {
      await membersApi.delete(id)
      fetchData()
    } catch (err) {
      alert('Lỗi xóa: ' + (err.response?.data?.detail || err.message))
    }
  }

  const userMap = Object.fromEntries(users.map((u) => [u.id, u]))
  const planMap = Object.fromEntries(plans.map((p) => [p.id, p]))

  return (
    <div>
      <ManagementHeader title="Hội viên" description="Hồ sơ hội viên, gói tập hiện tại và trạng thái kích hoạt" onRefresh={fetchData} onAdd={handleOpenAdd} addLabel="Thêm hội viên" />

      {error && (
        <div className="management-error" role="alert">
          <i className="bi bi-exclamation-circle me-2"></i> {error}
        </div>
      )}

      <ManagementTable
        columns={[
          { key: 'member', label: 'Hội viên', width: '28%' },
          { key: 'user', label: 'Tài khoản User', width: '18%' },
          { key: 'plan', label: 'Gói tập hiện tại', width: '19%' },
          { key: 'status', label: 'Trạng thái', width: '15%' },
          { key: 'actions', label: 'Hành động', width: '190px', align: 'center' },
        ]}
        loading={loading}
        loadingMessage="Đang tải dữ liệu Hội viên..."
        isEmpty={members.length === 0}
        emptyMessage="Chưa có dữ liệu hội viên nào"
      >
                {members.map((m) => {
                  const linkedUser = m.user || userMap[m.user_id]
                  const linkedPlan = m.membership_plan || planMap[m.membership_plan_id]
                  return (
                    <tr key={m.id}>
                      <td className="identity-cell">
                        <div className="identity-name">{m.full_name}</div>
                        <div className="identity-email">{m.email || 'Chưa có email'}</div>
                      </td>
                      <td>
                        <span className="linked-value"><i className="bi bi-person"></i>{linkedUser ? linkedUser.email : `Tài khoản #${m.user_id}`}</span>
                      </td>
                      <td>
                        {linkedPlan ? (
                          <span className="primary-cell">{linkedPlan.name}</span>
                        ) : (
                          <span className="table-note">Chưa đăng ký</span>
                        )}
                      </td>
                      <td>
                        <StatusBadge status={m.status} />
                      </td>
                      <td className="text-end">
                        <ActionMenu onEdit={() => handleOpenEdit(m)} onDelete={() => handleDelete(m.id)} />
                      </td>
                    </tr>
                  )
                })}
      </ManagementTable>

      {showModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">
                  {editingId ? `Cập nhật Hội viên #${editingId}` : 'Thêm mới Hội viên'}
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
                    <label className="form-label small fw-bold">Chọn Tài khoản User liên kết</label>
                    <select
                      className="form-select"
                      value={formData.user_id}
                      onChange={(e) => handleUserSelect(e.target.value)}
                      required
                    >
                      <option value="">-- Chọn tài khoản User --</option>
                      {users.map((u) => {
                        const isAssigned = members.some((m) => m.user_id === u.id && m.id !== editingId)
                        return (
                          <option key={u.id} value={u.id} disabled={isAssigned}>
                            {u.email} ({u.role}) {isAssigned ? '- [Đã có hồ sơ]' : ''}
                          </option>
                        )
                      })}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-bold">Họ và Tên Hội viên</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      required
                      placeholder="Ví dụ: Nguyễn Văn An"
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-bold">Email liên lạc</label>
                    <input
                      type="email"
                      className="form-control"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-bold">Chọn Gói tập</label>
                    <select
                      className="form-select"
                      value={formData.membership_plan_id}
                      onChange={(e) => setFormData({ ...formData, membership_plan_id: e.target.value })}
                    >
                      <option value="">-- Chưa đăng ký gói tập --</option>
                      {plans.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} - {Number(p.price).toLocaleString()}đ ({p.duration_days} ngày)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-2">
                    <label className="form-label small fw-bold">Trạng thái Hội viên</label>
                    <select
                      className="form-select"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      <option value="active">active (Đang hoạt động)</option>
                      <option value="inactive">inactive (Tạm ngưng)</option>
                      <option value="expired">expired (Hết hạn)</option>
                    </select>
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
