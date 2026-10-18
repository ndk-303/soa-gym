import { useState, useEffect } from 'react'
import { invoicesApi, membersApi } from '../services/api'
import StatusBadge from '../components/StatusBadge'
import LoadingSpinner from '../components/LoadingSpinner'

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([])
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    member_id: '',
    amount: 500000,
    amount_paid: 0,
    status: 'pending',
  })
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [invoicesRes, membersRes] = await Promise.all([
        invoicesApi.getAll(),
        membersApi.getAll(),
      ])
      setInvoices(invoicesRes.data)
      setMembers(membersRes.data)
    } catch (err) {
      setError(err.message || 'Lỗi khi tải danh sách hóa đơn')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenAdd = () => {
    setEditingId(null)
    setFormData({
      member_id: members.length > 0 ? members[0].id : '',
      amount: 500000,
      amount_paid: 0,
      status: 'pending',
    })
    setFormError(null)
    setShowModal(true)
  }

  const handleOpenEdit = (inv) => {
    setEditingId(inv.id)
    setFormData({
      member_id: inv.member_id,
      amount: inv.amount,
      amount_paid: inv.amount_paid,
      status: inv.status,
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
        member_id: Number(formData.member_id),
        amount: Number(formData.amount),
        amount_paid: Number(formData.amount_paid),
        status: formData.status,
      }
      if (editingId) {
        await invoicesApi.update(editingId, payload)
      } else {
        await invoicesApi.create(payload)
      }
      handleCloseModal()
      fetchData()
    } catch (err) {
      setFormError(err.response?.data?.detail || err.message || 'Lỗi xử lý')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm(`Bạn có chắc muốn xóa Hóa đơn ID #${id}?`)) return
    try {
      await invoicesApi.delete(id)
      fetchData()
    } catch (err) {
      alert('Lỗi xóa: ' + (err.response?.data?.detail || err.message))
    }
  }

  const memberMap = Object.fromEntries(members.map((m) => [m.id, m]))

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h3 className="fw-bold mb-1">
            <i className="bi bi-receipt text-secondary me-2"></i>
            Quản lý Hóa đơn (Invoices)
          </h3>
          <p className="text-muted small mb-0">Hóa đơn tiền gói tập, theo dõi số tiền phải trả và số tiền đã thanh toán</p>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary btn-sm" onClick={fetchData}>
            <i className="bi bi-arrow-clockwise me-1"></i> Làm mới
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleOpenAdd}>
            <i className="bi bi-plus-lg me-1"></i> Tạo Hóa đơn
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
            <LoadingSpinner message="Đang tải dữ liệu Hóa đơn..." />
          ) : invoices.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="bi bi-inbox fs-1 d-block mb-2 text-secondary"></i>
              Chưa có dữ liệu hóa đơn nào
            </div>
          ) : (
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th style={{ width: '60px' }}>ID</th>
                  <th>Hội viên</th>
                  <th>Tổng tiền (VNĐ)</th>
                  <th>Đã thanh toán (VNĐ)</th>
                  <th>Trạng thái</th>
                  <th style={{ width: '140px' }} className="text-end">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => {
                  const member = memberMap[inv.member_id]
                  return (
                    <tr key={inv.id}>
                      <td className="fw-bold text-secondary">#{inv.id}</td>
                      <td>
                        <span className="badge bg-success-subtle text-success-emphasis border">
                          <i className="bi bi-person me-1"></i>
                          {member ? `${member.full_name} (${member.email})` : `Hội viên #${inv.member_id}`}
                        </span>
                      </td>
                      <td className="fw-bold text-dark">{Number(inv.amount).toLocaleString()} đ</td>
                      <td className="text-success fw-medium">{Number(inv.amount_paid).toLocaleString()} đ</td>
                      <td>
                        <StatusBadge status={inv.status} />
                      </td>
                      <td className="text-end">
                        <button className="btn btn-sm btn-outline-primary me-1" onClick={() => handleOpenEdit(inv)}>
                          <i className="bi bi-pencil"></i>
                        </button>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(inv.id)}>
                          <i className="bi bi-trash"></i>
                        </button>
                      </td>
                    </tr>
                  )
                })}
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
                  {editingId ? `Cập nhật Hóa đơn #${editingId}` : 'Tạo mới Hóa đơn'}
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
                    <label className="form-label small fw-bold">Chọn Hội viên</label>
                    <select
                      className="form-select"
                      value={formData.member_id}
                      onChange={(e) => setFormData({ ...formData, member_id: e.target.value })}
                      required
                    >
                      <option value="">-- Chọn hội viên --</option>
                      {members.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.full_name} ({m.email})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="row g-2 mb-3">
                    <div className="col-md-6">
                      <label className="form-label small fw-bold">Tổng tiền (VNĐ)</label>
                      <input
                        type="number"
                        min="1000"
                        step="1000"
                        className="form-control"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-bold">Đã thanh toán (VNĐ)</label>
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        className="form-control"
                        value={formData.amount_paid}
                        onChange={(e) => setFormData({ ...formData, amount_paid: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="mb-2">
                    <label className="form-label small fw-bold">Trạng thái thanh toán</label>
                    <select
                      className="form-select"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      <option value="pending">pending (Chờ thanh toán)</option>
                      <option value="partially_paid">partially_paid (Thanh toán 1 phần)</option>
                      <option value="paid">paid (Đã hoàn tất)</option>
                      <option value="cancelled">cancelled (Đã hủy)</option>
                    </select>
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
