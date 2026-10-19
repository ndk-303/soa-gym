import { useState, useEffect } from 'react'
import { usersApi, membersApi, plansApi, classesApi, bookingsApi, invoicesApi, attendanceApi } from '../services/api'
import StatusBadge from '../components/StatusBadge'
import { formatVnd } from '../components/managementUtils'

export default function Dashboard({ onTabChange }) {
  const [stats, setStats] = useState({
    usersCount: 0,
    membersCount: 0,
    plansCount: 0,
    classesCount: 0,
    bookingsCount: 0,
    invoicesCount: 0,
    attendanceCount: 0,
    totalRevenue: 0,
    recentInvoices: [],
    recentMembers: [],
    loading: true,
    error: null,
    failedResources: 0,
  })

  useEffect(() => {
    loadOverview()
  }, [])

  async function loadOverview() {
    setStats((prev) => ({ ...prev, loading: true, error: null }))
    try {
      const [users, members, plans, classes, bookings, invoices, attendance] = await Promise.allSettled([
        usersApi.getAll(),
        membersApi.getAll(),
        plansApi.getAll(),
        classesApi.getAll(),
        bookingsApi.getAll(),
        invoicesApi.getAll(),
        attendanceApi.getAll(),
      ])

      const failedResources = [users, members, plans, classes, bookings, invoices, attendance]
        .filter((result) => result.status === 'rejected').length

      const invoicesData = invoices.status === 'fulfilled' ? invoices.value.data : []
      const membersData = members.status === 'fulfilled' ? members.value.data : []

      // Calculate paid revenue
      const totalRevenue = invoicesData
        .filter((inv) => inv.status === 'paid')
        .reduce((sum, inv) => sum + (Number(inv.amount_paid) || Number(inv.amount) || 0), 0)

      setStats({
        usersCount: users.status === 'fulfilled' ? users.value.data.length : 0,
        membersCount: membersData.length,
        plansCount: plans.status === 'fulfilled' ? plans.value.data.length : 0,
        classesCount: classes.status === 'fulfilled' ? classes.value.data.length : 0,
        bookingsCount: bookings.status === 'fulfilled' ? bookings.value.data.length : 0,
        invoicesCount: invoicesData.length,
        attendanceCount: attendance.status === 'fulfilled' ? attendance.value.data.length : 0,
        totalRevenue,
        recentInvoices: invoicesData.slice(-5).reverse(),
        recentMembers: membersData.slice(-5).reverse(),
        loading: false,
        error: failedResources > 0 ? `Không thể tải ${failedResources} nguồn dữ liệu` : null,
        failedResources,
      })
    } catch {
      setStats((prev) => ({ ...prev, loading: false, error: 'Không thể kết nối tới Backend' }))
    }
  }

  const statCards = [
    {
      title: 'Hội viên đăng ký',
      count: stats.membersCount,
      sub: `${stats.usersCount} tài khoản người dùng`,
      icon: 'bi-people',
      tab: 'members',
      group: 'Hội viên',
    },
    {
      title: 'Doanh thu thu về',
      isCurrency: true,
      count: stats.totalRevenue,
      sub: `${stats.invoicesCount} hóa đơn phát hành`,
      icon: 'bi-cash-stack',
      tab: 'invoices',
      group: 'Tài chính',
    },
    {
      title: 'Lớp học & Ca tập',
      count: stats.classesCount,
      sub: `${stats.plansCount} gói tập khả dụng`,
      icon: 'bi-calendar-event',
      tab: 'classes',
      group: 'Vận hành',
    },
    {
      title: 'Lượt điểm danh',
      count: stats.attendanceCount,
      sub: `${stats.bookingsCount} lượt đặt trước`,
      icon: 'bi-qr-code-scan',
      tab: 'attendance',
      group: 'Vận hành',
    },
  ]

  const formatNumber = (value) => new Intl.NumberFormat('vi-VN').format(value)

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1>Tổng quan hệ thống</h1>
          <p>Bảng điều khiển hoạt động vận hành, hội viên và tài chính tại SOA Gym Center</p>
        </div>
        <button className="refresh-button" type="button" onClick={loadOverview} disabled={stats.loading}>
          <i className={`bi ${stats.loading ? 'bi-arrow-repeat spin' : 'bi-arrow-clockwise'}`}></i>
          Làm mới
        </button>
      </div>

      {stats.error && (
        <div className="dashboard-alert" role="alert">
          <i className="bi bi-exclamation-triangle"></i>
          <div>{stats.error}. Vui lòng kiểm tra kết nối backend.</div>
        </div>
      )}

      {/* Quick Action Navigation */}
      <div className="quick-actions-bar">
        <span className="quick-actions-label"><i className="bi bi-lightning-charge me-1"></i>Truy cập nhanh:</span>
        <button type="button" className="quick-action-btn" onClick={() => onTabChange('members')}>
          <i className="bi bi-person-plus"></i> Thêm hội viên
        </button>
        <button type="button" className="quick-action-btn" onClick={() => onTabChange('invoices')}>
          <i className="bi bi-receipt"></i> Tạo hóa đơn
        </button>
        <button type="button" className="quick-action-btn" onClick={() => onTabChange('slots')}>
          <i className="bi bi-clock"></i> Lên lịch ca tập
        </button>
        <button type="button" className="quick-action-btn" onClick={() => onTabChange('attendance')}>
          <i className="bi bi-check2-circle"></i> Điểm danh ngay
        </button>
      </div>

      {/* KPI Metric Grid */}
      <div className="kpi-grid">
        {statCards.map((c) => (
          <button
            type="button"
            key={c.tab}
            className="kpi-card"
            onClick={() => onTabChange(c.tab)}
          >
            <div className="kpi-card-top">
              <span className="kpi-icon"><i className={`bi ${c.icon}`}></i></span>
              <span className="kpi-group-tag">{c.group}</span>
            </div>
            <div>
              <div className="kpi-card-value">
                {stats.loading ? (
                  <span className="kpi-skeleton"></span>
                ) : c.isCurrency ? (
                  formatVnd(c.count)
                ) : (
                  formatNumber(c.count)
                )}
              </div>
              <div className="kpi-card-label">{c.title}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Live Operational Feeds */}
      <div className="dashboard-split-grid">
        {/* Recent Invoices Panel */}
        <div className="dashboard-panel">
          <div className="dashboard-panel-header">
            <h2 className="dashboard-panel-title">
              <i className="bi bi-receipt"></i> Hóa đơn gần đây
            </h2>
            <button
              type="button"
              className="dashboard-panel-action"
              onClick={() => onTabChange('invoices')}
            >
              Xem tất cả <i className="bi bi-chevron-right ms-1"></i>
            </button>
          </div>
          <div className="dashboard-panel-body">
            {stats.loading ? (
              <div className="dashboard-empty-panel">Đang tải danh sách hóa đơn...</div>
            ) : stats.recentInvoices.length === 0 ? (
              <div className="dashboard-empty-panel">Chưa có giao dịch hóa đơn nào</div>
            ) : (
              <table className="dashboard-table-compact">
                <tbody>
                  {stats.recentInvoices.map((inv) => (
                    <tr key={inv.id}>
                      <td>
                        <div className="fw-semibold text-dark">Hóa đơn #{inv.id}</div>
                        <div className="text-muted small">Hội viên #{inv.member_id}</div>
                      </td>
                      <td className="text-end">
                        <div className="fw-bold text-dark">{formatVnd(inv.amount)}</div>
                      </td>
                      <td className="text-end" style={{ width: '130px' }}>
                        <StatusBadge status={inv.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Recent Members Panel */}
        <div className="dashboard-panel">
          <div className="dashboard-panel-header">
            <h2 className="dashboard-panel-title">
              <i className="bi bi-people"></i> Hội viên mới nhất
            </h2>
            <button
              type="button"
              className="dashboard-panel-action"
              onClick={() => onTabChange('members')}
            >
              Xem tất cả <i className="bi bi-chevron-right ms-1"></i>
            </button>
          </div>
          <div className="dashboard-panel-body">
            {stats.loading ? (
              <div className="dashboard-empty-panel">Đang tải danh sách hội viên...</div>
            ) : stats.recentMembers.length === 0 ? (
              <div className="dashboard-empty-panel">Chưa có hồ sơ hội viên nào</div>
            ) : (
              <table className="dashboard-table-compact">
                <tbody>
                  {stats.recentMembers.map((m) => (
                    <tr key={m.id}>
                      <td>
                        <div className="fw-semibold text-dark">{m.full_name}</div>
                        <div className="text-muted small">{m.email || 'Chưa có email'}</div>
                      </td>
                      <td className="text-end" style={{ width: '130px' }}>
                        <StatusBadge status={m.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
