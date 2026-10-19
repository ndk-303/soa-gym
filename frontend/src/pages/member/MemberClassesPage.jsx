import { useState, useEffect, useCallback } from 'react'
import { classesApi, slotsApi, bookingsApi } from '../../services/api'
import LoadingSpinner from '../../components/LoadingSpinner'
import StatusBadge from '../../components/StatusBadge'
import { formatSchedule } from '../../components/managementUtils'

export default function MemberClassesPage({ currentMember }) {
  const [activeTab, setActiveTab] = useState('explore') // 'explore' | 'my-classes'
  const [classes, setClasses] = useState([])
  const [slots, setSlots] = useState([])
  const [myBookings, setMyBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Booking action state
  const [bookingSlotId, setBookingSlotId] = useState(null)
  const [actionSuccess, setActionSuccess] = useState(null)
  const [actionError, setActionError] = useState(null)

  const fetchData = useCallback(async () => {
    if (!currentMember?.id) return
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

      // Filter bookings for current member
      const memberBookings = bookingsData.filter(
        (b) => String(b.member_id) === String(currentMember.id)
      )
      setMyBookings(memberBookings)
    } catch {
      setError('Lỗi khi tải thông tin lớp học')
    } finally {
      setLoading(false)
    }
  }, [currentMember?.id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleBookSlot = async (slotId) => {
    if (!currentMember?.id) return
    setBookingSlotId(slotId)
    setActionError(null)
    setActionSuccess(null)
    try {
      await bookingsApi.create({
        member_id: currentMember.id,
        slot_id: Number(slotId),
        status: 'confirmed',
      })
      setActionSuccess('Đặt chỗ ca tập thành công!')
      await fetchData()
      setTimeout(() => setActionSuccess(null), 3000)
    } catch (err) {
      setActionError(err.response?.data?.detail || err.message || 'Lỗi đặt chỗ ca tập')
      setTimeout(() => setActionError(null), 4000)
    } finally {
      setBookingSlotId(null)
    }
  }

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Bạn có chắc muốn hủy đặt chỗ ca học này?')) return
    setActionError(null)
    setActionSuccess(null)
    try {
      await bookingsApi.delete(bookingId)
      setActionSuccess('Đã hủy đặt chỗ thành công!')
      await fetchData()
      setTimeout(() => setActionSuccess(null), 3000)
    } catch (err) {
      setActionError(err.response?.data?.detail || err.message || 'Lỗi hủy đặt chỗ')
      setTimeout(() => setActionError(null), 4000)
    }
  }

  // Create fast lookup maps
  const classMap = Object.fromEntries(classes.map((c) => [c.id, c]))
  const slotMap = Object.fromEntries(slots.map((s) => [s.id, s]))

  // Set of slot_ids currently booked by this member
  const bookedSlotIds = new Set(myBookings.map((b) => Number(b.slot_id)))

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
        <div className="alert alert-success d-flex align-items-center gap-2 p-3 rounded-3 mb-3 shadow-sm">
          <i className="bi bi-check-circle-fill"></i>
          <div>{actionSuccess}</div>
        </div>
      )}

      {actionError && (
        <div className="alert alert-danger d-flex align-items-center gap-2 p-3 rounded-3 mb-3 shadow-sm">
          <i className="bi bi-exclamation-triangle"></i>
          <div>{actionError}</div>
        </div>
      )}

      {error && (
        <div className="management-error" role="alert">
          <i className="bi bi-exclamation-circle me-2"></i> {error}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="d-flex align-items-center gap-2 border-bottom mb-4 pb-2">
        <button
          type="button"
          className={`btn btn-sm px-3 py-2 fw-bold ${
            activeTab === 'explore' ? 'btn-primary' : 'btn-light text-secondary'
          }`}
          style={{ borderRadius: 'var(--radius-sm, 6px)' }}
          onClick={() => setActiveTab('explore')}
        >
          <i className="bi bi-grid me-2"></i> Khám phá lớp học ({classes.length})
        </button>
        <button
          type="button"
          className={`btn btn-sm px-3 py-2 fw-bold ${
            activeTab === 'my-classes' ? 'btn-primary' : 'btn-light text-secondary'
          }`}
          style={{ borderRadius: 'var(--radius-sm, 6px)' }}
          onClick={() => setActiveTab('my-classes')}
        >
          <i className="bi bi-bookmark-check me-2"></i> Lớp học của tôi ({myBookings.length})
        </button>
      </div>

      {loading ? (
        <LoadingSpinner message="Đang tải danh sách lớp học..." />
      ) : activeTab === 'explore' ? (
        /* Tab 1: Khám phá lớp học dạng Card */
        <div className="row g-4">
          {classes.length === 0 ? (
            <div className="col-12">
              <div className="management-empty">
                <i className="bi bi-calendar-x"></i>
                <p>Hiện chưa có lớp học nào khả dụng</p>
              </div>
            </div>
          ) : (
            classes.map((c) => {
              // Get slots for this class
              const classSlots = slots.filter((s) => Number(s.class_id) === Number(c.id) && !s.is_cancelled)

              return (
                <div key={c.id} className="col-12 col-md-6 col-lg-4">
                  <div
                    className="card h-100 border p-4 shadow-sm"
                    style={{ borderRadius: 'var(--radius-md, 10px)' }}
                  >
                    <div className="d-flex align-items-start justify-content-between mb-2">
                      <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1">
                        {c.category || 'Thể hình'}
                      </span>
                      <span className="small text-muted">
                        <i className="bi bi-person-badge me-1"></i>
                        HLV #{c.trainer_id}
                      </span>
                    </div>

                    <h3 className="h5 fw-bold text-dark mt-2 mb-3">{c.name}</h3>

                    <div className="mt-2 mb-3 flex-grow-1">
                      <div className="small fw-bold text-secondary text-uppercase mb-2" style={{ letterSpacing: '0.04em' }}>
                        Lịch ca tập khả dụng:
                      </div>

                      {classSlots.length === 0 ? (
                        <div className="small text-muted py-2 fst-italic">
                          Chưa có lịch ca tập sắp tới cho lớp này
                        </div>
                      ) : (
                        <div className="d-flex flex-column gap-2">
                          {classSlots.map((s) => {
                            const isBooked = bookedSlotIds.has(Number(s.id))
                            const isFull = s.current_bookings >= s.max_capacity
                            const schedule = formatSchedule(s.start_time)

                            return (
                              <div
                                key={s.id}
                                className="p-2 border rounded-2 bg-light d-flex align-items-center justify-content-between"
                              >
                                <div>
                                  <div className="fw-bold small text-dark">{schedule.time}</div>
                                  <div className="text-muted" style={{ fontSize: '11px' }}>
                                    {schedule.date}
                                  </div>
                                  <div className="text-secondary mt-1" style={{ fontSize: '11px' }}>
                                    Sĩ số: <strong>{s.current_bookings}/{s.max_capacity}</strong> chỗ
                                  </div>
                                </div>

                                <div>
                                  {isBooked ? (
                                    <span className="badge bg-success text-white px-2 py-1">
                                      <i className="bi bi-check2"></i> Đã đặt
                                    </span>
                                  ) : isFull ? (
                                    <span className="badge bg-secondary text-white px-2 py-1">
                                      Hết chỗ
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      className="btn btn-outline-primary btn-sm px-2 py-1 fw-bold"
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
                </div>
              )
            })
          )}
        </div>
      ) : (
        /* Tab 2: Lớp học đã đăng ký của tôi */
        <div>
          {myBookings.length === 0 ? (
            <div className="management-empty">
              <i className="bi bi-bookmark-x"></i>
              <p>Bạn chưa đăng ký lớp học nào</p>
              <button
                type="button"
                className="btn btn-primary btn-sm mt-3 fw-bold px-3 py-2"
                style={{ borderRadius: 'var(--radius-sm)' }}
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
                      <th style={{ width: '12%' }}>Mã đặt chỗ</th>
                      <th style={{ width: '28%' }}>Lớp học</th>
                      <th style={{ width: '25%' }}>Thời gian học</th>
                      <th style={{ width: '18%' }}>Trạng thái</th>
                      <th style={{ width: '17%' }} className="text-end">Hành động</th>
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
                          <td className="text-end">
                            <button
                              type="button"
                              className="btn btn-outline-danger btn-sm py-1 px-2 fw-semibold"
                              style={{ borderRadius: 'var(--radius-sm, 6px)', fontSize: '12px' }}
                              onClick={() => handleCancelBooking(b.id)}
                            >
                              <i className="bi bi-x-circle me-1"></i> Hủy chỗ
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
    </div>
  )
}
