import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { bookingsApi, membersApi, slotsApi, classesApi } from '../services/api'
import StatusBadge from '../components/StatusBadge'
import { ActionMenu, ManagementHeader, ManagementTable, ManagementFilterBar } from '../components/ManagementUI'
import { formatSchedule } from '../components/managementUtils'
import ConfirmDialog from '../components/ConfirmDialog'

export default function BookingsPage() {
  const { isAdmin } = useAuth()
  const [bookings, setBookings] = useState([])

  const [members, setMembers] = useState([])
  const [slots, setSlots] = useState([])
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null, loading: false })

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

  const handleOpenDelete = (id) => {
    setDeleteConfirm({ isOpen: true, id, loading: false })
  }

  const handleConfirmDelete = async () => {
    if (!deleteConfirm.id) return
    setDeleteConfirm((prev) => ({ ...prev, loading: true }))
    try {
      await bookingsApi.delete(deleteConfirm.id)
      setDeleteConfirm({ isOpen: false, id: null, loading: false })
      fetchData()
    } catch (err) {
      setDeleteConfirm({ isOpen: false, id: null, loading: false })
      setError('Lỗi xóa: ' + (err.response?.data?.detail || err.message))
    }
  }

  const memberMap = useMemo(() => Object.fromEntries(members.map((m) => [m.id, m])), [members])
  const slotMap = useMemo(() => Object.fromEntries(slots.map((s) => [s.id, s])), [slots])
  const classMap = useMemo(() => Object.fromEntries(classes.map((c) => [c.id, c])), [classes])

  const statusOptions = [
    { value: 'all', label: 'Tất cả trạng thái' },
    { value: 'confirmed', label: 'confirmed (Đã xác nhận)' },
    { value: 'waitlisted', label: 'waitlisted (Danh sách chờ)' },
    { value: 'attended', label: 'attended (Đã tham gia)' },
    { value: 'cancelled', label: 'cancelled (Đã hủy)' },
  ]

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const q = searchTerm.trim().toLowerCase()
      const member = b.member || memberMap[b.member_id]
      const slot = b.slot || slotMap[b.slot_id]
      const gymClass = slot?.class || (slot ? classMap[slot.class_id] : null)
      const matchSearch =
        !q ||
        (member?.full_name && member.full_name.toLowerCase().includes(q)) ||
        (member?.email && member.email.toLowerCase().includes(q)) ||
        (gymClass?.name && gymClass.name.toLowerCase().includes(q)) ||
        String(b.id).includes(q)
      const matchStatus = statusFilter === 'all' || b.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [bookings, searchTerm, statusFilter, memberMap, slotMap, classMap])

  const handleResetFilter = () => {
    setSearchTerm('')
    setStatusFilter('all')
  }

  return (
    <div>
      <ManagementHeader
        title="Đặt chỗ"
        description="Theo dõi đăng ký lớp học và danh sách chờ của hội viên"
        onRefresh={fetchData}
        onAdd={handleOpenAdd}
        addLabel="Đặt chỗ mới"
        count={bookings.length}
      />

      {error && (
        <div className="management-error" role="alert">
          <i className="bi bi-exclamation-circle me-2"></i> {error}
        </div>
      )}

      <ManagementFilterBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Tìm theo tên hội viên, lớp học hoặc mã..."
        filterValue={statusFilter}
        onFilterChange={setStatusFilter}
        filterOptions={statusOptions}
        filterLabel="Lọc theo trạng thái đặt chỗ"
        totalCount={bookings.length}
        filteredCount={filteredBookings.length}
        onReset={handleResetFilter}
      />

      <ManagementTable
        columns={[
          { key: 'member', label: 'Hội viên', width: isAdmin ? '28%' : '35%' },
          { key: 'class', label: 'Lớp học / Ca tập', width: isAdmin ? '18%' : '25%' },
          { key: 'waitlist', label: 'Vị trí chờ', width: isAdmin ? '19%' : '25%' },
          { key: 'status', label: 'Trạng thái', width: isAdmin ? '15%' : '15%' },
          ...(isAdmin ? [{ key: 'actions', label: 'Hành động', width: '190px', align: 'center' }] : []),
        ]}
        loading={loading}
        loadingMessage="Đang tải dữ liệu Đặt chỗ..."
        isEmpty={bookings.length === 0 || filteredBookings.length === 0}
        emptyMessage={bookings.length === 0 ? 'Chưa có dữ liệu đặt chỗ nào' : 'Không tìm thấy đặt chỗ nào phù hợp với bộ lọc'}
        emptyIcon={bookings.length === 0 ? 'bi-inbox' : 'bi-search'}
        emptyAction={
          bookings.length > 0 && filteredBookings.length === 0 ? (
            <button
              type="button"
              className="management-secondary-button mt-3"
              onClick={handleResetFilter}
            >
              <i className="bi bi-arrow-counterclockwise"></i> Đặt lại bộ lọc
            </button>
          ) : null
        }
      >
        {filteredBookings.map((b) => {
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
              {isAdmin && (
                <td className="text-end">
                  <ActionMenu onEdit={() => handleOpenEdit(b)} onDelete={() => handleOpenDelete(b.id)} deleteLabel="Xóa đặt chỗ" />
                </td>
              )}
            </tr>
          )
        })}
      </ManagementTable>


      {showModal && (
        <div
          className="modal show d-block"
          tabIndex="-1"
          role="dialog"
          aria-modal="true"
          aria-labelledby="booking-modal-title"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.45)' }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header">
                <h5 id="booking-modal-title" className="modal-title fw-bold">
                  {editingId ? `Cập nhật Đặt chỗ #${editingId}` : 'Thêm mới Đặt chỗ'}
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
                    <label htmlFor="booking-member-id" className="form-label small fw-bold">Chọn Hội viên</label>
                    <select
                      id="booking-member-id"
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
                    <label htmlFor="booking-slot-id" className="form-label small fw-bold">Chọn Ca tập</label>
                    <select
                      id="booking-slot-id"
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
                    <label htmlFor="booking-status" className="form-label small fw-bold">Trạng thái đặt chỗ</label>
                    <select
                      id="booking-status"
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
                    <label htmlFor="booking-waitlist" className="form-label small fw-bold">Vị trí hàng chờ (nếu vào waitlist)</label>
                    <input
                      id="booking-waitlist"
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
        title="Xác nhận hủy đặt chỗ"
        message={`Bạn có chắc muốn hủy bản ghi Đặt chỗ #${deleteConfirm.id}? Thao tác này không thể hoàn tác.`}
        confirmText="Hủy đặt chỗ"
        cancelText="Quay lại"
        variant="danger"
        loading={deleteConfirm.loading}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, id: null, loading: false })}
      />
    </div>
  )
}
