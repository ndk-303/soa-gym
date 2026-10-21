import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { attendanceApi, membersApi } from '../services/api'
import StatusBadge from '../components/StatusBadge'
import { ActionMenu, ManagementHeader, ManagementTable, ManagementFilterBar } from '../components/ManagementUI'
import { formatDateTime, toDatetimeLocalValue, fromDatetimeLocalValue, getNowDatetimeLocalValue } from '../components/managementUtils'
import ConfirmDialog from '../components/ConfirmDialog'

export default function AttendancePage() {
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
    try {
      const payload = {
        member_id: Number(formData.member_id),
        status: formData.status,
        check_in_time: fromDatetimeLocalValue(formData.check_in_time),
        check_out_time: formData.check_out_time ? fromDatetimeLocalValue(formData.check_out_time) : null,
        notes: formData.notes,
      }
      if (editingId) {
        await attendanceApi.update(editingId, payload)
      } else {
        await attendanceApi.create(payload)
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
      fetchData()
    } catch (err) {
      setDeleteConfirm({ isOpen: false, id: null, loading: false })
      setError('Lỗi xóa: ' + (err.response?.data?.detail || err.message))
    }
  }

  const memberMap = useMemo(() => Object.fromEntries(members.map((m) => [m.id, m])), [members])

  const statusOptions = [
    { value: 'all', label: 'Tất cả trạng thái' },
    { value: 'checked_in', label: 'checked_in (Đang trong phòng)' },
    { value: 'checked_out', label: 'checked_out (Đã check-out)' },
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
        description="Theo dõi lượt check-in và check-out của hội viên tại phòng tập"
        onRefresh={fetchData}
        onAdd={isAdmin ? handleOpenAdd : undefined}
        addLabel="Ghi nhận check-in"
        count={records.length}
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
        columns={[
          { key: 'member', label: 'Hội viên', width: isAdmin ? '21%' : '26%' },
          { key: 'checkIn', label: 'Giờ check-in', width: isAdmin ? '21%' : '26%' },
          { key: 'checkOut', label: 'Giờ check-out', width: isAdmin ? '15%' : '18%' },
          { key: 'notes', label: 'Ghi chú', width: isAdmin ? '15%' : '16%' },
          { key: 'status', label: 'Trạng thái', width: isAdmin ? '13%' : '14%' },
          ...(isAdmin ? [{ key: 'actions', label: 'Hành động', width: '190px', align: 'center' }] : []),
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
        minWidth={900}
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
                <td className="text-end">
                  <ActionMenu onEdit={() => handleOpenEdit(r)} onDelete={() => handleOpenDelete(r.id)} />
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
          aria-labelledby="att-modal-title"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.45)' }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header">
                <h5 id="att-modal-title" className="modal-title fw-bold">
                  {editingId ? `Cập nhật Điểm danh #${editingId}` : 'Ghi nhận Điểm danh (Check-in)'}
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
                    <label htmlFor="att-status" className="form-label small fw-bold">Trạng thái</label>
                    <select
                      id="att-status"
                      className="form-select"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      <option value="checked_in">checked_in (Đang trong phòng tập)</option>
                      <option value="checked_out">checked_out (Đã rời phòng tập)</option>
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
                      placeholder="Ghi chú thêm nếu có"
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
        title="Xác nhận xóa bản ghi Điểm danh"
        message={`Bạn có chắc muốn xóa bản ghi Điểm danh #${deleteConfirm.id}? Thao tác này không thể hoàn tác.`}
        confirmText="Xóa bản ghi"
        cancelText="Hủy bỏ"
        variant="danger"
        loading={deleteConfirm.loading}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, id: null, loading: false })}
      />
    </div>
  )
}
