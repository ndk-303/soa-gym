import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { slotsApi, classesApi } from '../services/api'
import StatusBadge from '../components/StatusBadge'
import { ActionMenu, ManagementHeader, ManagementTable, ManagementFilterBar, ManagementModal } from '../components/ManagementUI'
import { formatSchedule, toDatetimeLocalValue, fromDatetimeLocalValue, getNowDatetimeLocalValue } from '../components/managementUtils'
import ConfirmDialog from '../components/ConfirmDialog'
import { useToast } from '../context/ToastContext'

export default function SlotsPage() {
  const toast = useToast()
  const { isAdmin } = useAuth()
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
    class_id: '',
    start_time: '',
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
        slotsApi.getDetailed(),
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
      start_time: getNowDatetimeLocalValue(),
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
      start_time: toDatetimeLocalValue(s.start_time),
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

    if (!formData.class_id) {
      setFormError('Vui lòng chọn lớp học')
      setSubmitting(false)
      return
    }
    if (!formData.start_time) {
      setFormError('Vui lòng chọn thời gian bắt đầu ca tập')
      setSubmitting(false)
      return
    }
    if (!formData.max_capacity || Number(formData.max_capacity) < 1) {
      setFormError('Sức chứa tối đa phải từ 1 người trở lên')
      setSubmitting(false)
      return
    }
    if (Number(formData.current_bookings) > Number(formData.max_capacity)) {
      setFormError('Số chỗ đã đặt không thể vượt quá sức chứa tối đa')
      setSubmitting(false)
      return
    }

    try {
      const payload = {
        class_id: Number(formData.class_id),
        start_time: fromDatetimeLocalValue(formData.start_time),
        max_capacity: Number(formData.max_capacity),
        current_bookings: Number(formData.current_bookings),
        is_cancelled: Boolean(formData.is_cancelled),
      }
      if (editingId) {
        await slotsApi.update(editingId, payload)
        toast.success('Cập nhật ca tập thành công')
      } else {
        await slotsApi.create(payload)
        toast.success('Thêm mới ca tập thành công')
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
      await slotsApi.delete(deleteConfirm.id)
      setDeleteConfirm({ isOpen: false, id: null, loading: false })
      toast.success('Đã xóa ca tập thành công')
      fetchData()
    } catch (err) {
      setDeleteConfirm({ isOpen: false, id: null, loading: false })
      const errorMsg = 'Lỗi xóa: ' + (err.response?.data?.detail || err.message)
      setError(errorMsg)
      toast.error(errorMsg)
    }
  }

  const classMap = useMemo(() => Object.fromEntries(classes.map((c) => [c.id, c])), [classes])

  const statusOptions = [
    { value: 'all', label: 'Tất cả trạng thái' },
    { value: 'active', label: 'Đang mở (Khả dụng)' },
    { value: 'cancelled', label: 'Đã hủy' },
  ]

  const filteredSlots = useMemo(() => {
    return slots.filter((s) => {
      const q = searchTerm.trim().toLowerCase()
      const linkedClass = s.class || classMap[s.class_id]
      const matchSearch =
        !q ||
        (linkedClass?.name && linkedClass.name.toLowerCase().includes(q)) ||
        (linkedClass?.category && linkedClass.category.toLowerCase().includes(q)) ||
        String(s.id).includes(q)
      const isCancelled = Boolean(s.is_cancelled)
      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'cancelled' && isCancelled) ||
        (statusFilter === 'active' && !isCancelled)
      return matchSearch && matchStatus
    })
  }, [slots, searchTerm, statusFilter, classMap])

  const handleResetFilter = () => {
    setSearchTerm('')
    setStatusFilter('all')
  }

  return (
    <div>
      <ManagementHeader
        title="Ca tập"
        onRefresh={fetchData}
        onAdd={isAdmin ? handleOpenAdd : undefined}
        addLabel="Thêm ca tập"
      />

      {error && (
        <div className="management-error" role="alert">
          <i className="bi bi-exclamation-circle me-2"></i> {error}
        </div>
      )}

      <ManagementFilterBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Tìm theo tên lớp, bộ môn hoặc mã ca..."
        filterValue={statusFilter}
        onFilterChange={setStatusFilter}
        filterOptions={statusOptions}
        filterLabel="Lọc theo trạng thái ca tập"
        totalCount={slots.length}
        filteredCount={filteredSlots.length}
        onReset={handleResetFilter}
      />

      <ManagementTable
        minWidth={isAdmin ? 720 : 600}
        columns={[
          { key: 'class', label: 'Lớp học', width: isAdmin ? '28%' : '34%' },
          { key: 'start', label: 'Thời gian bắt đầu', width: isAdmin ? '24%' : '28%' },
          { key: 'capacity', label: 'Sức chứa', width: isAdmin ? '20%' : '22%' },
          { key: 'status', label: 'Trạng thái', width: isAdmin ? '14%' : '16%' },
          ...(isAdmin ? [{ key: 'actions', label: 'Hành động', width: '14%', align: 'center' }] : []),
        ]}
        loading={loading}
        loadingMessage="Đang tải dữ liệu Ca tập..."
        isEmpty={slots.length === 0 || filteredSlots.length === 0}
        emptyMessage={slots.length === 0 ? 'Chưa có dữ liệu ca tập nào' : 'Không tìm thấy ca tập nào phù hợp với bộ lọc'}
        emptyIcon={slots.length === 0 ? 'bi-inbox' : 'bi-search'}
        emptyAction={
          slots.length > 0 && filteredSlots.length === 0 ? (
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
        {filteredSlots.map((s) => {
          const linkedClass = s.class || classMap[s.class_id]
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
              {isAdmin && (
                <td className="text-center actions-cell">
                  <ActionMenu onEdit={() => handleOpenEdit(s)} onDelete={() => handleOpenDelete(s.id)} />
                </td>
              )}
            </tr>
          )
        })}
      </ManagementTable>


      <ManagementModal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={editingId ? `Cập nhật Ca tập #${editingId}` : 'Thêm mới Ca tập'}
        titleId="slot-modal-title"
        isSubmitting={submitting}
      >
        <form onSubmit={handleSave}>
          <div className="modal-body">
            {formError && (
              <div className="alert alert-danger py-2 small mb-3">
                <i className="bi bi-exclamation-triangle me-1"></i> {formError}
              </div>
            )}
            <div className="mb-3">
              <label htmlFor="slot-class-id" className="form-label small fw-bold">Chọn Lớp học</label>
              <select
                id="slot-class-id"
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
              <label htmlFor="slot-start-time" className="form-label small fw-bold">Thời gian bắt đầu</label>
              <input
                id="slot-start-time"
                type="datetime-local"
                className="form-control"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                required
              />
            </div>
            <div className="row g-2 mb-3">
              <div className="col-md-6">
                <label htmlFor="slot-max-capacity" className="form-label small fw-bold">Sức chứa tối đa</label>
                <input
                  id="slot-max-capacity"
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
                <label htmlFor="slot-current-bookings" className="form-label small fw-bold">Số chỗ đã đặt</label>
                <input
                  id="slot-current-bookings"
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
                Đã hủy ca tập
              </label>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="management-secondary-button" onClick={handleCloseModal} disabled={submitting}>
              Hủy
            </button>
            <button type="submit" className="management-primary-button" disabled={submitting}>
              {submitting ? 'Đang lưu...' : (editingId ? 'Lưu thay đổi' : 'Thêm mới')}
            </button>
          </div>
        </form>
      </ManagementModal>

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Xóa ca tập"
        message={`Ca tập #${deleteConfirm.id} sẽ bị xóa vĩnh viễn khỏi lịch tập. Mọi suất đặt chỗ của hội viên trong ca này sẽ bị hủy bỏ.`}
        confirmText="Xóa ca tập"
        cancelText="Giữ lại"
        variant="danger"
        loading={deleteConfirm.loading}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, id: null, loading: false })}
      />
    </div>
  )
}
