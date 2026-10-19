import { useState, useMemo } from 'react'

export default function AttendanceCalendar({ checkInRecords = [] }) {
  const [viewDate, setViewDate] = useState(() => new Date())

  // Stable today reference
  const todayDateObj = useMemo(() => new Date(), [])
  const todayYear = todayDateObj.getFullYear()
  const todayMonth = todayDateObj.getMonth()
  const todayDay = todayDateObj.getDate()

  const currentYear = viewDate.getFullYear()
  const currentMonth = viewDate.getMonth() // 0-indexed

  // Format month title
  const monthTitle = `Tháng ${String(currentMonth + 1).padStart(2, '0')} / ${currentYear}`

  // Map check-in records by date string 'YYYY-MM-DD'
  const checkInMap = useMemo(() => {
    const map = new Map()
    checkInRecords.forEach((record) => {
      if (!record.check_in_time) return
      // format: 'YYYY-MM-DD HH:mm:ss' or 'YYYY-MM-DDTHH:mm:ss'
      const datePart = record.check_in_time.split(' ')[0].split('T')[0]
      const timePart = record.check_in_time.includes(' ')
        ? record.check_in_time.split(' ')[1].slice(0, 5)
        : (record.check_in_time.includes('T') ? record.check_in_time.split('T')[1].slice(0, 5) : '')

      if (!map.has(datePart)) {
        map.set(datePart, [])
      }
      map.get(datePart).push({ ...record, timePart })
    })
    return map
  }, [checkInRecords])

  // Compute days in month
  const daysInMonth = useMemo(() => {
    return new Date(currentYear, currentMonth + 1, 0).getDate()
  }, [currentYear, currentMonth])

  // First day of week index (Monday = 0, ..., Sunday = 6)
  const firstDayOfWeek = useMemo(() => {
    return (new Date(currentYear, currentMonth, 1).getDay() + 6) % 7
  }, [currentYear, currentMonth])

  // Days in month calculation
  const calendarSlots = useMemo(() => {
    const slots = []

    // Prepend empty slots before the 1st day of the month
    for (let i = 0; i < firstDayOfWeek; i++) {
      slots.push({ isEmpty: true, key: `empty-${i}` })
    }

    // Actual days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const isToday =
        todayYear === currentYear &&
        todayMonth === currentMonth &&
        todayDay === d

      const checkIns = checkInMap.get(dateStr) || []
      const isCheckedIn = checkIns.length > 0

      slots.push({
        isEmpty: false,
        key: `day-${d}`,
        dayNumber: d,
        dateStr,
        isToday,
        isCheckedIn,
        checkIns,
      })
    }

    return slots
  }, [currentYear, currentMonth, daysInMonth, firstDayOfWeek, checkInMap, todayYear, todayMonth, todayDay])

  // Count check-ins in the currently viewed month
  const monthCheckInCount = useMemo(() => {
    let count = 0
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      if (checkInMap.has(dateStr)) {
        count++
      }
    }
    return count
  }, [currentYear, currentMonth, daysInMonth, checkInMap])

  const handlePrevMonth = () => {
    setViewDate(new Date(currentYear, currentMonth - 1, 1))
  }

  const handleNextMonth = () => {
    setViewDate(new Date(currentYear, currentMonth + 1, 1))
  }

  const handleToday = () => {
    setViewDate(new Date())
  }

  const weekdays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

  return (
    <div className="attendance-calendar-card">
      <div className="calendar-header">
        <div className="calendar-title-group">
          <h3 className="calendar-month-title">
            <i className="bi bi-calendar3 me-2 text-primary"></i>
            {monthTitle}
          </h3>
          <span className="calendar-stat-tag">
            <i className="bi bi-check-circle-fill"></i>
            {monthCheckInCount} ngày đã tập
          </span>
        </div>

        <div className="calendar-nav-controls">
          <button
            type="button"
            className="calendar-nav-btn"
            onClick={handlePrevMonth}
            aria-label="Tháng trước"
          >
            <i className="bi bi-chevron-left me-1"></i> Trước
          </button>
          <button
            type="button"
            className="calendar-nav-btn is-today"
            onClick={handleToday}
          >
            Hôm nay
          </button>
          <button
            type="button"
            className="calendar-nav-btn"
            onClick={handleNextMonth}
            aria-label="Tháng sau"
          >
            Sau <i className="bi bi-chevron-right ms-1"></i>
          </button>
        </div>
      </div>

      <div className="calendar-grid">
        {weekdays.map((wd) => (
          <div key={wd} className="calendar-weekday">
            {wd}
          </div>
        ))}

        {calendarSlots.map((slot) => {
          if (slot.isEmpty) {
            return <div key={slot.key} className="calendar-day-slot is-empty" />
          }

          const slotClasses = [
            'calendar-day-slot',
            slot.isToday ? 'is-today' : '',
            slot.isCheckedIn ? 'is-checked-in' : '',
          ]
            .filter(Boolean)
            .join(' ')

          const titleTooltip = slot.isCheckedIn
            ? `Đã check-in: ${slot.checkIns.map((c) => c.timePart || 'Có mặt').join(', ')}`
            : undefined

          return (
            <div key={slot.key} className={slotClasses} title={titleTooltip}>
              <div className="calendar-day-number">{slot.dayNumber}</div>
              {slot.isCheckedIn && (
                <div className="calendar-checkin-badge">
                  <i className="bi bi-check2"></i>
                  <span>{slot.checkIns[0]?.timePart || 'Đã tập'}</span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="calendar-legend">
        <div className="legend-item">
          <span className="legend-swatch is-checked-in"></span>
          <span>Đã đi tập ({monthCheckInCount} ngày)</span>
        </div>
        <div className="legend-item">
          <span className="legend-swatch is-today"></span>
          <span>Hôm nay</span>
        </div>
        <div className="legend-item">
          <span className="legend-swatch is-rest"></span>
          <span>Ngày nghỉ</span>
        </div>
      </div>
    </div>
  )
}
