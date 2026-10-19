export default function StatusBadge({ status }) {
  if (status === undefined || status === null) return null

  const str = String(status).toLowerCase()
  const labels = {
    active: 'Đang hoạt động',
    inactive: 'Tạm ngưng',
    confirmed: 'Đã xác nhận',
    paid: 'Đã thanh toán',
    pending: 'Chờ xử lý',
    waitlist: 'Hàng chờ',
    cancelled: 'Đã hủy',
    unpaid: 'Chưa thanh toán',
    partially_paid: 'Thanh toán một phần',
    checked_in: 'Đang tập',
    checked_out: 'Đã rời phòng',
    true: 'Đang hoạt động',
    false: 'Tạm ngưng',
  }
  const label = labels[str] || String(status)

  if (str === 'active' || str === 'true' || str === 'confirmed' || str === 'paid' || str === 'checked_in') {
    return <span className="semantic-badge is-success">{label}</span>
  }
  if (str === 'pending' || str === 'waitlist') {
    return <span className="semantic-badge is-warning">{label}</span>
  }
  if (str === 'inactive' || str === 'false' || str === 'cancelled' || str === 'unpaid') {
    return <span className="semantic-badge is-danger">{label}</span>
  }
  return <span className="semantic-badge">{label}</span>
}
