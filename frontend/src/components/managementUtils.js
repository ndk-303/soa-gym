export function formatVnd(value) {
  return `${Number(value || 0).toLocaleString('vi-VN')} ₫`
}

export function formatDateTime(value) {
  if (!value) return '—'
  const date = new Date(String(value).replace(' ', 'T'))
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function formatSchedule(value) {
  if (!value) return { date: '—', time: '—' }
  const date = new Date(String(value).replace(' ', 'T'))
  if (Number.isNaN(date.getTime())) return { date: value, time: '—' }
  return {
    date: new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }).format(date),
    time: new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' }).format(date),
  }
}

export function toDatetimeLocalValue(value) {
  if (!value) return ''
  const str = String(value).trim().replace(' ', 'T')
  if (str.length >= 16) {
    return str.substring(0, 16)
  }
  const date = new Date(str)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function fromDatetimeLocalValue(value) {
  if (!value) return null
  const clean = String(value).trim().replace('T', ' ')
  if (clean.length === 16) {
    return `${clean}:00`
  }
  return clean
}

export function getNowDatetimeLocalValue() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}


