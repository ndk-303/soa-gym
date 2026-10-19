import { useState, useEffect, useCallback, useMemo } from 'react'
import { plansApi, attendanceApi, invoicesApi } from '../../services/api'
import StatusBadge from '../../components/StatusBadge'
import AttendanceCalendar from './AttendanceCalendar'
import { formatVnd } from '../../components/managementUtils'

export default function MemberDashboard({ onTabChange, currentMember, memberLoading, onMemberRefresh }) {
  const [plans, setPlans] = useState([])
  const [attendanceRecords, setAttendanceRecords] = useState([])
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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

  const isPendingWarning = planTimeline.remainingDays > 0 && planTimeline.remainingDays <= 7

  return (
    <div className="member-dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Xin chào, {currentMember?.full_name || 'Hội viên'}!</h1>
          <p>Bảng điều khiển cá nhân: Thông tin gói tập, thời hạn và lịch trình tập luyện</p>
        </div>
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

      {error && (
        <div className="dashboard-alert" role="alert">
          <i className="bi bi-exclamation-triangle"></i>
          <div>{error}</div>
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
        <div className="kpi-card" onClick={() => onTabChange('plans')} role="button" tabIndex={0}>
          <div className="kpi-card-top">
            <span className="kpi-icon"><i className="bi bi-card-checklist"></i></span>
            <span className="kpi-group-tag">Thẻ hội viên</span>
          </div>
          <div>
            <div className="kpi-card-value" style={{ fontSize: '20px', lineHeight: 1.3 }}>
              {currentPlan ? currentPlan.name : 'Chưa có gói'}
            </div>
            <div className="kpi-card-label d-flex align-items-center justify-content-between mt-2">
              <span>{currentPlan ? formatVnd(currentPlan.price) : '0 ₫'}</span>
              <StatusBadge status={currentMember?.status || (currentPlan ? 'active' : 'inactive')} />
            </div>
          </div>
        </div>

        {/* Card 2: Số ngày đã tập */}
        <div className="kpi-card">
          <div className="kpi-card-top">
            <span className="kpi-icon"><i className="bi bi-check2-all"></i></span>
            <span className="kpi-group-tag">Check-in</span>
          </div>
          <div>
            <div className="kpi-card-value" style={{ color: 'var(--color-success)' }}>
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
            <span className="kpi-group-tag">Hiệu lực</span>
          </div>
          <div>
            <div
              className="kpi-card-value"
              style={{ color: isPendingWarning ? 'var(--color-warning)' : 'var(--color-primary)' }}
            >
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
            <span className="kpi-group-tag">Hết hạn</span>
          </div>
          <div>
            <div className="kpi-card-value" style={{ fontSize: '20px' }}>
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
    </div>
  )
}
