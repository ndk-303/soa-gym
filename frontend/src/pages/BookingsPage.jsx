import { useState, useEffect } from 'react'
import { bookingsApi, membersApi, slotsApi, classesApi } from '../services/api'
import StatusBadge from '../components/StatusBadge'
import { ActionMenu, ManagementHeader, ManagementTable } from '../components/ManagementUI'
import { formatSchedule } from '../components/managementUtils'

export default function BookingsPage() {
  const [bookings, setBookings] = useState([])
  const [members, setMembers] = useState([])
  const [slots, setSlots] = useState([])
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    member_id: '',
    slot_id: '',
    status: 'confirmed',
    waitlist_position: '',
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
      const [bookingsRes, membersRes, slotsRes, classesRes] = await Promise.all([
        bookingsApi.getDetailed(),
        membersApi.getAll(),
        slotsApi.getAll(),
        classesApi.getAll(),
      ])
      setBookings(bookingsRes.data)
      setMembers(membersRes.data)
      setSlots(slotsRes.data)
      setClasses(classesRes.data)
    } catch (err) {
      setError(err.message || 'Lỗi khi tải danh sách đặt chỗ')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenAdd = () => {
    setEditingId(null)
    setFormData({
      member_id: members.length > 0 ? members[0].id : '',
      slot_id: slots.length > 0 ? slots[0].id : '',
      status: 'confirmed',
      waitlist_position: '',
    })
    setFormError(null)
    setShowModal(true)
  }

  const handleOpenEdit = (b) => {
    setEditingId(b.id)
    setFormData({
      member_id: b.member_id,
      slot_id: b.slot_id,
      status: b.status,
      waitlist_position: b.waitlist_position !== null && b.waitlist_position !== undefined ? b.waitlist_position : '',
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
        member_id: Number(formData.member_id),
        slot_id: Number(formData.slot_id),
        status: formData.status,
        waitlist_position: formData.waitlist_position ? Number(formData.waitlist_position) : null,
      }
      if (editingId) {
        await bookingsApi.update(editingId, payload)
      } else {
        await bookingsApi.create(payload)
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
    if (!window.confirm(`Bạn có chắc muốn hủy/xóa Đặt chỗ ID #${id}?`)) return
    try {
      await bookingsApi.delete(id)
      fetchData()
    } catch (err) {
      alert('Lỗi xóa: ' + (err.response?.data?.detail || err.message))
    }
  }

  const memberMap = Object.fromEntries(members.map((m) => [m.id, m]))
  const slotMap = Object.fromEntries(slots.map((s) => [s.id, s]))
  const classMap = Object.fromEntries(classes.map((c) => [c.id, c]))

  return (
    <div>
      <ManagementHeader title="Đặt chỗ" description="Theo dõi đăng ký lớp học và danh sách chờ của hội viên" onRefresh={fetchData} onAdd={handleOpenAdd} addLabel="Đặt chỗ mới" />

      {error && (
        <div className="management-error" role="alert">
          <i className="bi bi-exclamation-circle me-2"></i> {error}
        </div>
      )}

      <ManagementTable
        columns={[
          { key: 'member', label: 'Hội viên', width: '28%' },
          { key: 'class', label: 'Lớp học / Ca tập', width: '18%' },
          { key: 'waitlist', label: 'Vị trí chờ', width: '19%' },
          { key: 'status', label: 'Trạng thái', width: '15%' },
          { key: 'actions', label: 'Hành động', width: '190px', align: 'center' },
        ]}
        loading={loading}
        loadingMessage="Đang tải dữ liệu Đặt chỗ..."
        isEmpty={bookings.length === 0}
        emptyMessage="Chưa có dữ liệu đặt chỗ nào"
      >
                {bookings.map((b) => {
                  const member = b.member || memberMap[b.member_id]
                  const slot = b.slot || slotMap[b.slot_id]
                  const gymClass = slot?.class || (slot ? classMap[slot.class_id] : null)
                  return (
                    <tr key={b.id}>
                      <td>
                        <div className="primary-cell">{member ? member.full_name : `Hội viên #${b.member_id}`}</div>
                        <div className="secondary-cell">{member?.email || `Đặt chỗ #${b.id}`}</div>
                      </td>
                      <td>
                        <div className="primary-cell">{gymClass ? gymClass.name : `Ca #${b.slot_id}`}</div>
                        <div className="secondary-cell">{slot ? (() => { const schedule = formatSchedule(slot.start_time); return `${schedule.date} · ${schedule.time}` })() : 'Chưa có lịch'}</div>
                      </td>
                      <td>{b.waitlist_position ? <span className="waitlist-value">#{b.waitlist_position}</span> : <span className="table-note">—</span>}</td>
                      <td>
                        <StatusBadge status={b.status} />
                      </td>
                      <td className="text-end">
                        <ActionMenu onEdit={() => handleOpenEdit(b)} onDelete={() => handleDelete(b.id)} deleteLabel="Xóa đặt chỗ" />
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
                  {editingId ? `Cập nhật Đặt chỗ #${editingId}` : 'Thêm mới Đặt chỗ'}
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
                    <label className="form-label small fw-bold">Chọn Hội viên</label>
                    <select
                      className="form-select"
                      value={formData.member_id}
                      onChange={(e) => setFormData({ ...formData, member_id: e.target.value })}
                      required
                    >
                      <option value="">-- Chọn hội viên --</option>
                      {members.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.full_name} ({m.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-bold">Chọn Ca tập</label>
                    <select
                      className="form-select"
                      value={formData.slot_id}
                      onChange={(e) => setFormData({ ...formData, slot_id: e.target.value })}
                      required
                    >
                      <option value="">-- Chọn ca tập --</option>
                      {slots.map((s) => {
                        const linkedClass = classMap[s.class_id]
                        return (
                          <option key={s.id} value={s.id}>
                            {s.start_time} - {linkedClass ? linkedClass.name : `Lớp #${s.class_id}`} (Đã đặt {s.current_bookings}/{s.max_capacity})
                          </option>
                        )
                      })}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-bold">Trạng thái đặt chỗ</label>
                    <select
                      className="form-select"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      <option value="confirmed">confirmed (Đã xác nhận)</option>
                      <option value="waitlist">waitlist (Hàng chờ)</option>
                      <option value="cancelled">cancelled (Đã hủy)</option>
                    </select>
                  </div>

                  <div className="mb-2">
                    <label className="form-label small fw-bold">Vị trí hàng chờ (nếu vào waitlist)</label>
                    <input
                      type="number"
                      min="1"
                      placeholder="Để trống nếu đã xác nhận"
                      className="form-control"
                      value={formData.waitlist_position}
                      onChange={(e) => setFormData({ ...formData, waitlist_position: e.target.value })}
                    />
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
