import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { attendanceApi, membersApi } from '../services/api'
import StatusBadge from '../components/StatusBadge'
import { ActionMenu, ManagementHeader, ManagementTable, ManagementFilterBar, ManagementModal } from '../components/ManagementUI'
import { formatDateTime, toDatetimeLocalValue, fromDatetimeLocalValue, getNowDatetimeLocalValue } from '../components/managementUtils'
import ConfirmDialog from '../components/ConfirmDialog'
import { useToast } from '../context/ToastContext'

export default function AttendancePage() {
  const toast = useToast()
  const { isAdmin } = useAuth()
  const [records, setRecords] = useState([])

  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null, loading: false })

  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    member_id: '',
    status: 'checked_in',
    check_in_time: '',
    check_out_time: '',
    notes: '',
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
      const [recordsRes, membersRes] = await Promise.all([
        attendanceApi.getDetailed(),
        membersApi.getAll(),
      ])
      setRecords(recordsRes.data)
      setMembers(membersRes.data)
    } catch (err) {
      setError(err.message || 'Lỗi khi tải nhật ký điểm danh')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenAdd = () => {
    setEditingId(null)
    setFormData({
      member_id: members.length > 0 ? members[0].id : '',
      status: 'checked_in',
      check_in_time: getNowDatetimeLocalValue(),
      check_out_time: '',
      notes: '',
    })
    setFormError(null)
    setShowModal(true)
  }

  const handleOpenEdit = (r) => {
    setEditingId(r.id)
    setFormData({
      member_id: r.member_id,
      status: r.status,
      check_in_time: toDatetimeLocalValue(r.check_in_time),
      check_out_time: toDatetimeLocalValue(r.check_out_time),
      notes: r.notes || '',
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

    if (!formData.member_id) {
      setFormError('Vui lòng chọn hội viên')
      setSubmitting(false)
      return
    }
    if (!formData.check_in_time) {
      setFormError('Vui lòng nhập thời gian check-in')
      setSubmitting(false)
      return
    }
    if (formData.check_out_time && new Date(formData.check_out_time) < new Date(formData.check_in_time)) {
      setFormError('Thời gian check-out không thể trước thời gian check-in')
      setSubmitting(false)
      return
    }

    try {
      const payload = {
        member_id: Number(formData.member_id),
        status: formData.status,
        check_in_time: fromDatetimeLocalValue(formData.check_in_time),
        check_out_time: formData.check_out_time ? fromDatetimeLocalValue(formData.check_out_time) : null,
        notes: formData.notes?.trim() || '',
      }
      if (editingId) {
        await attendanceApi.update(editingId, payload)
        toast.success('Cập nhật bản ghi điểm danh thành công')
      } else {
        await attendanceApi.create(payload)
        toast.success('Ghi nhận điểm danh thành công')
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
      await attendanceApi.delete(deleteConfirm.id)
      setDeleteConfirm({ isOpen: false, id: null, loading: false })
      toast.success('Đã xóa bản ghi điểm danh')
      fetchData()
    } catch (err) {
      setDeleteConfirm({ isOpen: false, id: null, loading: false })
      const errorMsg = 'Lỗi xóa: ' + (err.response?.data?.detail || err.message)
      setError(errorMsg)
      toast.error(errorMsg)
    }
  }

  const memberMap = useMemo(() => Object.fromEntries(members.map((m) => [m.id, m])), [members])

  const statusOptions = [
    { value: 'all', label: 'Tất cả trạng thái' },
    { value: 'checked_in', label: 'Đang trong phòng tập' },
    { value: 'checked_out', label: 'Đã rời phòng' },
  ]

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const q = searchTerm.trim().toLowerCase()
      const member = r.member || memberMap[r.member_id]
      const matchSearch =
        !q ||
        (member?.full_name && member.full_name.toLowerCase().includes(q)) ||
        (member?.email && member.email.toLowerCase().includes(q)) ||
        String(r.id).includes(q) ||
        (r.notes && r.notes.toLowerCase().includes(q))
      const matchStatus = statusFilter === 'all' || r.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [records, searchTerm, statusFilter, memberMap])

  const handleResetFilter = () => {
    setSearchTerm('')
    setStatusFilter('all')
  }

  return (
    <div>
      <ManagementHeader
        title="Điểm danh"
        onRefresh={fetchData}
        onAdd={isAdmin ? handleOpenAdd : undefined}
        addLabel="Ghi nhận check-in"
      />

      {error && (
        <div className="management-error" role="alert">
          <i className="bi bi-exclamation-circle me-2"></i> {error}
        </div>
      )}

      <ManagementFilterBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Tìm theo tên hội viên, email hoặc ghi chú..."
        filterValue={statusFilter}
        onFilterChange={setStatusFilter}
        filterOptions={statusOptions}
        filterLabel="Lọc theo trạng thái điểm danh"
        totalCount={records.length}
        filteredCount={filteredRecords.length}
        onReset={handleResetFilter}
      />

      <ManagementTable
        minWidth={isAdmin ? 740 : 620}
        columns={[
          { key: 'member', label: 'Hội viên', width: isAdmin ? '22%' : '26%' },
          { key: 'checkIn', label: 'Giờ check-in', width: isAdmin ? '18%' : '20%' },
          { key: 'checkOut', label: 'Giờ check-out', width: isAdmin ? '18%' : '20%' },
          { key: 'notes', label: 'Ghi chú', width: isAdmin ? '16%' : '20%' },
          { key: 'status', label: 'Trạng thái', width: isAdmin ? '12%' : '14%' },
          ...(isAdmin ? [{ key: 'actions', label: 'Hành động', width: '14%', align: 'center' }] : []),
        ]}
        loading={loading}
        loadingMessage="Đang tải dữ liệu Điểm danh..."
        isEmpty={records.length === 0 || filteredRecords.length === 0}
        emptyMessage={records.length === 0 ? 'Chưa có dữ liệu điểm danh nào' : 'Không tìm thấy lượt điểm danh nào phù hợp với bộ lọc'}
        emptyIcon={records.length === 0 ? 'bi-inbox' : 'bi-search'}
        emptyAction={
          records.length > 0 && filteredRecords.length === 0 ? (
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
        {filteredRecords.map((r) => {
          const member = r.member || memberMap[r.member_id]
          return (
            <tr key={r.id}>
              <td>
                <div className="primary-cell">{member ? member.full_name : `Hội viên #${r.member_id}`}</div>
                <div className="secondary-cell">Bản ghi #{r.id}{member?.email ? ` · ${member.email}` : ''}</div>
              </td>
              <td className="text-nowrap">{formatDateTime(r.check_in_time)}</td>
              <td className="text-nowrap">{r.check_out_time ? formatDateTime(r.check_out_time) : <span className="table-note">—</span>}</td>
              <td>{r.notes || <span className="table-note">—</span>}</td>
              <td>
                <StatusBadge status={r.status} />
              </td>
              {isAdmin && (
                <td className="text-center actions-cell">
                  <ActionMenu onEdit={() => handleOpenEdit(r)} onDelete={() => handleOpenDelete(r.id)} />
                </td>
              )}
            </tr>
          )
        })}
      </ManagementTable>


      <ManagementModal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={editingId ? `Cập nhật Điểm danh #${editingId}` : 'Ghi nhận Điểm danh (Check-in)'}
        titleId="att-modal-title"
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
              <label htmlFor="att-member-id" className="form-label small fw-bold">Chọn Hội viên</label>
              <select
                id="att-member-id"
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
              <label htmlFor="att-check-in-time" className="form-label small fw-bold">Thời gian Check-in</label>
              <input
                id="att-check-in-time"
                type="datetime-local"
                className="form-control"
                value={formData.check_in_time}
                onChange={(e) => setFormData({ ...formData, check_in_time: e.target.value })}
                required
              />
            </div>

            <div className="mb-3">
              <label htmlFor="att-check-out-time" className="form-label small fw-bold">Thời gian Check-out</label>
              <input
                id="att-check-out-time"
                type="datetime-local"
                className="form-control"
                value={formData.check_out_time}
                onChange={(e) => setFormData({ ...formData, check_out_time: e.target.value })}
              />
            </div>

            <div className="mb-3">
              <label htmlFor="att-status" className="form-label small fw-bold">Trạng thái điểm danh</label>
              <select
                id="att-status"
                className="form-select"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="checked_in">Đang trong phòng tập</option>
                <option value="checked_out">Đã rời phòng tập</option>
              </select>
            </div>

            <div className="mb-2">
              <label htmlFor="att-notes" className="form-label small fw-bold">Ghi chú</label>
              <input
                id="att-notes"
                type="text"
                className="form-control"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Ghi chú thêm nếu có (ví dụ: Huấn luyện viên kèm riêng)"
              />
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
        title="Xóa bản ghi điểm danh"
        message={`Bản ghi điểm danh #${deleteConfirm.id} của hội viên sẽ bị xóa vĩnh viễn khỏi nhật ký ra/vào phòng tập.`}
        confirmText="Xóa bản ghi"
        cancelText="Giữ lại"
        variant="danger"
        loading={deleteConfirm.loading}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, id: null, loading: false })}
      />
    </div>
  )
}
