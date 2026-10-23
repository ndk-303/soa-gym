import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { classesApi, slotsApi, bookingsApi, attendanceApi } from '../../services/api'
import StatusBadge from '../../components/StatusBadge'
import { ManagementHeader, ManagementTable, ManagementFilterBar, ManagementModal } from '../../components/ManagementUI'
import { formatDateTime, getNowDatetimeLocalValue, fromDatetimeLocalValue, toDatetimeLocalValue } from '../../components/managementUtils'
import { useToast } from '../../context/ToastContext'

export default function TrainerAttendancePage() {
  const { user } = useAuth()
  const toast = useToast()
  const [classes, setClasses] = useState([])
  const [slots, setSlots] = useState([])
  const [bookings, setBookings] = useState([])
  const [attendance, setAttendance] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Check-in modal
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)
  const [formData, setFormData] = useState({
    member_id: '',
    status: 'checked_in',
    check_in_time: '',
    check_out_time: '',
    notes: '',
  })

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [classesRes, slotsRes, bookingsRes, attendanceRes] = await Promise.allSettled([
        classesApi.getDetailed(),
        slotsApi.getDetailed(),
        bookingsApi.getDetailed(),
        attendanceApi.getDetailed(),
      ])

      if (classesRes.status === 'fulfilled') setClasses(classesRes.value.data || [])
      if (slotsRes.status === 'fulfilled') setSlots(slotsRes.value.data || [])
      if (bookingsRes.status === 'fulfilled') setBookings(bookingsRes.value.data || [])
      if (attendanceRes.status === 'fulfilled') setAttendance(attendanceRes.value.data || [])
    } catch {
      setError('Lỗi khi tải nhật ký điểm danh')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const trainerId = Number(user?.id)

  const myClasses = useMemo(() => {
    return classes.filter((c) => Number(c.trainer_id) === trainerId)
  }, [classes, trainerId])

  const myClassIds = useMemo(() => {
    return new Set(myClasses.map((c) => Number(c.id)))
  }, [myClasses])

  const mySlots = useMemo(() => {
    return slots.filter((s) => myClassIds.has(Number(s.class_id)) || Number(s.class?.trainer_id) === trainerId)
  }, [slots, myClassIds, trainerId])

  const mySlotIds = useMemo(() => {
    return new Set(mySlots.map((s) => Number(s.id)))
  }, [mySlots])

  // Bookings belonging to this trainer
  const myBookings = useMemo(() => {
    return bookings.filter(
      (b) => mySlotIds.has(Number(b.slot_id)) || Number(b.slot?.class?.trainer_id) === trainerId,
    )
  }, [bookings, mySlotIds, trainerId])

  // Unique member IDs of this trainer's trainees
  const myTraineeMemberIds = useMemo(() => {
    return new Set(myBookings.map((b) => Number(b.member_id)))
  }, [myBookings])

  // List of distinct trainees for the check-in modal select dropdown
  const distinctTrainees = useMemo(() => {
    const map = new Map()
    myBookings.forEach((b) => {
      if (b.member && !map.has(b.member_id)) {
        map.set(b.member_id, b.member)
      }
    })
    return Array.from(map.values())
  }, [myBookings])

  // Filter attendance records to those belonging to this trainer's trainees
  const myAttendance = useMemo(() => {
    // If trainer has trainees, filter to them; otherwise if empty, show empty list
    return attendance.filter((a) => myTraineeMemberIds.has(Number(a.member_id)))
  }, [attendance, myTraineeMemberIds])

  const statusOptions = [
    { value: 'all', label: 'Tất cả trạng thái' },
    { value: 'checked_in', label: 'Đang tập (Checked in)' },
    { value: 'checked_out', label: 'Đã hoàn thành (Checked out)' },
  ]

  const filteredAttendance = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    return myAttendance.filter((rec) => {
      const member = rec.member
      const matchSearch =
        !q ||
        (member?.full_name && member.full_name.toLowerCase().includes(q)) ||
        (member?.email && member.email.toLowerCase().includes(q)) ||
        (rec.notes && rec.notes.toLowerCase().includes(q)) ||
        String(rec.id).includes(q)

      const matchStatus = statusFilter === 'all' || rec.status === statusFilter

      return matchSearch && matchStatus
    })
  }, [myAttendance, searchTerm, statusFilter])

  const handleResetFilter = () => {
    setSearchTerm('')
    setStatusFilter('all')
  }

  const handleOpenAdd = () => {
    setFormData({
      member_id: distinctTrainees.length > 0 ? distinctTrainees[0].id : '',
      status: 'checked_in',
      check_in_time: getNowDatetimeLocalValue(),
      check_out_time: '',
      notes: `HLV ${user?.email} ghi nhận điểm danh`,
    })
    setFormError(null)
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError(null)

    if (!formData.member_id) {
      setFormError('Vui lòng chọn học viên điểm danh')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        member_id: Number(formData.member_id),
        status: formData.status,
        check_in_time: fromDatetimeLocalValue(formData.check_in_time),
        check_out_time: formData.check_out_time ? fromDatetimeLocalValue(formData.check_out_time) : null,
        notes: formData.notes,
      }

      await attendanceApi.create(payload)
      toast.success('Ghi nhận điểm danh thành công!')
      setShowModal(false)
      await loadData()
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Lỗi khi lưu thông tin điểm danh')
    } finally {
      setSubmitting(false)
    }
  }

  // Quick check-out action
  const handleCheckOut = async (record) => {
    try {
      const nowStr = fromDatetimeLocalValue(getNowDatetimeLocalValue())
      await attendanceApi.update(record.id, {
        member_id: Number(record.member_id),
        status: 'checked_out',
        check_in_time: record.check_in_time,
        check_out_time: nowStr,
        notes: `${record.notes || ''} [Check-out lúc ${nowStr}]`.trim(),
      })
      toast.success('Đã cập nhật trạng thái kết thúc buổi tập!')
      await loadData()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Lỗi khi check-out')
    }
  }

  return (
    <div>
      <ManagementHeader
        title="Nhật ký & Điểm danh ca tập"
        subtitle="Theo dõi lịch sử hiện diện và xác nhận học viên tham gia các buổi tập của bạn"
        onRefresh={loadData}
        loading={loading}
        onAdd={handleOpenAdd}
        addLabel="Điểm danh học viên"
      />

      {error && (
        <div className="management-error" role="alert">
          <i className="bi bi-exclamation-triangle-fill flex-shrink-0"></i>
          <div>{error}</div>
        </div>
      )}

      <ManagementFilterBar
        searchPlaceholder="Tìm theo tên học viên, email, ghi chú..."
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        filterValue={statusFilter}
        onFilterChange={setStatusFilter}
        filterOptions={statusOptions}
        onReset={handleResetFilter}
        matchCount={filteredAttendance.length}
        totalCount={myAttendance.length}
      />

      <ManagementTable
        columns={[
          { key: 'member', label: 'Học viên', width: '26%' },
          { key: 'check_in', label: 'Thời gian Check-in', width: '22%' },
          { key: 'check_out', label: 'Thời gian Check-out', width: '22%' },
          { key: 'status', label: 'Trạng thái', width: '14%' },
          { key: 'actions', label: 'Thao tác', width: '16%', align: 'center' },
        ]}
        loading={loading}
        loadingMessage="Đang tải nhật ký điểm danh..."
        isEmpty={myAttendance.length === 0 || filteredAttendance.length === 0}
        emptyMessage={
          myAttendance.length === 0
            ? 'Chưa có nhật ký điểm danh nào cho học viên thuộc lớp của bạn'
            : 'Không tìm thấy kết quả phù hợp với bộ lọc'
        }
        emptyIcon={myAttendance.length === 0 ? 'bi-calendar-check' : 'bi-search'}
        emptyAction={
          myAttendance.length > 0 && filteredAttendance.length === 0 ? (
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
        {filteredAttendance.map((rec) => {
          const member = rec.member
          const isCheckedIn = rec.status === 'checked_in'

          return (
            <tr key={rec.id}>
              <td>
                <div className="trainee-cell">
                  <span className="trainee-avatar">
                    {member?.full_name ? member.full_name.charAt(0).toUpperCase() : 'H'}
                  </span>
                  <div>
                    <div className="trainee-name">
                      {member?.full_name || `Hội viên #${rec.member_id}`}
                    </div>
                    <div className="trainee-email">
                      {rec.notes ? rec.notes : `Mã HV: #${rec.member_id}`}
                    </div>
                  </div>
                </div>
              </td>
              <td>
                <div className="slot-time-pill">
                  <i className="bi bi-box-arrow-in-right text-success"></i>
                  <span>{formatDateTime(rec.check_in_time)}</span>
                </div>
              </td>
              <td>
                <div className="slot-time-pill">
                  <i className="bi bi-box-arrow-right text-muted"></i>
                  <span>{rec.check_out_time ? formatDateTime(rec.check_out_time) : 'Đang trong buổi tập'}</span>
                </div>
              </td>
              <td>
                <StatusBadge status={rec.status} />
              </td>
              <td style={{ textAlign: 'center' }}>
                {isCheckedIn ? (
                  <button
                    type="button"
                    className="management-secondary-button"
                    style={{ height: '30px', fontSize: '12px', padding: '0 10px' }}
                    onClick={() => handleCheckOut(rec)}
                    title="Xác nhận kết thúc buổi tập (Check-out)"
                  >
                    <i className="bi bi-check2-circle"></i>
                    <span>Check-out</span>
                  </button>
                ) : (
                  <span className="text-muted small">
                    <i className="bi bi-check-all me-1"></i>Đã xong
                  </span>
                )}
              </td>
            </tr>
          )
        })}
      </ManagementTable>

      {/* Attendance Check-in Modal */}
      {showModal && (
        <ManagementModal
          title="Ghi nhận điểm danh học viên"
          isOpen={showModal}
          onClose={() => setShowModal(false)}
        >
          {formError && (
            <div className="management-error mb-3" role="alert">
              <i className="bi bi-exclamation-triangle-fill flex-shrink-0"></i>
              <div>{formError}</div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label htmlFor="trainer-attendance-member" className="form-label small fw-bold">
                Chọn học viên <span className="text-danger">*</span>
              </label>
              {distinctTrainees.length === 0 ? (
                <div className="p-2 border rounded bg-light text-muted small">
                  Hiện chưa có học viên nào đặt chỗ vào lớp của bạn.
                </div>
              ) : (
                <select
                  id="trainer-attendance-member"
                  className="form-select form-control"
                  value={formData.member_id}
                  onChange={(e) => setFormData({ ...formData, member_id: e.target.value })}
                  required
                >
                  <option value="">-- Chọn học viên --</option>
                  {distinctTrainees.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name} ({m.phone || m.email || `ID #${m.id}`})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="row g-3 mb-3">
              <div className="col-12 col-md-6">
                <label htmlFor="trainer-attendance-status" className="form-label small fw-bold">
                  Trạng thái
                </label>
                <select
                  id="trainer-attendance-status"
                  className="form-select form-control"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="checked_in">Đang tập (Checked in)</option>
                  <option value="checked_out">Đã hoàn thành (Checked out)</option>
                </select>
              </div>

              <div className="col-12 col-md-6">
                <label htmlFor="trainer-attendance-time" className="form-label small fw-bold">
                  Thời gian Check-in
                </label>
                <input
                  id="trainer-attendance-time"
                  type="datetime-local"
                  className="form-control"
                  value={formData.check_in_time}
                  onChange={(e) => setFormData({ ...formData, check_in_time: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="mb-4">
              <label htmlFor="trainer-attendance-notes" className="form-label small fw-bold">
                Ghi chú ca tập
              </label>
              <textarea
                id="trainer-attendance-notes"
                className="form-control"
                rows="2"
                placeholder="Ghi chú về buổi tập, thể trạng của học viên..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              ></textarea>
            </div>

            <div className="d-flex justify-content-end gap-2">
              <button
                type="button"
                className="management-secondary-button"
                onClick={() => setShowModal(false)}
                disabled={submitting}
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                className="management-primary-button"
                disabled={submitting || distinctTrainees.length === 0}
              >
                {submitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <i className="bi bi-check2"></i>
                    Xác nhận điểm danh
                  </>
                )}
              </button>
            </div>
          </form>
        </ManagementModal>
      )}
    </div>
  )
}
