export default function Navbar({ activeTab, onTabChange }) {
  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark px-4 shadow-sm border-bottom border-secondary">
      <div className="container-fluid">
        <span className="navbar-brand d-flex align-items-center gap-2 fw-bold text-warning fs-4">
          <i className="bi bi-fire text-danger fs-3"></i>
          SOA GYM CENTER
        </span>
        <div className="d-flex align-items-center gap-3">
          <div className="text-light small d-none d-md-block">
            <i className="bi bi-person-circle me-1"></i> Admin Portal
          </div>
        </div>
      </div>
    </nav>
  )
}
