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
  })

  useEffect(() => {
    loadOverview()
  }, [])

  const loadOverview = async () => {
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

      setStats({
        usersCount: users.status === 'fulfilled' ? users.value.data.length : 0,
        membersCount: members.status === 'fulfilled' ? members.value.data.length : 0,
        plansCount: plans.status === 'fulfilled' ? plans.value.data.length : 0,
        classesCount: classes.status === 'fulfilled' ? classes.value.data.length : 0,
        bookingsCount: bookings.status === 'fulfilled' ? bookings.value.data.length : 0,
        invoicesCount: invoices.status === 'fulfilled' ? invoices.value.data.length : 0,
        attendanceCount: attendance.status === 'fulfilled' ? attendance.value.data.length : 0,
        loading: false,
        error: null,
      })
    } catch (err) {
      setStats((prev) => ({ ...prev, loading: false, error: 'Không thể kết nối tới Backend' }))
    }
  }

  const statCards = [
    { title: 'Tài khoản', count: stats.usersCount, icon: 'bi-people', color: 'primary', tab: 'users' },
    { title: 'Hội viên', count: stats.membersCount, icon: 'bi-person-badge', color: 'success', tab: 'members' },
    { title: 'Gói tập', count: stats.plansCount, icon: 'bi-card-checklist', color: 'info', tab: 'plans' },
    { title: 'Lớp học', count: stats.classesCount, icon: 'bi-calendar-event', color: 'warning', tab: 'classes' },
    { title: 'Đặt chỗ', count: stats.bookingsCount, icon: 'bi-bookmark-check', color: 'danger', tab: 'bookings' },
    { title: 'Điểm danh', count: stats.attendanceCount, icon: 'bi-qr-code-scan', color: 'secondary', tab: 'attendance' },
    { title: 'Hóa đơn', count: stats.invoicesCount, icon: 'bi-receipt', color: 'dark', tab: 'invoices' },
  ]

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-0">Tổng quan Hệ thống Gym</h2>
        </div>
        <button className="btn btn-outline-primary d-flex align-items-center gap-2" onClick={loadOverview}>
          <i className="bi bi-arrow-clockwise"></i> Làm mới
        </button>
      </div>

      {stats.error && (
        <div className="alert alert-warning d-flex align-items-center gap-2 shadow-sm" role="alert">
          <i className="bi bi-exclamation-triangle-fill fs-5"></i>
          <div>{stats.error}.</div>
        </div>
      )}

      <div className="row g-3">
        {statCards.map((c) => (
          <div key={c.tab} className="col-12 col-sm-6 col-lg-3">
            <div 
              className={`card border-0 shadow-sm h-100 bg-white border-top border-4 border-${c.color}`}
              style={{ cursor: 'pointer', transition: 'transform 0.15s ease' }}
              onClick={() => onTabChange(c.tab)}
            >
              <div className="card-body d-flex align-items-center justify-content-between">
                <div>
                  <div className="text-muted small fw-medium text-uppercase">{c.title}</div>
                  <div className="fs-3 fw-bold text-dark mt-1">
                    {stats.loading ? '...' : c.count}
                  </div>
                </div>
                <div className={`p-3 rounded-circle bg-${c.color}-subtle text-${c.color}`}>
                  <i className={`bi ${c.icon} fs-4`}></i>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
