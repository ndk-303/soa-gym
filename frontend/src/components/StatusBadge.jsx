export default function StatusBadge({ status }) {
  if (status === undefined || status === null) return null

  const str = String(status).toLowerCase()

  if (str === 'active' || str === 'true' || str === 'confirmed' || str === 'paid' || str === 'checked_in') {
    return <span className="badge bg-success-subtle text-success border border-success">{String(status)}</span>
  }
  if (str === 'pending' || str === 'waitlist') {
    return <span className="badge bg-warning-subtle text-warning-emphasis border border-warning">{String(status)}</span>
  }
  if (str === 'inactive' || str === 'false' || str === 'cancelled' || str === 'unpaid') {
    return <span className="badge bg-danger-subtle text-danger border border-danger">{String(status)}</span>
  }
  return <span className="badge bg-secondary-subtle text-secondary border border-secondary">{String(status)}</span>
}
