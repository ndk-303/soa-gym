import { useState, useEffect, useCallback, useMemo } from 'react'
import { classesApi, slotsApi, bookingsApi } from '../../services/api'
import LoadingSpinner from '../../components/LoadingSpinner'
import StatusBadge from '../../components/StatusBadge'
import { formatSchedule } from '../../components/managementUtils'
import ConfirmDialog from '../../components/ConfirmDialog'
import { useToast } from '../../context/ToastContext'

export default function MemberClassesPage({ currentMember }) {
  const toast = useToast()
  const [activeTab, setActiveTab] = useState('explore') // 'explore' | 'my-classes'
  const [classes, setClasses] = useState([])
  const [slots, setSlots] = useState([])
  const [allBookings, setAllBookings] = useState([])
  const [myBookings, setMyBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [searchTerm, setSearchTerm] = useState('')

  // Booking action state
  const [bookingSlotId, setBookingSlotId] = useState(null)
  const [actionSuccess, setActionSuccess] = useState(null)
  const [actionError, setActionError] = useState(null)

  // Cancel confirmation modal state
  const [cancelConfirm, setCancelConfirm] = useState({ isOpen: false, id: null, loading: false })

  const memberId = currentMember?.id

  const fetchData = useCallback(async () => {
    if (!memberId) return
    setLoading(true)
    setError(null)
    try {
      const [classesRes, slotsRes, bookingsRes] = await Promise.allSettled([
        classesApi.getAll(),
        slotsApi.getAll(),
        bookingsApi.getAll(),
      ])

      const classesData = classesRes.status === 'fulfilled' ? classesRes.value.data : []
      const slotsData = slotsRes.status === 'fulfilled' ? slotsRes.value.data : []
      const bookingsData = bookingsRes.status === 'fulfilled' ? bookingsRes.value.data : []

      setClasses(classesData)
      setSlots(slotsData)
      setAllBookings(bookingsData)

      // Filter bookings for current member
      const memberBookings = bookingsData.filter(
        (b) => String(b.member_id) === String(memberId)
      )
      setMyBookings(memberBookings)
    } catch {
      setError('Lỗi khi tải thông tin lớp học')
    } finally {
      setLoading(false)
    }
  }, [memberId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleBookSlot = async (slotId) => {
    if (!memberId) return
    setBookingSlotId(slotId)
    setActionError(null)
    setActionSuccess(null)
    try {
      await bookingsApi.create({
        member_id: memberId,
        slot_id: Number(slotId),
        status: 'confirmed',
      })
      setActionSuccess('Đặt chỗ ca tập thành công!')
      toast.success('Đặt chỗ ca tập thành công!')
      await fetchData()
      setTimeout(() => setActionSuccess(null), 3000)
    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.message || 'Lỗi đặt chỗ ca tập'
      setActionError(errorMsg)
      toast.error(errorMsg)
      setTimeout(() => setActionError(null), 4000)
    } finally {
      setBookingSlotId(null)
    }
  }

  const handleOpenCancel = (bookingId) => {
    setCancelConfirm({ isOpen: true, id: bookingId, loading: false })
  }

  const handleConfirmCancel = async () => {
    if (!cancelConfirm.id) return
    setCancelConfirm((prev) => ({ ...prev, loading: true }))
    setActionError(null)
    setActionSuccess(null)
    try {
      await bookingsApi.delete(cancelConfirm.id)
      setCancelConfirm({ isOpen: false, id: null, loading: false })
      setActionSuccess('Đã hủy đặt chỗ thành công!')
      toast.success('Đã hủy đặt chỗ thành công!')
      await fetchData()
      setTimeout(() => setActionSuccess(null), 3000)
    } catch (err) {
      setCancelConfirm({ isOpen: false, id: null, loading: false })
      const errorMsg = err.response?.data?.detail || err.message || 'Lỗi hủy đặt chỗ'
      setActionError(errorMsg)
      toast.error(errorMsg)
      setTimeout(() => setActionError(null), 4000)
    }
  }

  // Create fast lookup maps
  const classMap = Object.fromEntries(classes.map((c) => [c.id, c]))
  const slotMap = Object.fromEntries(slots.map((s) => [s.id, s]))

  // Set of slot_ids currently booked by this member
  const bookedSlotIds = new Set(myBookings.map((b) => Number(b.slot_id)))

  // The booking service is the source of truth for occupied seats. The
  // denormalized current_bookings value on a slot may be stale after a
  // booking is created or cancelled.
  const bookingCountBySlot = allBookings.reduce((counts, booking) => {
    if (booking.status !== 'cancelled') {
      const slotId = Number(booking.slot_id)
      counts[slotId] = (counts[slotId] || 0) + 1
    }
    return counts
  }, {})

  const filteredClasses = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    if (!q) return classes
    return classes.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.category && c.category.toLowerCase().includes(q))
    )
  }, [classes, searchTerm])

  return (
    <div className="member-classes-page">
      <div className="management-header">
        <div>
          <h1>Lớp học & Ca tập</h1>
          <p>Khám phá các bộ môn thể hình, yoga, cardio và quản lý các ca tập bạn đã đăng ký</p>
        </div>
        <button className="management-secondary-button" type="button" onClick={fetchData}>
          <i className="bi bi-arrow-clockwise"></i> Làm mới
        </button>
      </div>

      {actionSuccess && (
        <div className="management-error" style={{ background: 'var(--color-success-bg)', borderColor: 'var(--color-success-border)', color: 'var(--color-success)' }}>
          <i className="bi bi-check-circle-fill"></i>
          <div>{actionSuccess}</div>
        </div>
      )}

      {actionError && (
        <div className="management-error">
          <i className="bi bi-exclamation-triangle"></i>
          <div>{actionError}</div>
        </div>
      )}

      {error && (
        <div className="management-error" role="alert">
          <i className="bi bi-exclamation-circle"></i>
          <span>{error}</span>
        </div>
      )}

      {/* Synchronized Navigation Tabs */}
      <div className="member-tabs-nav">
        <button
          type="button"
          className={`member-tab-btn ${activeTab === 'explore' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('explore')}
        >
          <i className="bi bi-grid"></i>
          <span>Khám phá lớp học ({classes.length})</span>
        </button>
        <button
          type="button"
          className={`member-tab-btn ${activeTab === 'my-classes' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('my-classes')}
        >
          <i className="bi bi-bookmark-check"></i>
          <span>Lớp học của tôi ({myBookings.length})</span>
        </button>
      </div>

      {loading ? (
        <LoadingSpinner message="Đang tải danh sách lớp học..." />
      ) : activeTab === 'explore' ? (
        /* Tab 1: Khám phá lớp học dạng Card */
        <>
          {classes.length > 0 && (
            <div className="management-filter-bar mb-3">
              <div className="management-filter-inputs">
                <div className="management-search-wrapper" style={{ maxWidth: 360 }}>
                  <i className="bi bi-search management-search-icon" aria-hidden="true"></i>
                  <input
                    type="search"
                    className="management-search-input"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Tìm kiếm lớp học hoặc bộ môn..."
                    aria-label="Tìm kiếm lớp học hoặc bộ môn"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      className="management-search-clear"
                      onClick={() => setSearchTerm('')}
                      aria-label="Xóa từ khóa tìm kiếm"
                    >
                      <i className="bi bi-x"></i>
                    </button>
                  )}
                </div>
              </div>
              <div className="management-filter-summary">
                {searchTerm.trim() ? (
                  <>
                    <span className="management-filter-count">
                      Hiển thị <strong>{filteredClasses.length}</strong> / {classes.length} lớp học
                    </span>
                    <button
                      type="button"
                      className="management-reset-button"
                      onClick={() => setSearchTerm('')}
                    >
                      <i className="bi bi-arrow-counterclockwise"></i> Đặt lại
                    </button>
                  </>
                ) : (
                  <span className="management-filter-count is-muted">
                    Tổng cộng: <strong>{classes.length}</strong> lớp học
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="member-cards-grid">
            {classes.length === 0 ? (
              <div style={{ gridColumn: '1 / -1' }}>
                <div className="management-empty">
                  <i className="bi bi-calendar-x"></i>
                  <p>Hiện chưa có lớp học nào khả dụng</p>
                </div>
              </div>
            ) : filteredClasses.length === 0 ? (
              <div style={{ gridColumn: '1 / -1' }}>
                <div className="management-empty">
                  <i className="bi bi-search"></i>
                  <p>Không tìm thấy lớp học nào phù hợp với &quot;{searchTerm}&quot;</p>
                  <button
                    type="button"
                    className="management-secondary-button mt-3"
                    onClick={() => setSearchTerm('')}
                  >
                    <i className="bi bi-arrow-counterclockwise"></i> Xem tất cả lớp học
                  </button>
                </div>
              </div>
            ) : (
              filteredClasses.map((c) => {
              // Get slots for this class
              const classSlots = slots.filter((s) => Number(s.class_id) === Number(c.id) && !s.is_cancelled)

              return (
                <div key={c.id} className="member-class-card">
                  <div>
                    <div className="d-flex align-items-center justify-content-between mb-3">
                      <span className="semantic-badge is-success">
                        {c.category || 'Thể hình'}
                      </span>
                      <span className="technical-id">
                        <i className="bi bi-person-badge me-1"></i>
                        HLV #{c.trainer_id}
                      </span>
                    </div>

                    <h2 className="member-plan-title mb-3">{c.name}</h2>

                    <div className="fw-semibold text-secondary mb-2" style={{ fontSize: '14px' }}>
                      Lịch ca tập sắp tới:
                    </div>

                    {classSlots.length === 0 ? (
                      <div className="table-note py-3 fst-italic">
                        Chưa có lịch ca tập sắp tới cho lớp này
                      </div>
                    ) : (
                      <div className="d-flex flex-column gap-2 mb-3">
                        {classSlots.map((s) => {
                          const isBooked = bookedSlotIds.has(Number(s.id))
                          const currentBookings = bookingCountBySlot[Number(s.id)] || 0
                          const isFull = currentBookings >= s.max_capacity
                          const schedule = formatSchedule(s.start_time)
                          const capacityPct = Math.min(100, Math.round((currentBookings / (s.max_capacity || 1)) * 100))

                          return (
                            <div key={s.id} className="member-slot-item">
                              <div>
                                <div className="member-slot-time">{schedule.time}</div>
                                <div className="member-slot-date">{schedule.date}</div>
                                <div className="capacity-bar" style={{ width: '120px', marginTop: '6px' }}>
                                  <span style={{ width: `${capacityPct}%` }}></span>
                                </div>
                                <div className="capacity-label" style={{ fontSize: '11px', marginTop: '4px' }}>
                                  <span>Chỗ: <strong>{currentBookings}/{s.max_capacity}</strong></span>
                                </div>
                              </div>

                              <div>
                                {isBooked ? (
                                  <span className="semantic-badge is-success">
                                    <i className="bi bi-check2 me-1"></i> Đã đặt
                                  </span>
                                ) : isFull ? (
                                  <span className="semantic-badge is-danger">
                                    Hết chỗ
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    className="management-primary-button"
                                    style={{ minHeight: '32px', padding: '6px 12px', fontSize: '12px' }}
                                    disabled={bookingSlotId === s.id}
                                    onClick={() => handleBookSlot(s.id)}
                                  >
                                    {bookingSlotId === s.id ? 'Đang đặt...' : 'Đặt chỗ'}
                                  </button>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
        </>
      ) : (
        /* Tab 2: Lớp học đã đăng ký của tôi */
        <div>
          {myBookings.length === 0 ? (
            <div className="management-empty">
              <i className="bi bi-bookmark-x"></i>
              <p>Bạn chưa đăng ký lớp học nào</p>
              <button
                type="button"
                className="management-primary-button mt-3"
                onClick={() => setActiveTab('explore')}
              >
                Khám phá và đặt lớp ngay
              </button>
            </div>
          ) : (
            <div className="management-table-shell">
              <div className="management-table-scroll">
                <table className="management-table">
                  <thead>
                    <tr>
                      <th style={{ width: '14%' }}>Mã đặt chỗ</th>
                      <th style={{ width: '30%' }}>Lớp học</th>
                      <th style={{ width: '24%' }}>Thời gian học</th>
                      <th style={{ width: '16%' }}>Trạng thái</th>
                      <th style={{ width: '16%' }} className="text-center">Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myBookings.map((b) => {
                      const linkedSlot = slotMap[b.slot_id]
                      const linkedClass = linkedSlot ? classMap[linkedSlot.class_id] : null
                      const schedule = formatSchedule(linkedSlot?.start_time)

                      return (
                        <tr key={b.id}>
                          <td>
                            <span className="technical-id">#BK-{b.id}</span>
                          </td>
                          <td>
                            <div className="primary-cell">
                              {linkedClass ? linkedClass.name : `Lớp #${b.slot_id}`}
                            </div>
                            <div className="secondary-cell">
                              {linkedClass?.category || 'Thể thao & Thể hình'}
                            </div>
                          </td>
                          <td>
                            <div className="schedule-time">{schedule.time}</div>
                            <div className="schedule-date">{schedule.date}</div>
                          </td>
                          <td>
                            <StatusBadge status={b.status} />
                          </td>
                          <td className="text-center actions-cell">
                            <button
                              type="button"
                              className="row-action-button is-danger"
                              onClick={() => handleOpenCancel(b.id)}
                            >
                              <i className="bi bi-trash3"></i>
                              <span>Hủy chỗ</span>
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        isOpen={cancelConfirm.isOpen}
        title="Hủy đặt chỗ ca tập"
        message="Suất tập của bạn sẽ được giải phóng ngay lập tức cho các hội viên khác trong danh sách chờ."
        confirmText="Hủy đặt chỗ"
        cancelText="Giữ lại lịch tập"
        variant="danger"
        loading={cancelConfirm.loading}
        onConfirm={handleConfirmCancel}
        onCancel={() => setCancelConfirm({ isOpen: false, id: null, loading: false })}
      />
    </div>
  )
}
