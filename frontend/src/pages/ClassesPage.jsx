import { useState, useEffect } from 'react'
import { classesApi, usersApi } from '../services/api'
import StatusBadge from '../components/StatusBadge'
import { ActionMenu, ManagementHeader, ManagementTable } from '../components/ManagementUI'

export default function ClassesPage() {
  const [classes, setClasses] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    category: 'Yoga',
    trainer_id: '',
    is_active: true,
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
      const [classesRes, usersRes] = await Promise.all([
        classesApi.getAll(),
        usersApi.getAll(),
      ])
      setClasses(classesRes.data)
      setUsers(usersRes.data)
    } catch (err) {
      setError(err.message || 'Lỗi khi tải danh sách lớp học')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenAdd = () => {
    setEditingId(null)
    const trainers = users.filter((u) => u.role === 'trainer')
    const defaultTrainer = trainers.length > 0 ? trainers[0] : (users[0] || null)
    setFormData({
      name: '',
      category: 'Yoga',
      trainer_id: defaultTrainer ? defaultTrainer.id : '',
      is_active: true,
    })
    setFormError(null)
    setShowModal(true)
  }

  const handleOpenEdit = (c) => {
    setEditingId(c.id)
    setFormData({
      name: c.name,
      category: c.category,
      trainer_id: c.trainer_id,
      is_active: c.is_active,
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
      const payload = {
        name: formData.name,
        category: formData.category,
        trainer_id: Number(formData.trainer_id),
        is_active: Boolean(formData.is_active),
      }
      if (editingId) {
        await classesApi.update(editingId, payload)
      } else {
        await classesApi.create(payload)
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
    if (!window.confirm(`Bạn có chắc muốn xóa Lớp học ID #${id}?`)) return
    try {
      await classesApi.delete(id)
      fetchData()
    } catch (err) {
      alert('Lỗi xóa: ' + (err.response?.data?.detail || err.message))
    }
  }

  const userMap = Object.fromEntries(users.map((u) => [u.id, u]))

  return (
    <div>
      <ManagementHeader title="Lớp học" description="Quản lý bộ môn, huấn luyện viên và trạng thái lớp học" onRefresh={fetchData} onAdd={handleOpenAdd} addLabel="Thêm lớp học" />

      {error && (
        <div className="management-error" role="alert">
          <i className="bi bi-exclamation-circle me-2"></i> {error}
        </div>
      )}

      <ManagementTable
        columns={[
          { key: 'name', label: 'Tên lớp', width: '28%' },
          { key: 'category', label: 'Bộ môn', width: '18%' },
          { key: 'trainer', label: 'Huấn luyện viên', width: '19%' },
          { key: 'status', label: 'Trạng thái', width: '15%' },
          { key: 'actions', label: 'Hành động', width: '190px', align: 'center' },
        ]}
        loading={loading}
        loadingMessage="Đang tải dữ liệu Lớp học..."
        isEmpty={classes.length === 0}
        emptyMessage="Chưa có dữ liệu lớp học nào"
      >
                {classes.map((c) => {
                  const trainer = userMap[c.trainer_id]
                  return (
                    <tr key={c.id}>
                      <td><div className="primary-cell">{c.name}</div><div className="secondary-cell">Lớp #{c.id}</div></td>
                      <td><span className="semantic-badge">{c.category}</span></td>
                      <td>
                        <span className="linked-value"><i className="bi bi-person-workspace"></i>{trainer ? trainer.email : `Huấn luyện viên #${c.trainer_id}`}</span>
                      </td>
                      <td>
                        <StatusBadge status={c.is_active ? 'active' : 'inactive'} />
                      </td>
                      <td className="text-end">
                        <ActionMenu onEdit={() => handleOpenEdit(c)} onDelete={() => handleDelete(c.id)} />
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
                  {editingId ? `Cập nhật Lớp học #${editingId}` : 'Thêm mới Lớp học'}
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
                    <label className="form-label small fw-bold">Tên lớp học</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      placeholder="Ví dụ: Yoga Bình Minh"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-bold">Thể loại (Category)</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      required
                      placeholder="Yoga, Boxing, Cardio, Pilates..."
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-bold">Chọn Huấn luyện viên phụ trách</label>
                    <select
                      className="form-select"
                      value={formData.trainer_id}
                      onChange={(e) => setFormData({ ...formData, trainer_id: e.target.value })}
                      required
                    >
                      <option value="">-- Chọn huấn luyện viên --</option>
                      {users
                        .filter((u) => u.role === 'trainer' || String(u.id) === String(formData.trainer_id))
                        .map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.email}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="form-check form-switch mb-2">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="classActiveSwitch"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    />
                    <label className="form-check-label small" htmlFor="classActiveSwitch">
                      Đang mở lớp hoạt động
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
