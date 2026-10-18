import { useState, useEffect } from 'react'
import { usersApi, membersApi, plansApi, classesApi, bookingsApi, invoicesApi, attendanceApi } from '../services/api'

export default function Dashboard({ onTabChange }) {
  const [stats, setStats] = useState({
    usersCount: 0,
    membersCount: 0,
    plansCount: 0,
    classesCount: 0,
    bookingsCount: 0,
    invoicesCount: 0,
    attendanceCount: 0,
    loading: true,
    error: null,
    failedResources: 0,
    loadedAt: null,
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

      setStats({
        usersCount: users.status === 'fulfilled' ? users.value.data.length : 0,
        membersCount: members.status === 'fulfilled' ? members.value.data.length : 0,
        plansCount: plans.status === 'fulfilled' ? plans.value.data.length : 0,
        classesCount: classes.status === 'fulfilled' ? classes.value.data.length : 0,
        bookingsCount: bookings.status === 'fulfilled' ? bookings.value.data.length : 0,
        invoicesCount: invoices.status === 'fulfilled' ? invoices.value.data.length : 0,
        attendanceCount: attendance.status === 'fulfilled' ? attendance.value.data.length : 0,
        loading: false,
        error: failedResources > 0 ? `Không thể tải ${failedResources} nguồn dữ liệu` : null,
        failedResources,
        loadedAt: new Date(),
      })
    } catch {
      setStats((prev) => ({ ...prev, loading: false, error: 'Không thể kết nối tới Backend' }))
    }
  }

  const statCards = [
    { title: 'Tài khoản', count: stats.usersCount, icon: 'bi-person', tab: 'users', group: 'Hội viên' },
    { title: 'Hội viên', count: stats.membersCount, icon: 'bi-people', tab: 'members', group: 'Hội viên' },
    { title: 'Gói tập', count: stats.plansCount, icon: 'bi-card-list', tab: 'plans', group: 'Hội viên' },
    { title: 'Lớp học', count: stats.classesCount, icon: 'bi-calendar-event', tab: 'classes', group: 'Vận hành' },
    { title: 'Đặt chỗ', count: stats.bookingsCount, icon: 'bi-bookmark-check', tab: 'bookings', group: 'Vận hành' },
    { title: 'Điểm danh', count: stats.attendanceCount, icon: 'bi-qr-code-scan', tab: 'attendance', group: 'Vận hành' },
    { title: 'Hóa đơn', count: stats.invoicesCount, icon: 'bi-receipt', tab: 'invoices', group: 'Tài chính' },
  ]

  const formatNumber = (value) => new Intl.NumberFormat('vi-VN').format(value)
  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <div className="breadcrumb-label"><i className="bi bi-grid-1x2 me-2"></i>Dashboard</div>
          <h1>Tổng quan hệ thống</h1>
          <p>Theo dõi nhanh tình hình hoạt động của SOA Gym Center</p>
        </div>
        <button className="refresh-button" onClick={loadOverview} disabled={stats.loading}>
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
              <i className="bi bi-arrow-up-right kpi-arrow"></i>
            </div>
            <div className="kpi-card-value">
              {stats.loading ? <span className="kpi-skeleton"></span> : formatNumber(c.count)}
            </div>
            <div className="kpi-card-label">{c.title}</div>
          </button>
        ))}
      </div>

    </div>
  )
}
