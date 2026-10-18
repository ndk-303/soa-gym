export default function LoadingSpinner({ message = 'Đang tải dữ liệu...' }) {
  return (
    <div className="text-center py-5">
      <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
        <span className="visually-hidden">Loading...</span>
      </div>
      <p className="mt-3 text-muted fw-medium">{message}</p>
    </div>
  )
}
