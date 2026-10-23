import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { classesApi, slotsApi, bookingsApi, attendanceApi } from '../../services/api'
import StatusBadge from '../../components/StatusBadge'
import { ManagementHeader, ManagementTable, ManagementFilterBar } from '../../components/ManagementUI'
import { formatDateTime, getNowDatetimeLocalValue, fromDatetimeLocalValue } from '../../components/managementUtils'
import { useToast } from '../../context/ToastContext'

export default function TrainerTraineesPage() {
  const { user } = useAuth()
  const toast = useToast()
  const [classes, setClasses] = useState([])
  const [slots, setSlots] = useState([])
  const [bookings, setBookings] = useState([])
  const [attendance, setAttendance] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [checkingInId, setCheckingInId] = useState(null)

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

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
      setError('Lỗi khi tải danh sách học viên')
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

  // Bookings enrolled in this trainer's slots
  const myBookings = useMemo(() => {
    return bookings.filter(
      (b) => mySlotIds.has(Number(b.slot_id)) || Number(b.slot?.class?.trainer_id) === trainerId,
    )
  }, [bookings, mySlotIds, trainerId])

  const statusOptions = [
    { value: 'all', label: 'Tất cả trạng thái đặt chỗ' },
    { value: 'confirmed', label: 'Đã xác nhận (Confirmed)' },
    { value: 'pending', label: 'Chờ duyệt' },
    { value: 'cancelled', label: 'Đã hủy' },
  ]

  const filteredBookings = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    return myBookings.filter((b) => {
      const member = b.member
      const linkedSlot = mySlots.find((s) => Number(s.id) === Number(b.slot_id)) || b.slot
      const linkedClass = myClasses.find((c) => Number(c.id) === Number(linkedSlot?.class_id)) || linkedSlot?.class

      const matchSearch =
        !q ||
        (member?.full_name && member.full_name.toLowerCase().includes(q)) ||
        (member?.email && member.email.toLowerCase().includes(q)) ||
        (member?.phone && member.phone.includes(q)) ||
        (linkedClass?.name && linkedClass.name.toLowerCase().includes(q)) ||
        String(b.id).includes(q)

      const matchStatus = statusFilter === 'all' || b.status === statusFilter

      return matchSearch && matchStatus
    })
  }, [myBookings, mySlots, myClasses, searchTerm, statusFilter])

  const handleResetFilter = () => {
    setSearchTerm('')
    setStatusFilter('all')
  }

  // Quick Check-in action for a trainee
  const handleQuickCheckIn = async (booking) => {
    setCheckingInId(booking.id)
    try {
      const nowStr = fromDatetimeLocalValue(getNowDatetimeLocalValue())
      const memberName = booking.member?.full_name || `Học viên #${booking.member_id}`
      const slot = booking.slot

      await attendanceApi.create({
        member_id: Number(booking.member_id),
        status: 'checked_in',
        check_in_time: nowStr,
        check_out_time: null,
        notes: `HLV ${user?.email} điểm danh ca #${booking.slot_id} (${slot?.class?.name || 'Lớp học'})`,
      })

      toast.success(`Đã điểm danh thành công cho ${memberName}!`)
      await loadData()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Lỗi khi ghi nhận điểm danh')
    } finally {
      setCheckingInId(null)
    }
  }

  return (
    <div>
      <ManagementHeader
        title="Học viên & Đặt chỗ ca tập"
        subtitle="Danh sách học viên đăng ký tham gia các ca tập thuộc lớp phụ trách của bạn"
        onRefresh={loadData}
        loading={loading}
      />

      {error && (
        <div className="management-error" role="alert">
          <i className="bi bi-exclamation-triangle-fill flex-shrink-0"></i>
          <div>{error}</div>
        </div>
      )}

      <ManagementFilterBar
        searchPlaceholder="Tìm theo tên học viên, email, SĐT, lớp..."
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        filterValue={statusFilter}
        onFilterChange={setStatusFilter}
        filterOptions={statusOptions}
        onReset={handleResetFilter}
        matchCount={filteredBookings.length}
        totalCount={myBookings.length}
      />

      <ManagementTable
        columns={[
          { key: 'member', label: 'Học viên', width: '26%' },
          { key: 'class', label: 'Lớp học & Ca tập', width: '24%' },
          { key: 'time', label: 'Thời gian ca tập', width: '22%' },
          { key: 'status', label: 'Trạng thái đặt chỗ', width: '14%' },
          { key: 'actions', label: 'Điểm danh', width: '14%', align: 'center' },
        ]}
        loading={loading}
        loadingMessage="Đang tải danh sách học viên..."
        isEmpty={myBookings.length === 0 || filteredBookings.length === 0}
        emptyMessage={
          myBookings.length === 0
            ? 'Chưa có học viên nào đặt chỗ vào các ca tập của bạn'
            : 'Không tìm thấy học viên nào phù hợp với bộ lọc'
        }
        emptyIcon={myBookings.length === 0 ? 'bi-people' : 'bi-search'}
        emptyAction={
          myBookings.length > 0 && filteredBookings.length === 0 ? (
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
          const member = b.member
          const linkedSlot = mySlots.find((s) => Number(s.id) === Number(b.slot_id)) || b.slot
          const linkedClass = myClasses.find((c) => Number(c.id) === Number(linkedSlot?.class_id)) || linkedSlot?.class

          // Check if this member has checked in recently
          const isAlreadyCheckedIn = attendance.some(
            (att) => Number(att.member_id) === Number(b.member_id) && att.status === 'checked_in',
          )

          const isChecking = checkingInId === b.id

          return (
            <tr key={b.id}>
              <td>
                <div className="trainee-cell">
                  <span className="trainee-avatar">
                    {member?.full_name ? member.full_name.charAt(0).toUpperCase() : 'H'}
                  </span>
                  <div>
                    <div className="trainee-name">
                      {member?.full_name || `Hội viên #${b.member_id}`}
                    </div>
                    <div className="trainee-email">
                      {member?.phone || member?.email || `Mã HV: #${b.member_id}`}
                    </div>
                  </div>
                </div>
              </td>
              <td>
                <div className="primary-cell fw-bold">
                  {linkedClass ? linkedClass.name : `Lớp #${linkedSlot?.class_id || ''}`}
                </div>
                <div className="secondary-cell">
                  {linkedClass?.category || 'Chung'} • Ca tập #{b.slot_id}
                </div>
              </td>
              <td>
                <div className="slot-time-pill">
                  <i className="bi bi-calendar-event"></i>
                  <span>{linkedSlot?.start_time ? formatDateTime(linkedSlot.start_time) : 'Chưa xếp'}</span>
                </div>
              </td>
              <td>
                <StatusBadge status={b.status} />
              </td>
              <td style={{ textAlign: 'center' }}>
                {isAlreadyCheckedIn ? (
                  <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1">
                    <i className="bi bi-check2-circle me-1"></i> Đã check-in
                  </span>
                ) : (
                  <button
                    type="button"
                    className="management-secondary-button"
                    style={{ height: '30px', fontSize: '12px', padding: '0 10px' }}
                    onClick={() => handleQuickCheckIn(b)}
                    disabled={isChecking || b.status === 'cancelled'}
                    title="Ghi nhận điểm danh có mặt cho học viên"
                  >
                    {isChecking ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                        Đang lưu...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-qr-code-scan"></i>
                        <span>Điểm danh</span>
                      </>
                    )}
                  </button>
                )}
              </td>
            </tr>
          )
        })}
      </ManagementTable>
    </div>
  )
}
