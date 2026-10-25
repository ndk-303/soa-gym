import { useState, useEffect, useCallback, useMemo } from 'react'
import { plansApi, attendanceApi, invoicesApi } from '../../services/api'
import StatusBadge from '../../components/StatusBadge'
import AttendanceCalendar from './AttendanceCalendar'
import { formatVnd } from '../../components/managementUtils'
import { ManagementModal } from '../../components/ManagementUI'
import { useToast } from '../../context/ToastContext'

function getNowFormatted() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

export default function MemberDashboard({ onTabChange, currentMember, memberLoading, onMemberRefresh }) {
  const toast = useToast()
  const [plans, setPlans] = useState([])
  const [attendanceRecords, setAttendanceRecords] = useState([])
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Check-in modal state
  const [showCheckInModal, setShowCheckInModal] = useState(false)
  const [checkInNotes, setCheckInNotes] = useState('')
  const [checkInSubmitting, setCheckInSubmitting] = useState(false)
  const [checkInError, setCheckInError] = useState(null)

  // Check-out modal state
  const [showCheckOutModal, setShowCheckOutModal] = useState(false)
  const [checkOutSubmitting, setCheckOutSubmitting] = useState(false)
  const [checkOutError, setCheckOutError] = useState(null)

  const memberId = currentMember?.id

  const loadData = useCallback(async () => {
    if (!memberId) return
    setLoading(true)
    setError(null)
    try {
      const [plansRes, attendanceRes, invoicesRes] = await Promise.allSettled([
        plansApi.getAll(),
        attendanceApi.getAll(),
        invoicesApi.getAll(),
      ])

      if (plansRes.status === 'fulfilled') {
        setPlans(plansRes.value.data || [])
      }

      if (attendanceRes.status === 'fulfilled') {
        const allAtt = attendanceRes.value.data || []
        // Filter attendance for current member
        const memberAtt = allAtt.filter((a) => String(a.member_id) === String(memberId))
        setAttendanceRecords(memberAtt)
      }

      if (invoicesRes.status === 'fulfilled') {
        const allInv = invoicesRes.value.data || []
        const memberInv = allInv.filter((inv) => String(inv.member_id) === String(memberId))
        setInvoices(memberInv)
      }
    } catch {
      setError('Lỗi khi tải thông tin hội viên')
    } finally {
      setLoading(false)
    }
  }, [memberId])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Resolve current plan
  const currentPlan = useMemo(() => {
    return plans.find((p) => Number(p.id) === Number(currentMember?.membership_plan_id))
  }, [plans, currentMember?.membership_plan_id])

  // Find latest paid invoice for plan duration calculation
  const latestPaidInvoice = useMemo(() => {
    return invoices
      .filter((inv) => inv.status === 'paid')
      .sort((a, b) => b.id - a.id)[0]
  }, [invoices])

  // Calculate activation & expiration dates
  const planTimeline = useMemo(() => {
    let activationDate = new Date()
    if (latestPaidInvoice?.created_at) {
      const parsed = new Date(latestPaidInvoice.created_at)
      if (!Number.isNaN(parsed.getTime())) {
        activationDate = parsed
      }
    }

    const durationDays = currentPlan?.duration_days || 30
    const expirationDate = new Date(activationDate.getTime() + durationDays * 24 * 60 * 60 * 1000)

    const now = new Date()
    const diffTime = expirationDate.getTime() - now.getTime()
    const remainingDays = currentPlan
      ? Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))
      : 0

    return {
      activationDate,
      expirationDate,
      remainingDays,
    }
  }, [latestPaidInvoice, currentPlan])

  const formatDisplayDate = (d) => {
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d)
  }

  // Count unique days attended
  const uniqueAttendanceDays = useMemo(() => {
    return new Set(
      attendanceRecords
        .map((a) => a.check_in_time?.split(' ')[0]?.split('T')[0])
        .filter(Boolean)
    ).size
  }, [attendanceRecords])

  // Identify if member has an ongoing session (checked_in and check_out_time is null)
  const activeSession = useMemo(() => {
    return attendanceRecords.find(
      (r) => r.status === 'checked_in' && !r.check_out_time
    )
  }, [attendanceRecords])

  const isPendingWarning = planTimeline.remainingDays > 0 && planTimeline.remainingDays <= 7

  // ==================== Check-in Handlers ====================
  const handleOpenCheckIn = () => {
    if (!currentPlan) {
      toast.error('Hội viên chưa có gói tập. Vui lòng đăng ký gói tập trước khi check-in!')
      return
    }
    if (currentMember?.status !== 'active') {
      toast.error('Tài khoản không tồn tại hoặc không hoạt động')
      return
    }
    if (planTimeline.remainingDays <= 0) {
      toast.error('Gói tập đã hết hạn. Vui lòng gia hạn gói tập!')
      return
    }
    setCheckInNotes('')
    setCheckInError(null)
    setShowCheckInModal(true)
  }

  const handleCloseCheckInModal = useCallback(() => {
    if (!checkInSubmitting) {
      setShowCheckInModal(false)
    }
  }, [checkInSubmitting])

  const handleConfirmCheckIn = async (e) => {
    e?.preventDefault()
    if (!memberId) return
    setCheckInSubmitting(true)
    setCheckInError(null)
    try {
      await attendanceApi.create({
        member_id: memberId,
        status: 'checked_in',
        check_in_time: getNowFormatted(),
        check_out_time: null,
        notes: checkInNotes.trim(),
      })
      toast.success('Check-in vào phòng gym thành công! Chúc bạn có buổi tập hiệu quả!')
      setShowCheckInModal(false)
      setCheckInNotes('')
      loadData()
      onMemberRefresh?.()
    } catch (err) {
      const msg = err.response?.data?.detail || 'Không thể thực hiện check-in lúc này'
      setCheckInError(msg)
      toast.error(msg)
    } finally {
      setCheckInSubmitting(false)
    }
  }

  // ==================== Check-out Handlers ====================
  const handleOpenCheckOut = () => {
    if (!activeSession) return
    setCheckOutError(null)
    setShowCheckOutModal(true)
  }

  const handleCloseCheckOutModal = useCallback(() => {
    if (!checkOutSubmitting) {
      setShowCheckOutModal(false)
    }
  }, [checkOutSubmitting])

  const handleConfirmCheckOut = async () => {
    if (!activeSession) return
    setCheckOutSubmitting(true)
    setCheckOutError(null)
    try {
      await attendanceApi.update(activeSession.id, {
        member_id: activeSession.member_id,
        status: 'checked_out',
        check_in_time: activeSession.check_in_time,
        check_out_time: getNowFormatted(),
        notes: activeSession.notes || '',
      })
      toast.success('Check-out thành công! Cảm ơn bạn và hẹn gặp lại ở buổi tập sau!')
      setShowCheckOutModal(false)
      loadData()
      onMemberRefresh?.()
    } catch (err) {
      const msg = err.response?.data?.detail || 'Không thể thực hiện check-out lúc này'
      setCheckOutError(msg)
      toast.error(msg)
    } finally {
      setCheckOutSubmitting(false)
    }
  }

  return (
    <div className="member-dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Xin chào, {currentMember?.full_name || 'Hội viên'}!</h1>
          <p>Bảng điều khiển cá nhân: Thông tin gói tập, thời hạn và lịch trình tập luyện</p>
        </div>
        <div className="d-flex align-items-center gap-2">
          {/* Action button: Chỉ hiển thị nút Check-in khi chưa vào phiên tập */}
          {!activeSession && (
            <button
              type="button"
              className="management-primary-button"
              onClick={handleOpenCheckIn}
              disabled={loading || memberLoading || !currentPlan}
              title={!currentPlan ? 'Vui lòng đăng ký gói tập để check-in' : 'Điểm danh vào phòng tập'}
            >
              <i className="bi bi-geo-alt-fill"></i>
              Check-in phòng tập
            </button>
          )}

          <button
            className="refresh-button"
            type="button"
            onClick={() => {
              onMemberRefresh?.()
              loadData()
            }}
            disabled={loading || memberLoading}
          >
            <i className={`bi ${loading ? 'bi-arrow-repeat spin' : 'bi-arrow-clockwise'}`}></i>
            Làm mới
          </button>
        </div>
      </div>

      {error && (
        <div className="dashboard-alert" role="alert">
          <i className="bi bi-exclamation-triangle"></i>
          <div>{error}</div>
        </div>
      )}

      {/* Active Session Status Banner */}
      {activeSession && (
        <div className="checkin-session-banner">
          <div className="d-flex align-items-center gap-3">
            <div className="checkin-pulse-wrapper">
              <span className="checkin-pulse-dot"></span>
            </div>
            <div>
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <strong style={{ color: '#059669', fontSize: '15px' }}>
                  Bạn đang trong phiên tập luyện tại phòng gym
                </strong>
                <span className="badge bg-success-subtle text-success border border-success-subtle py-1 px-2">
                  Đang hoạt động
                </span>
              </div>
              <div className="text-secondary small mt-1">
                <i className="bi bi-clock me-1"></i>
                Giờ check-in: <strong>{activeSession.check_in_time}</strong>
                {activeSession.notes && (
                  <span className="ms-3 text-muted">
                    <i className="bi bi-chat-left-text me-1"></i>
                    Ghi chú: {activeSession.notes}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div>
            <button
              type="button"
              className="management-danger-button"
              onClick={handleOpenCheckOut}
              disabled={loading || memberLoading}
              title="Kết thúc ca tập và check-out khỏi phòng tập"
            >
              <i className="bi bi-box-arrow-right"></i>
              Check-out
            </button>
          </div>
        </div>
      )}

      {/* No Plan Alert Banner */}
      {!currentPlan && !loading && (
        <div className="member-banner">
          <div className="member-banner-content">
            <span className="member-banner-icon">
              <i className="bi bi-info-circle-fill"></i>
            </span>
            <div>
              <div className="member-banner-title">Bạn chưa đăng ký gói tập nào</div>
              <div className="member-banner-text">Hãy đăng ký một gói tập để bắt đầu sử dụng phòng tập và tham gia các lớp học.</div>
            </div>
          </div>
          <button
            type="button"
            className="management-primary-button"
            onClick={() => onTabChange('plans')}
          >
            Đăng ký gói tập <i className="bi bi-arrow-right ms-1"></i>
          </button>
        </div>
      )}

      {/* 4 Metric Cards */}
      <div className="kpi-grid">
        {/* Card 1: Gói tập hiện tại */}
        <button
          type="button"
          className="kpi-card text-start"
          onClick={() => onTabChange('plans')}
        >
          <div className="kpi-card-top">
            <span className="kpi-icon"><i className="bi bi-card-checklist"></i></span>
          </div>
          <div>
            <div className="kpi-card-value">
              {currentPlan ? currentPlan.name : 'Chưa có gói'}
            </div>
            <div className="kpi-card-label d-flex align-items-center justify-content-between mt-2">
              <span>{currentPlan ? formatVnd(currentPlan.price) : '0 ₫'}</span>
              <StatusBadge status={currentMember?.status || (currentPlan ? 'active' : 'inactive')} />
            </div>
          </div>
        </button>

        {/* Card 2: Số ngày đã tập */}
        <div className="kpi-card">
          <div className="kpi-card-top">
            <span className="kpi-icon"><i className="bi bi-check2-all"></i></span>
          </div>
          <div>
            <div className="kpi-card-value">
              {loading ? <span className="kpi-skeleton"></span> : `${uniqueAttendanceDays} ngày`}
            </div>
            <div className="kpi-card-label">
              Đã check-in ({attendanceRecords.length} lượt tập)
            </div>
          </div>
        </div>

        {/* Card 3: Số ngày còn lại */}
        <div className="kpi-card">
          <div className="kpi-card-top">
            <span className="kpi-icon"><i className="bi bi-hourglass-split"></i></span>
          </div>
          <div>
            <div className="kpi-card-value">
              {loading ? (
                <span className="kpi-skeleton"></span>
              ) : currentPlan ? (
                `${planTimeline.remainingDays} ngày`
              ) : (
                '0 ngày'
              )}
            </div>
            <div className="kpi-card-label">
              {currentPlan ? (isPendingWarning ? 'Sắp hết hạn gói tập' : 'Thời hạn còn lại') : 'Chưa kích hoạt gói'}
            </div>
          </div>
        </div>

        {/* Card 4: Ngày hết hạn */}
        <div className="kpi-card">
          <div className="kpi-card-top">
            <span className="kpi-icon"><i className="bi bi-calendar-event"></i></span>
          </div>
          <div>
            <div className="kpi-card-value">
              {loading ? (
                <span className="kpi-skeleton"></span>
              ) : currentPlan ? (
                formatDisplayDate(planTimeline.expirationDate)
              ) : (
                '—'
              )}
            </div>
            <div className="kpi-card-label">
              {currentPlan ? `Kích hoạt từ: ${formatDisplayDate(planTimeline.activationDate)}` : 'Chưa có thông tin'}
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Calendar Section */}
      <div className="mt-4">
        <AttendanceCalendar checkInRecords={attendanceRecords} />
      </div>

      {/* ==================== Modal Check-in ==================== */}
      <ManagementModal
        isOpen={showCheckInModal}
        onClose={handleCloseCheckInModal}
        title="Check-in vào phòng gym"
        isSubmitting={checkInSubmitting}
      >
        <form onSubmit={handleConfirmCheckIn}>
          <div className="modal-body p-4">
            {checkInError && (
              <div className="management-error mb-3" role="alert">
                <i className="bi bi-exclamation-triangle"></i>
                <div>{checkInError}</div>
              </div>
            )}

            {/* Member & Plan Info Summary */}
            <div
              className="p-3 mb-3 rounded-3"
              style={{
                background: 'var(--surface-hover, #f8fafc)',
                border: '1px solid var(--border-color, #e2e8f0)',
              }}
            >
              <div className="row g-2">
                <div className="col-6">
                  <span className="text-muted small">Hội viên:</span>
                  <div className="fw-semibold">{currentMember?.full_name}</div>
                </div>
                <div className="col-6">
                  <span className="text-muted small">Gói tập:</span>
                  <div className="fw-semibold text-primary">{currentPlan?.name}</div>
                </div>
                <div className="col-6">
                  <span className="text-muted small">Trạng thái:</span>
                  <div>
                    <StatusBadge status={currentMember?.status || 'active'} />
                  </div>
                </div>
                <div className="col-6">
                  <span className="text-muted small">Thời hạn còn lại:</span>
                  <div className="fw-semibold text-success">{planTimeline.remainingDays} ngày</div>
                </div>
              </div>
            </div>

            {/* Ghi chú buổi tập: Khối hàng riêng biệt, rộng rãi */}
            <div className="mb-2">
              <label htmlFor="checkin-notes" className="form-label fw-bold small text-dark d-block mb-2">
                Ghi chú buổi tập <span className="text-muted fw-normal">(Tùy chọn, tối đa 255 ký tự)</span>
              </label>
              <textarea
                id="checkin-notes"
                className="form-control"
                rows={4}
                maxLength={255}
                placeholder="Ví dụ: Tập Cardio + Lưng xô, tập cùng HLV..."
                value={checkInNotes}
                onChange={(e) => setCheckInNotes(e.target.value)}
                style={{
                  width: '100%',
                  minHeight: '100px',
                  resize: 'vertical',
                  fontSize: '14px',
                  lineHeight: '1.5',
                  borderRadius: '8px',
                }}
              />
              <div className="d-flex justify-content-between align-items-center mt-1">
                <span className="text-muted small">Mục tiêu, bài tập hoặc thể trạng hôm nay</span>
                <span className="text-muted small">{checkInNotes.length}/255 ký tự</span>
              </div>
            </div>
          </div>

          <div className="modal-footer px-4 py-3 border-top d-flex justify-content-end gap-2">
            <button
              type="button"
              className="management-secondary-button"
              onClick={handleCloseCheckInModal}
              disabled={checkInSubmitting}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="management-primary-button"
              disabled={checkInSubmitting}
            >
              {checkInSubmitting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  <i className="bi bi-box-arrow-in-right me-1"></i>
                  Xác nhận Check-in
                </>
              )}
            </button>
          </div>
        </form>
      </ManagementModal>

      {/* ==================== Modal Check-out ==================== */}
      <ManagementModal
        isOpen={showCheckOutModal}
        onClose={handleCloseCheckOutModal}
        title="Xác nhận Check-out khỏi phòng gym"
        isSubmitting={checkOutSubmitting}
      >
        <div className="modal-body p-4">
          {checkOutError && (
            <div className="management-error mb-3" role="alert">
              <i className="bi bi-exclamation-triangle"></i>
              <div>{checkOutError}</div>
            </div>
          )}

          <div
            className="p-3 mb-3 rounded-3"
            style={{
              background: 'var(--surface-hover, #f8fafc)',
              border: '1px solid var(--border-color, #e2e8f0)',
            }}
          >
            <div className="mb-2">
              <span className="text-muted small">Thời gian bắt đầu check-in:</span>
              <div className="fw-semibold text-primary">{activeSession?.check_in_time}</div>
            </div>
            {activeSession?.notes && (
              <div>
                <span className="text-muted small">Ghi chú đã lưu:</span>
                <div>{activeSession.notes}</div>
              </div>
            )}
          </div>

          <p className="mb-0 text-secondary">
            Bạn có chắc chắn muốn kết thúc buổi tập hôm nay và thực hiện check-out không?
          </p>
        </div>

        <div className="modal-footer px-4 py-3 border-top d-flex justify-content-end gap-2">
          <button
            type="button"
            className="management-secondary-button"
            onClick={handleCloseCheckOutModal}
            disabled={checkOutSubmitting}
          >
            Hủy
          </button>
          <button
            type="button"
            className="management-danger-button"
            onClick={handleConfirmCheckOut}
            disabled={checkOutSubmitting}
          >
            {checkOutSubmitting ? (
              <>
                <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true" />
                Đang check-out...
              </>
            ) : (
              <>
                <i className="bi bi-box-arrow-right me-1"></i>
                Xác nhận Check-out
              </>
            )}
          </button>
        </div>
      </ManagementModal>
    </div>
  )
}
