import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '../../context/AuthContext'
import { classesApi, slotsApi, bookingsApi, attendanceApi } from '../../services/api'
import StatusBadge from '../../components/StatusBadge'
import LoadingSpinner from '../../components/LoadingSpinner'
import { formatDateTime } from '../../components/managementUtils'

export default function TrainerDashboard({ onTabChange }) {
  const { user } = useAuth()
  const [classes, setClasses] = useState([])
  const [slots, setSlots] = useState([])
  const [bookings, setBookings] = useState([])
  const [attendance, setAttendance] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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
      setError('Lỗi khi tải dữ liệu Huấn luyện viên')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Filter items assigned to this trainer
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

  const myBookings = useMemo(() => {
    return bookings.filter(
      (b) => mySlotIds.has(Number(b.slot_id)) || Number(b.slot?.class?.trainer_id) === trainerId,
    )
  }, [bookings, mySlotIds, trainerId])

  // Active bookings count
  const confirmedBookingsCount = useMemo(() => {
    return myBookings.filter((b) => b.status === 'confirmed').length
  }, [myBookings])

  // Upcoming slots sorted chronologically
  const upcomingSlots = useMemo(() => {
    return [...mySlots].sort((a, b) => new Date(a.start_time) - new Date(b.start_time)).slice(0, 5)
  }, [mySlots])

  if (loading) {
    return <LoadingSpinner message="Đang tải dữ liệu Huấn luyện viên..." />
  }

  return (
    <div>
      <div className="dashboard-header">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1">
            <h1>Tổng quan Huấn luyện viên</h1>
            <span className="trainer-welcome-badge">
              <i className="bi bi-patch-check-fill"></i> HLV Chính thức
            </span>
          </div>
          <p className="mb-0" style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Chào mừng trở lại, <strong>{user?.email}</strong>. Quản lý lịch dạy, học viên và điểm danh ca tập.
          </p>
        </div>

        <button
          type="button"
          className="refresh-button"
          onClick={loadData}
          disabled={loading}
          title="Làm mới dữ liệu"
        >
          <i className="bi bi-arrow-clockwise"></i>
          <span>Làm mới</span>
        </button>
      </div>

      {error && (
        <div className="dashboard-alert" role="alert">
          <i className="bi bi-exclamation-triangle-fill"></i>
          <span>{error}</span>
        </div>
      )}

      {/* 4 KPI Metric Cards */}
      <div className="kpi-grid">
        <button
          type="button"
          className="kpi-card"
          onClick={() => onTabChange?.('classes')}
          title="Xem danh sách lớp phụ trách"
        >
          <div className="kpi-card-top">
            <span className="kpi-icon">
              <i className="bi bi-calendar-event"></i>
            </span>
          </div>
          <div>
            <div className="kpi-card-value">
              {myClasses.length}
            </div>
            <div className="kpi-card-label">Lớp học phụ trách</div>
          </div>
        </button>

        <button
          type="button"
          className="kpi-card"
          onClick={() => onTabChange?.('schedule')}
          title="Xem lịch dạy và ca tập"
        >
          <div className="kpi-card-top">
            <span className="kpi-icon">
              <i className="bi bi-clock"></i>
            </span>
          </div>
          <div>
            <div className="kpi-card-value">
              {mySlots.length}
            </div>
            <div className="kpi-card-label">Ca tập được phân công</div>
          </div>
        </button>

        <button
          type="button"
          className="kpi-card"
          onClick={() => onTabChange?.('trainees')}
          title="Xem danh sách học viên đăng ký"
        >
          <div className="kpi-card-top">
            <span className="kpi-icon">
              <i className="bi bi-people"></i>
            </span>
          </div>
          <div>
            <div className="kpi-card-value">
              {confirmedBookingsCount}
            </div>
            <div className="kpi-card-label">Lượt học viên đăng ký</div>
          </div>
        </button>

        <button
          type="button"
          className="kpi-card"
          onClick={() => onTabChange?.('attendance')}
          title="Xem nhật ký điểm danh"
        >
          <div className="kpi-card-top">
            <span className="kpi-icon">
              <i className="bi bi-qr-code-scan"></i>
            </span>
          </div>
          <div>
            <div className="kpi-card-value">
              {attendance.length}
            </div>
            <div className="kpi-card-label">Lượt điểm danh toàn viện</div>
          </div>
        </button>
      </div>

      {/* Main Content Sections */}
      <div className="row g-4 mb-4">
        {/* Left Column: Upcoming Schedule */}
        <div className="col-12 col-xl-7">
          <div className="management-card h-100">
            <div className="management-card-header d-flex align-items-center justify-content-between">
              <div>
                <h2 className="management-card-title mb-1" style={{ fontSize: '16px' }}>
                  <i className="bi bi-calendar2-week me-2"></i>
                  Ca tập sắp diễn ra
                </h2>
                <p className="management-card-subtitle mb-0">Các ca giảng dạy được lên lịch của bạn</p>
              </div>
              <button
                type="button"
                className="management-secondary-button"
                style={{ height: '32px', fontSize: '13px', padding: '0 12px' }}
                onClick={() => onTabChange?.('schedule')}
              >
                <span>Xem tất cả</span>
                <i className="bi bi-arrow-right"></i>
              </button>
            </div>

            {upcomingSlots.length === 0 ? (
              <div className="management-empty">
                <i className="bi bi-calendar-x management-empty-icon"></i>
                <p>Hiện bạn chưa có ca tập nào được phân công sắp tới</p>
              </div>
            ) : (
              <div className="management-table-scroll">
                <table className="management-table">
                  <thead>
                    <tr>
                      <th style={{ width: '38%', paddingLeft: '20px' }}>Lớp học & Ca tập</th>
                      <th style={{ width: '32%' }}>Thời gian bắt đầu</th>
                      <th style={{ width: '15%' }}>Sức chứa</th>
                      <th style={{ width: '15%', paddingRight: '20px', textAlign: 'center' }}>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {upcomingSlots.map((slot) => {
                      const linkedClass = myClasses.find((c) => Number(c.id) === Number(slot.class_id)) || slot.class
                      const slotBookings = myBookings.filter(
                        (b) => Number(b.slot_id) === Number(slot.id) && b.status === 'confirmed',
                      )

                      return (
                        <tr key={slot.id}>
                          <td style={{ paddingLeft: '20px' }}>
                            <div className="primary-cell fw-bold">
                              {linkedClass ? linkedClass.name : `Lớp #${slot.class_id}`}
                            </div>
                            <div className="secondary-cell">
                              {linkedClass?.category || 'Chung'} • Ca #{slot.id}
                            </div>
                          </td>
                          <td>
                            <div className="slot-time-pill">
                              <i className="bi bi-clock"></i>
                              <span>{formatDateTime(slot.start_time)}</span>
                            </div>
                          </td>
                          <td>
                            <span
                              className={`slot-capacity-pill ${
                                (slot.current_bookings || slotBookings.length) >= (slot.max_capacity || 20)
                                  ? 'is-full'
                                  : 'is-available'
                              }`}
                            >
                              <i className="bi bi-people-fill me-1"></i>
                              {slot.current_bookings || slotBookings.length} / {slot.max_capacity || 20}
                            </span>
                          </td>
                          <td style={{ paddingRight: '20px', textAlign: 'center' }}>
                            <StatusBadge status={slot.is_cancelled ? 'cancelled' : 'active'} />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Assigned Classes */}
        <div className="col-12 col-xl-5">
          <div className="management-card h-100">
            <div className="management-card-header d-flex align-items-center justify-content-between">
              <div>
                <h2 className="management-card-title mb-1" style={{ fontSize: '16px' }}>
                  <i className="bi bi-collection me-2"></i>
                  Lớp phụ trách chính
                </h2>
                <p className="management-card-subtitle mb-0">Các bộ môn bạn đang đảm nhiệm giảng dạy</p>
              </div>
              <button
                type="button"
                className="management-secondary-button"
                style={{ height: '32px', fontSize: '13px', padding: '0 12px' }}
                onClick={() => onTabChange?.('classes')}
              >
                <span>Chi tiết</span>
                <i className="bi bi-arrow-right"></i>
              </button>
            </div>

            {myClasses.length === 0 ? (
              <div className="management-empty">
                <i className="bi bi-inbox management-empty-icon"></i>
                <p>Bạn chưa được phân công lớp học nào</p>
              </div>
            ) : (
              <div className="p-3 d-flex flex-column gap-3">
                {myClasses.map((cls) => {
                  const classSlots = mySlots.filter((s) => Number(s.class_id) === Number(cls.id))
                  return (
                    <div key={cls.id} className="trainer-card">
                      <div className="trainer-card-header">
                        <div>
                          <h3 className="trainer-class-title">{cls.name}</h3>
                          <span className="trainer-class-category mt-1">
                            <i className="bi bi-tag-fill"></i>
                            {cls.category || 'Thể thao'}
                          </span>
                        </div>
                        <StatusBadge status={cls.is_active ? 'active' : 'inactive'} />
                      </div>
                      <p className="trainer-class-desc">{cls.description || 'Không có mô tả chi tiết'}</p>
                      <div className="trainer-card-stats">
                        <div className="trainer-stat-item">
                          <span className="trainer-stat-label">Tổng ca tập đã mở</span>
                          <span className="trainer-stat-val">{classSlots.length} ca</span>
                        </div>
                        <div className="trainer-stat-item">
                          <span className="trainer-stat-label">Trạng thái dạy</span>
                          <span className="trainer-stat-val" style={{ color: 'var(--color-success)' }}>
                            {cls.is_active ? 'Đang hoạt động' : 'Tạm ngưng'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
