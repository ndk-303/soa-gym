import { useState, useEffect } from 'react'
import { plansApi } from '../services/api'
import StatusBadge from '../components/StatusBadge'
import LoadingSpinner from '../components/LoadingSpinner'

export default function PlansPage() {
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    duration_days: 30,
    price: 500000,
    is_active: true,
  })
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)

  useEffect(() => {
    fetchPlans()
  }, [])

  const fetchPlans = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await plansApi.getAll()
      setPlans(res.data)
    } catch (err) {
      setError(err.message || 'Lỗi khi tải danh sách gói tập')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenAdd = () => {
    setEditingId(null)
    setFormData({
      name: '',
      duration_days: 30,
      price: 500000,
      is_active: true,
    })
    setFormError(null)
    setShowModal(true)
  }

  const handleOpenEdit = (p) => {
    setEditingId(p.id)
    setFormData({
      name: p.name,
      duration_days: p.duration_days,
      price: p.price,
      is_active: p.is_active,
    })
    setFormError(null)
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingId(null)
    setFormError(null)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setFormError(null)
    try {
      const payload = {
        name: formData.name,
        duration_days: Number(formData.duration_days),
        price: Number(formData.price),
        is_active: Boolean(formData.is_active),
      }
      if (editingId) {
        await plansApi.update(editingId, payload)
      } else {
        await plansApi.create(payload)
      }
      handleCloseModal()
      fetchPlans()
    } catch (err) {
      setFormError(err.response?.data?.detail || err.message || 'Lỗi xử lý')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm(`Bạn có chắc muốn xóa Gói tập ID #${id}?`)) return
    try {
      await plansApi.delete(id)
      fetchPlans()
    } catch (err) {
      alert('Lỗi xóa: ' + (err.response?.data?.detail || err.message))
    }
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h3 className="fw-bold mb-1">
            <i className="bi bi-card-checklist text-secondary me-2"></i>
            Quản lý Gói tập (Membership Plans)
          </h3>
          <p className="text-muted small mb-0">Các gói thành viên theo thời hạn (30 ngày, 90 ngày, 365 ngày...)</p>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary btn-sm" onClick={fetchPlans}>
            <i className="bi bi-arrow-clockwise me-1"></i> Làm mới
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleOpenAdd}>
            <i className="bi bi-plus-lg me-1"></i> Thêm Gói tập
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger py-2 small" role="alert">
          <i className="bi bi-exclamation-circle me-2"></i> {error}
        </div>
      )}

      <div className="card border-0 shadow-sm">
        <div className="table-responsive">
          {loading ? (
            <LoadingSpinner message="Đang tải dữ liệu Gói tập..." />
          ) : plans.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="bi bi-inbox fs-1 d-block mb-2 text-secondary"></i>
              Chưa có dữ liệu gói tập nào
            </div>
          ) : (
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th style={{ width: '60px' }}>ID</th>
                  <th>Tên gói tập</th>
                  <th>Thời hạn (Ngày)</th>
                  <th>Giá tiền (VNĐ)</th>
                  <th>Trạng thái</th>
                  <th style={{ width: '140px' }} className="text-end">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((p) => (
                  <tr key={p.id}>
                    <td className="fw-bold text-secondary">#{p.id}</td>
                    <td className="fw-bold text-primary">{p.name}</td>
                    <td>{p.duration_days} ngày</td>
                    <td className="fw-semibold text-success">{Number(p.price).toLocaleString()} đ</td>
                    <td>
                      <StatusBadge status={p.is_active ? 'active' : 'inactive'} />
                    </td>
                    <td className="text-end">
                      <button className="btn btn-sm btn-outline-primary me-1" onClick={() => handleOpenEdit(p)}>
                        <i className="bi bi-pencil"></i>
                      </button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(p.id)}>
                        <i className="bi bi-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">
                  {editingId ? `Cập nhật Gói tập #${editingId}` : 'Thêm mới Gói tập'}
                </h5>
                <button type="button" className="btn-close" onClick={handleCloseModal}></button>
              </div>
              <form onSubmit={handleSave}>
                <div className="modal-body">
                  {formError && (
                    <div className="alert alert-danger py-2 small mb-3">
                      <i className="bi bi-exclamation-triangle me-1"></i> {formError}
                    </div>
                  )}
                  <div className="mb-3">
                    <label className="form-label small fw-bold">Tên gói tập</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      placeholder="Ví dụ: Gói 1 Tháng Cơ Bản"
                    />
                  </div>
                  <div className="row g-2 mb-3">
                    <div className="col-md-6">
                      <label className="form-label small fw-bold">Thời hạn (Ngày)</label>
                      <input
                        type="number"
                        min="1"
                        max="365"
                        className="form-control"
                        value={formData.duration_days}
                        onChange={(e) => setFormData({ ...formData, duration_days: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-bold">Giá tiền (VNĐ)</label>
                      <input
                        type="number"
                        min="1000"
                        step="1000"
                        className="form-control"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="form-check form-switch mb-2">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="planActiveSwitch"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    />
                    <label className="form-check-label small" htmlFor="planActiveSwitch">
                      Đang mở bán / Kích hoạt
                    </label>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={handleCloseModal}>
                    Hủy
                  </button>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
                    {submitting ? 'Đang lưu...' : (editingId ? 'Lưu thay đổi' : 'Thêm mới')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
