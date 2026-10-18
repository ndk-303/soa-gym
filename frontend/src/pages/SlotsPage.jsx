import { useState, useEffect } from 'react'
import { slotsApi, classesApi } from '../services/api'
import StatusBadge from '../components/StatusBadge'
import LoadingSpinner from '../components/LoadingSpinner'

export default function SlotsPage() {
  const [slots, setSlots] = useState([])
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    class_id: '',
    start_time: '2026-10-19 06:00:00',
    max_capacity: 20,
    current_bookings: 0,
    is_cancelled: false,
  })
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [slotsRes, classesRes] = await Promise.all([
        slotsApi.getAll(),
        classesApi.getAll(),
      ])
      setSlots(slotsRes.data)
      setClasses(classesRes.data)
    } catch (err) {
      setError(err.message || 'Lỗi khi tải danh sách ca tập')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenAdd = () => {
    setEditingId(null)
    setFormData({
      class_id: classes.length > 0 ? classes[0].id : '',
      start_time: '2026-10-19 06:00:00',
      max_capacity: 20,
      current_bookings: 0,
      is_cancelled: false,
    })
    setFormError(null)
    setShowModal(true)
  }

  const handleOpenEdit = (s) => {
    setEditingId(s.id)
    setFormData({
      class_id: s.class_id,
      start_time: s.start_time,
      max_capacity: s.max_capacity,
      current_bookings: s.current_bookings,
      is_cancelled: s.is_cancelled,
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
        class_id: Number(formData.class_id),
        start_time: formData.start_time,
        max_capacity: Number(formData.max_capacity),
        current_bookings: Number(formData.current_bookings),
        is_cancelled: Boolean(formData.is_cancelled),
      }
      if (editingId) {
        await slotsApi.update(editingId, payload)
      } else {
        await slotsApi.create(payload)
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
    if (!window.confirm(`Bạn có chắc muốn xóa Ca tập ID #${id}?`)) return
    try {
      await slotsApi.delete(id)
      fetchData()
    } catch (err) {
      alert('Lỗi xóa: ' + (err.response?.data?.detail || err.message))
    }
  }

  const classMap = Object.fromEntries(classes.map((c) => [c.id, c]))

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h3 className="fw-bold mb-1">
            <i className="bi bi-clock-history text-secondary me-2"></i>
            Quản lý Ca tập (Class Slots)
          </h3>
          <p className="text-muted small mb-0">Thời gian biểu các ca học, số lượng chỗ tối đa và số chỗ đã đặt</p>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary btn-sm" onClick={fetchData}>
            <i className="bi bi-arrow-clockwise me-1"></i> Làm mới
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleOpenAdd}>
            <i className="bi bi-plus-lg me-1"></i> Thêm Ca tập
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
            <LoadingSpinner message="Đang tải dữ liệu Ca tập..." />
          ) : slots.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="bi bi-inbox fs-1 d-block mb-2 text-secondary"></i>
              Chưa có dữ liệu ca tập nào
            </div>
          ) : (
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th style={{ width: '60px' }}>ID</th>
                  <th>Lớp học</th>
                  <th>Thời gian bắt đầu</th>
                  <th>Đã đặt / Tối đa</th>
                  <th>Trạng thái</th>
                  <th style={{ width: '140px' }} className="text-end">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {slots.map((s) => {
                  const linkedClass = classMap[s.class_id]
                  return (
                    <tr key={s.id}>
                      <td className="fw-bold text-secondary">#{s.id}</td>
                      <td>
                        <span className="badge bg-warning-subtle text-warning-emphasis border">
                          <i className="bi bi-calendar-event me-1"></i>
                          {linkedClass ? `${linkedClass.name} (${linkedClass.category})` : `Lớp #${s.class_id}`}
                        </span>
                      </td>
                      <td className="fw-medium">{s.start_time}</td>
                      <td>
                        <span className="fw-bold text-primary">{s.current_bookings}</span> / {s.max_capacity}
                        <div className="progress mt-1" style={{ height: '6px' }}>
                          <div 
                            className="progress-bar bg-primary" 
                            role="progressbar" 
                            style={{ width: `${Math.min(100, (s.current_bookings / (s.max_capacity || 1)) * 100)}%` }}
                          ></div>
                        </div>
                      </td>
                      <td>
                        <StatusBadge status={s.is_cancelled ? 'cancelled' : 'active'} />
                      </td>
                      <td className="text-end">
                        <button className="btn btn-sm btn-outline-primary me-1" onClick={() => handleOpenEdit(s)}>
                          <i className="bi bi-pencil"></i>
                        </button>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(s.id)}>
                          <i className="bi bi-trash"></i>
                        </button>
                      </td>
                    </tr>
                  )
                })}
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
                  {editingId ? `Cập nhật Ca tập #${editingId}` : 'Thêm mới Ca tập'}
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
                    <label className="form-label small fw-bold">Chọn Lớp học</label>
                    <select
                      className="form-select"
                      value={formData.class_id}
                      onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                      required
                    >
                      <option value="">-- Chọn lớp học --</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.category})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-bold">Thời gian bắt đầu</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.start_time}
                      onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                      required
                      placeholder="YYYY-MM-DD HH:mm:ss"
                    />
                  </div>
                  <div className="row g-2 mb-3">
                    <div className="col-md-6">
                      <label className="form-label small fw-bold">Sức chứa tối đa</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        className="form-control"
                        value={formData.max_capacity}
                        onChange={(e) => setFormData({ ...formData, max_capacity: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-bold">Số chỗ đã đặt</label>
                      <input
                        type="number"
                        min="0"
                        className="form-control"
                        value={formData.current_bookings}
                        onChange={(e) => setFormData({ ...formData, current_bookings: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="form-check form-switch mb-2">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="slotCancelledSwitch"
                      checked={formData.is_cancelled}
                      onChange={(e) => setFormData({ ...formData, is_cancelled: e.target.checked })}
                    />
                    <label className="form-check-label small" htmlFor="slotCancelledSwitch">
                      Đã hủy ca tập (is_cancelled)
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
