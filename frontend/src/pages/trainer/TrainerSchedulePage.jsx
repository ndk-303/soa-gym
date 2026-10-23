import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { classesApi, slotsApi, bookingsApi } from '../../services/api'
import StatusBadge from '../../components/StatusBadge'
import { ManagementHeader, ManagementTable, ManagementFilterBar, ManagementModal } from '../../components/ManagementUI'
import { formatDateTime } from '../../components/managementUtils'

export default function TrainerSchedulePage() {
  const { user } = useAuth()
  const [slots, setSlots] = useState([])
  const [classes, setClasses] = useState([])
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Selected slot for viewing enrolled trainees modal
  const [selectedSlotForTrainees, setSelectedSlotForTrainees] = useState(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [classesRes, slotsRes, bookingsRes] = await Promise.allSettled([
        classesApi.getDetailed(),
        slotsApi.getDetailed(),
        bookingsApi.getDetailed(),
      ])

      if (classesRes.status === 'fulfilled') setClasses(classesRes.value.data || [])
      if (slotsRes.status === 'fulfilled') setSlots(slotsRes.value.data || [])
      if (bookingsRes.status === 'fulfilled') setBookings(bookingsRes.value.data || [])
    } catch {
      setError('Lỗi khi tải lịch giảng dạy')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const trainerId = Number(user?.id)

  // Map of classes assigned to this trainer
  const myClasses = useMemo(() => {
    return classes.filter((c) => Number(c.trainer_id) === trainerId)
  }, [classes, trainerId])

  const myClassIds = useMemo(() => {
    return new Set(myClasses.map((c) => Number(c.id)))
  }, [myClasses])

  // Filter slots for this trainer
  const mySlots = useMemo(() => {
    return slots.filter((s) => myClassIds.has(Number(s.class_id)) || Number(s.class?.trainer_id) === trainerId)
  }, [slots, myClassIds, trainerId])

  const statusOptions = [
    { value: 'all', label: 'Tất cả trạng thái' },
    { value: 'active', label: 'Đang mở (Hoạt động)' },
    { value: 'cancelled', label: 'Đã hủy' },
  ]

  // Filter slots by search and status
  const filteredSlots = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    return mySlots.filter((slot) => {
      const linkedClass = myClasses.find((c) => Number(c.id) === Number(slot.class_id)) || slot.class
      const matchSearch =
        !q ||
        (linkedClass?.name && linkedClass.name.toLowerCase().includes(q)) ||
        (linkedClass?.category && linkedClass.category.toLowerCase().includes(q)) ||
        String(slot.id).includes(q)

      const isCancelled = Boolean(slot.is_cancelled)
      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && !isCancelled) ||
        (statusFilter === 'cancelled' && isCancelled)

      return matchSearch && matchStatus
    })
  }, [mySlots, myClasses, searchTerm, statusFilter])

  const handleResetFilter = () => {
    setSearchTerm('')
    setStatusFilter('all')
  }

  // Trainees enrolled in the selected slot
  const slotTrainees = useMemo(() => {
    if (!selectedSlotForTrainees) return []
    return bookings.filter(
      (b) => Number(b.slot_id) === Number(selectedSlotForTrainees.id) && b.status === 'confirmed',
    )
  }, [selectedSlotForTrainees, bookings])

  return (
    <div>
      <ManagementHeader
        title="Lịch dạy & Ca tập của tôi"
        subtitle={`Quản lý toàn bộ các ca tập được phân công giảng dạy cho HLV ${user?.email}`}
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
        searchPlaceholder="Tìm theo tên lớp, bộ môn, mã ca..."
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        filterValue={statusFilter}
        onFilterChange={setStatusFilter}
        filterOptions={statusOptions}
        onReset={handleResetFilter}
        matchCount={filteredSlots.length}
        totalCount={mySlots.length}
      />

      <ManagementTable
        columns={[
          { key: 'class', label: 'Lớp học & Bộ môn', width: '34%' },
          { key: 'start_time', label: 'Thời gian ca tập', width: '28%' },
          { key: 'capacity', label: 'Sĩ số / Sức chứa', width: '16%' },
          { key: 'status', label: 'Trạng thái', width: '10%' },
          { key: 'actions', label: 'Hành động', width: '12%', align: 'center' },
        ]}
        loading={loading}
        loadingMessage="Đang tải lịch dạy của bạn..."
        isEmpty={mySlots.length === 0 || filteredSlots.length === 0}
        emptyMessage={
          mySlots.length === 0
            ? 'Bạn chưa được phân công ca tập nào'
            : 'Không tìm thấy ca tập nào phù hợp với bộ lọc'
        }
        emptyIcon={mySlots.length === 0 ? 'bi-calendar-x' : 'bi-search'}
        emptyAction={
          mySlots.length > 0 && filteredSlots.length === 0 ? (
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
        {filteredSlots.map((slot) => {
          const linkedClass = myClasses.find((c) => Number(c.id) === Number(slot.class_id)) || slot.class
          const slotBookings = bookings.filter(
            (b) => Number(b.slot_id) === Number(slot.id) && b.status === 'confirmed',
          )
          const enrolledCount = slot.current_bookings || slotBookings.length
          const maxCapacity = slot.max_capacity || 20

          return (
            <tr key={slot.id}>
              <td>
                <div className="primary-cell fw-bold">
                  {linkedClass ? linkedClass.name : `Lớp #${slot.class_id}`}
                </div>
                <div className="secondary-cell">
                  {linkedClass?.category || 'Chung'} • Ca #{slot.id}
                </div>
              </td>
              <td>
                <div className="slot-time-pill">
                  <i className="bi bi-calendar-event"></i>
                  <span>{formatDateTime(slot.start_time)}</span>
                </div>
              </td>
              <td>
                <span
                  className={`slot-capacity-pill ${
                    enrolledCount >= maxCapacity ? 'is-full' : 'is-available'
                  }`}
                >
                  <i className="bi bi-people-fill me-1"></i>
                  {enrolledCount} / {maxCapacity} chỗ
                </span>
              </td>
              <td>
                <StatusBadge status={slot.is_cancelled ? 'cancelled' : 'active'} />
              </td>
              <td style={{ textAlign: 'center' }}>
                <button
                  type="button"
                  className="management-secondary-button"
                  style={{ height: '30px', fontSize: '12.5px', padding: '0 10px' }}
                  onClick={() => setSelectedSlotForTrainees(slot)}
                  title="Xem danh sách học viên đăng ký ca này"
                >
                  <i className="bi bi-people"></i>
                  <span>Học viên ({enrolledCount})</span>
                </button>
              </td>
            </tr>
          )
        })}
      </ManagementTable>

      {/* Trainees Enrolled in Selected Slot Modal */}
      {selectedSlotForTrainees && (
        <ManagementModal
          title={`Danh sách học viên ca tập #${selectedSlotForTrainees.id}`}
          isOpen={Boolean(selectedSlotForTrainees)}
          onClose={() => setSelectedSlotForTrainees(null)}
          size="lg"
        >
          <div className="p-1">
            <div className="d-flex align-items-center justify-content-between p-3 mb-3 bg-light rounded border">
              <div>
                <div className="fw-bold" style={{ fontSize: '15px' }}>
                  {selectedSlotForTrainees.class?.name || `Ca tập #${selectedSlotForTrainees.id}`}
                </div>
                <div className="text-muted small">
                  <i className="bi bi-clock me-1"></i>
                  {formatDateTime(selectedSlotForTrainees.start_time)} - {formatDateTime(selectedSlotForTrainees.end_time)}
                </div>
              </div>
              <div className="text-end">
                <span className="badge bg-primary text-white">
                  Đã đăng ký: {selectedSlotForTrainees.current_bookings || slotTrainees.length} / {selectedSlotForTrainees.max_capacity || 20} chỗ
                </span>
              </div>
            </div>

            {slotTrainees.length === 0 ? (
              <div className="management-empty py-4">
                <i className="bi bi-inbox management-empty-icon" style={{ fontSize: '24px' }}></i>
                <p>Chưa có học viên nào đặt chỗ cho ca tập này</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th style={{ width: '40%' }}>Hội viên</th>
                      <th style={{ width: '30%' }}>Thông tin liên hệ</th>
                      <th style={{ width: '30%', textAlign: 'center' }}>Trạng thái đặt chỗ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {slotTrainees.map((b) => {
                      const member = b.member
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
                                <div className="trainee-email">Mã HV: #{b.member_id}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="small text-secondary">
                              {member?.email || 'Chưa cập nhật email'}
                            </div>
                            <div className="small text-muted">
                              {member?.phone || 'Chưa cập nhật SĐT'}
                            </div>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <StatusBadge status={b.status} />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="d-flex justify-content-end mt-4">
              <button
                type="button"
                className="management-secondary-button"
                onClick={() => setSelectedSlotForTrainees(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </ManagementModal>
      )}
    </div>
  )
}
