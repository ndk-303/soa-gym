import { useState, useEffect } from 'react'
import { slotsApi, classesApi } from '../services/api'
import StatusBadge from '../components/StatusBadge'
import { ActionMenu, ManagementHeader, ManagementTable } from '../components/ManagementUI'
import { formatSchedule } from '../components/managementUtils'

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

  async function fetchData() {
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
      <ManagementHeader title="Ca tập" description="Lịch tập, sức chứa và số chỗ đã đăng ký theo từng lớp" onRefresh={fetchData} onAdd={handleOpenAdd} addLabel="Thêm ca tập" />

      {error && (
        <div className="management-error" role="alert">
          <i className="bi bi-exclamation-circle me-2"></i> {error}
        </div>
      )}

      <ManagementTable
        columns={[
          { key: 'class', label: 'Lớp học', width: '28%' },
          { key: 'start', label: 'Thời gian bắt đầu', width: '18%' },
          { key: 'capacity', label: 'Sức chứa', width: '19%' },
          { key: 'status', label: 'Trạng thái', width: '15%' },
          { key: 'actions', label: 'Hành động', width: '190px', align: 'center' },
        ]}
        loading={loading}
        loadingMessage="Đang tải dữ liệu Ca tập..."
        isEmpty={slots.length === 0}
        emptyMessage="Chưa có dữ liệu ca tập nào"
      >
                {slots.map((s) => {
                  const linkedClass = classMap[s.class_id]
                  return (
                    <tr key={s.id}>
                      <td>
                        <div className="primary-cell">{linkedClass ? linkedClass.name : `Lớp #${s.class_id}`}</div>
                        <div className="secondary-cell">Ca tập #{s.id}{linkedClass?.category ? ` · ${linkedClass.category}` : ''}</div>
                      </td>
                      <td>{(() => { const schedule = formatSchedule(s.start_time); return <><div className="schedule-date">{schedule.date}</div><div className="schedule-time">{schedule.time}</div></> })()}</td>
                      <td>
                        <div className="capacity-label"><span><strong>{s.current_bookings}</strong> / {s.max_capacity} chỗ</span></div>
                        <div className="capacity-bar"><span style={{ width: `${Math.min(100, (s.current_bookings / (s.max_capacity || 1)) * 100)}%` }}></span>
                        </div>
                      </td>
                      <td>
                        <StatusBadge status={s.is_cancelled ? 'cancelled' : 'active'} />
                      </td>
                      <td className="text-end">
                        <ActionMenu onEdit={() => handleOpenEdit(s)} onDelete={() => handleDelete(s.id)} />
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
