import { useState, useEffect, useCallback } from 'react'
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

  const loadData = useCallback(async () => {
    if (!currentMember?.id) return
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
        const memberAtt = allAtt.filter((a) => String(a.member_id) === String(currentMember.id))
        setAttendanceRecords(memberAtt)
      }

      if (invoicesRes.status === 'fulfilled') {
        const allInv = invoicesRes.value.data || []
        const memberInv = allInv.filter((inv) => String(inv.member_id) === String(currentMember.id))
        setInvoices(memberInv)
      }
    } catch (err) {
      setError('Lỗi khi tải thông tin hội viên')
    } finally {
      setLoading(false)
    }
  }, [currentMember?.id])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Resolve current plan
  const currentPlan = plans.find((p) => Number(p.id) === Number(currentMember?.membership_plan_id))

  // Find latest paid invoice for plan duration calculation
  const latestPaidInvoice = invoices
    .filter((inv) => inv.status === 'paid')
    .sort((a, b) => b.id - a.id)[0]

  // Calculate activation & expiration dates
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

  const formatDisplayDate = (d) => {
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d)
  }

  // Count unique days attended
  const uniqueAttendanceDays = new Set(
    attendanceRecords
      .map((a) => a.check_in_time?.split(' ')[0]?.split('T')[0])
      .filter(Boolean)
  ).size

  const isPendingWarning = remainingDays > 0 && remainingDays <= 7

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
        <div className="alert alert-info d-flex align-items-center justify-content-between p-3 rounded-3 mb-4 shadow-sm border-0">
          <div className="d-flex align-items-center gap-3">
            <i className="bi bi-info-circle-fill text-primary fs-4"></i>
            <div>
              <div className="fw-bold text-dark">Bạn chưa đăng ký gói tập nào</div>
              <div className="small text-muted">Hãy đăng ký một gói tập để bắt đầu sử dụng phòng tập và tham gia các lớp học.</div>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm px-3 fw-bold rounded-2"
            onClick={() => onTabChange('plans')}
          >
            Đăng ký gói tập <i className="bi bi-arrow-right ms-1"></i>
          </button>
        </div>
      )}

      {/* 4 Metric Cards */}
      <div className="kpi-grid">
        {/* Card 1: Gói tập hiện tại */}
        <div className="kpi-card" onClick={() => onTabChange('plans')}>
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
            <div className="kpi-card-value text-success">
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
            <div className={`kpi-card-value ${isPendingWarning ? 'text-warning' : 'text-primary'}`}>
              {loading ? (
                <span className="kpi-skeleton"></span>
              ) : currentPlan ? (
                `${remainingDays} ngày`
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
                formatDisplayDate(expirationDate)
              ) : (
                '—'
              )}
            </div>
            <div className="kpi-card-label">
              {currentPlan ? `Kích hoạt từ: ${formatDisplayDate(activationDate)}` : 'Chưa có thông tin'}
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
