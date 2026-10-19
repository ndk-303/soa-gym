import { useState, useEffect } from 'react'
import { attendanceApi, membersApi } from '../services/api'
import StatusBadge from '../components/StatusBadge'
import { ActionMenu, ManagementHeader, ManagementTable } from '../components/ManagementUI'
import { formatDateTime } from '../components/managementUtils'

export default function AttendancePage() {
  const [records, setRecords] = useState([])
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    member_id: '',
    status: 'checked_in',
    check_in_time: '2026-10-18 08:30:00',
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
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19)
    setFormData({
      member_id: members.length > 0 ? members[0].id : '',
      status: 'checked_in',
      check_in_time: now,
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
      check_in_time: r.check_in_time,
      check_out_time: r.check_out_time || '',
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
        check_in_time: formData.check_in_time,
        check_out_time: formData.check_out_time ? formData.check_out_time : null,
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

  const handleDelete = async (id) => {
    if (!window.confirm(`Bạn có chắc muốn xóa bản ghi Điểm danh ID #${id}?`)) return
    try {
      await attendanceApi.delete(id)
      fetchData()
    } catch (err) {
      alert('Lỗi xóa: ' + (err.response?.data?.detail || err.message))
    }
  }

  const memberMap = Object.fromEntries(members.map((m) => [m.id, m]))

  return (
    <div>
      <ManagementHeader title="Điểm danh" description="Theo dõi lượt check-in và check-out của hội viên tại phòng tập" onRefresh={fetchData} onAdd={handleOpenAdd} addLabel="Ghi nhận check-in" />

      {error && (
        <div className="management-error" role="alert">
          <i className="bi bi-exclamation-circle me-2"></i> {error}
        </div>
      )}

      <ManagementTable
        columns={[
          { key: 'member', label: 'Hội viên', width: '21%' },
          { key: 'checkIn', label: 'Giờ check-in', width: '21%' },
          { key: 'checkOut', label: 'Giờ check-out', width: '15%' },
          { key: 'notes', label: 'Ghi chú', width: '15%' },
          { key: 'status', label: 'Trạng thái', width: '13%' },
          { key: 'actions', label: 'Hành động', width: '190px', align: 'center' },
        ]}
        loading={loading}
        loadingMessage="Đang tải dữ liệu Điểm danh..."
        isEmpty={records.length === 0}
        emptyMessage="Chưa có dữ liệu điểm danh nào"
        minWidth={900}
      >
                {records.map((r) => {
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
                      <td className="text-end">
                        <ActionMenu onEdit={() => handleOpenEdit(r)} onDelete={() => handleDelete(r.id)} />
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
                  {editingId ? `Cập nhật Điểm danh #${editingId}` : 'Ghi nhận Điểm danh (Check-in)'}
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
                    <label className="form-label small fw-bold">Thời gian Check-in</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.check_in_time}
                      onChange={(e) => setFormData({ ...formData, check_in_time: e.target.value })}
                      required
                      placeholder="YYYY-MM-DD HH:mm:ss"
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-bold">Thời gian Check-out</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.check_out_time}
                      onChange={(e) => setFormData({ ...formData, check_out_time: e.target.value })}
                      placeholder="Để trống nếu chưa check-out"
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-bold">Trạng thái</label>
                    <select
                      className="form-select"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      <option value="checked_in">checked_in (Đang trong phòng tập)</option>
                      <option value="checked_out">checked_out (Đã rời phòng tập)</option>
                    </select>
                  </div>

                  <div className="mb-2">
                    <label className="form-label small fw-bold">Ghi chú</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Ghi chú thêm nếu có"
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
