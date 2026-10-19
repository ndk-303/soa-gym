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

