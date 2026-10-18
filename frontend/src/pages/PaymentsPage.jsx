import { useState, useEffect } from 'react'
import { paymentsApi, invoicesApi, membersApi } from '../services/api'
import LoadingSpinner from '../components/LoadingSpinner'

export default function PaymentsPage() {
  const [payments, setPayments] = useState([])
  const [invoices, setInvoices] = useState([])
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    invoice_id: '',
    amount: 500000,
    payment_method: 'cash',
    notes: '',
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
      const [paymentsRes, invoicesRes, membersRes] = await Promise.all([
        paymentsApi.getAll(),
        invoicesApi.getAll(),
        membersApi.getAll(),
      ])
      setPayments(paymentsRes.data)
      setInvoices(invoicesRes.data)
      setMembers(membersRes.data)
    } catch (err) {
      setError(err.message || 'Lỗi khi tải danh sách thanh toán')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenAdd = () => {
    setEditingId(null)
    setFormData({
      invoice_id: invoices.length > 0 ? invoices[0].id : '',
      amount: invoices.length > 0 ? Math.max(0, invoices[0].amount - invoices[0].amount_paid) : 500000,
      payment_method: 'cash',
      notes: '',
    })
    setFormError(null)
    setShowModal(true)
  }

  const handleOpenEdit = (p) => {
    setEditingId(p.id)
    setFormData({
      invoice_id: p.invoice_id,
      amount: p.amount,
      payment_method: p.payment_method,
      notes: p.notes || '',
    })
    setFormError(null)
    setShowModal(true)
  }

  const handleInvoiceSelect = (selectedInvoiceId) => {
    const selectedInv = invoices.find((inv) => String(inv.id) === String(selectedInvoiceId))
    const remaining = selectedInv ? Math.max(0, selectedInv.amount - selectedInv.amount_paid) : 500000
    setFormData({
      ...formData,
      invoice_id: selectedInvoiceId,
      amount: remaining > 0 ? remaining : formData.amount,
    })
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
        invoice_id: Number(formData.invoice_id),
        amount: Number(formData.amount),
        payment_method: formData.payment_method,
        notes: formData.notes,
      }
      if (editingId) {
        await paymentsApi.update(editingId, payload)
      } else {
        await paymentsApi.create(payload)
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
    if (!window.confirm(`Bạn có chắc muốn xóa Giao dịch Thanh toán ID #${id}?`)) return
    try {
      await paymentsApi.delete(id)
      fetchData()
    } catch (err) {
      alert('Lỗi xóa: ' + (err.response?.data?.detail || err.message))
    }
  }

  const invoiceMap = Object.fromEntries(invoices.map((inv) => [inv.id, inv]))
  const memberMap = Object.fromEntries(members.map((m) => [m.id, m]))

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h3 className="fw-bold mb-1">
            <i className="bi bi-credit-card-2-front text-secondary me-2"></i>
            Quản lý Thanh toán (Payments)
          </h3>
          <p className="text-muted small mb-0">Lịch sử thu tiền thanh toán hóa đơn (tiền mặt, thẻ, chuyển khoản...)</p>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary btn-sm" onClick={fetchData}>
            <i className="bi bi-arrow-clockwise me-1"></i> Làm mới
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleOpenAdd}>
            <i className="bi bi-plus-lg me-1"></i> Ghi nhận Thanh toán
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
            <LoadingSpinner message="Đang tải dữ liệu Thanh toán..." />
          ) : payments.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="bi bi-inbox fs-1 d-block mb-2 text-secondary"></i>
              Chưa có dữ liệu thanh toán nào
            </div>
          ) : (
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th style={{ width: '60px' }}>ID</th>
                  <th>Hóa đơn & Hội viên</th>
                  <th>Số tiền thanh toán</th>
                  <th>Phương thức</th>
                  <th>Ghi chú</th>
                  <th style={{ width: '140px' }} className="text-end">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => {
                  const linkedInv = invoiceMap[p.invoice_id]
                  const linkedMember = linkedInv ? memberMap[linkedInv.member_id] : null
                  return (
                    <tr key={p.id}>
                      <td className="fw-bold text-secondary">#{p.id}</td>
                      <td>
                        <span className="badge bg-secondary-subtle text-secondary-emphasis border">
                          <i className="bi bi-receipt me-1"></i>
                          Hóa đơn #{p.invoice_id}
                          {linkedMember ? ` - [${linkedMember.full_name}]` : ''}
                        </span>
                      </td>
                      <td className="fw-bold text-success">+{Number(p.amount).toLocaleString()} đ</td>
                      <td>
                        <span className="badge bg-light text-dark border text-uppercase">
                          <i className="bi bi-cash me-1"></i> {p.payment_method}
                        </span>
                      </td>
                      <td className="text-muted small">{p.notes || '-'}</td>
                      <td className="text-end">
                        <button className="btn btn-sm btn-outline-primary me-1" onClick={() => handleOpenEdit(p)}>
                          <i className="bi bi-pencil"></i>
                        </button>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(p.id)}>
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
                  {editingId ? `Cập nhật Thanh toán #${editingId}` : 'Ghi nhận Thanh toán mới'}
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
                    <label className="form-label small fw-bold">Chọn Hóa đơn cần thanh toán</label>
                    <select
                      className="form-select"
                      value={formData.invoice_id}
                      onChange={(e) => handleInvoiceSelect(e.target.value)}
                      required
                    >
                      <option value="">-- Chọn hóa đơn --</option>
                      {invoices.map((inv) => {
                        const m = memberMap[inv.member_id]
                        const remaining = Math.max(0, inv.amount - inv.amount_paid)
                        return (
                          <option key={inv.id} value={inv.id}>
                            Hóa đơn #{inv.id} - {m ? m.full_name : `Hội viên #${inv.member_id}`} (Tổng: {Number(inv.amount).toLocaleString()}đ, Còn thiếu: {remaining.toLocaleString()}đ)
                          </option>
                        )
                      })}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-bold">Số tiền thanh toán (VNĐ)</label>
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
                  <div className="mb-3">
                    <label className="form-label small fw-bold">Phương thức thanh toán</label>
                    <select
                      className="form-select"
                      value={formData.payment_method}
                      onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                    >
                      <option value="cash">Tiền mặt (cash)</option>
                      <option value="bank_transfer">Chuyển khoản (bank_transfer)</option>
                      <option value="vietqr">VietQR</option>
                      <option value="credit_card">Thẻ tín dụng (credit_card)</option>
                    </select>
                  </div>
                  <div className="mb-2">
                    <label className="form-label small fw-bold">Ghi chú</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Nội dung ghi chú chuyển khoản / giao dịch"
                    />
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
