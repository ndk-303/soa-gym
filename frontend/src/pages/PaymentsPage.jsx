import { useState, useEffect, useMemo } from 'react'
import { paymentsApi, invoicesApi, membersApi } from '../services/api'
import { ActionMenu, ManagementHeader, ManagementTable, ManagementFilterBar } from '../components/ManagementUI'
import { formatVnd } from '../components/managementUtils'
import ConfirmDialog from '../components/ConfirmDialog'

export default function PaymentsPage() {
  const [payments, setPayments] = useState([])
  const [invoices, setInvoices] = useState([])
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [searchTerm, setSearchTerm] = useState('')
  const [methodFilter, setMethodFilter] = useState('all')

  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null, loading: false })

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

  async function fetchData() {
    setLoading(true)
    setError(null)
    try {
      const [paymentsRes, invoicesRes, membersRes] = await Promise.all([
        paymentsApi.getDetailed(),
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

  const handleOpenDelete = (id) => {
    setDeleteConfirm({ isOpen: true, id, loading: false })
  }

  const handleConfirmDelete = async () => {
    if (!deleteConfirm.id) return
    setDeleteConfirm((prev) => ({ ...prev, loading: true }))
    try {
      await paymentsApi.delete(deleteConfirm.id)
      setDeleteConfirm({ isOpen: false, id: null, loading: false })
      fetchData()
    } catch (err) {
      setDeleteConfirm({ isOpen: false, id: null, loading: false })
      setError('Lỗi xóa: ' + (err.response?.data?.detail || err.message))
    }
  }

  const invoiceMap = useMemo(() => Object.fromEntries(invoices.map((inv) => [inv.id, inv])), [invoices])
  const memberMap = useMemo(() => Object.fromEntries(members.map((m) => [m.id, m])), [members])

  const methodOptions = [
    { value: 'all', label: 'Tất cả phương thức' },
    { value: 'cash', label: 'Tiền mặt (cash)' },
    { value: 'bank_transfer', label: 'Chuyển khoản (bank_transfer)' },
    { value: 'vietqr', label: 'VietQR' },
    { value: 'credit_card', label: 'Thẻ tín dụng (credit_card)' },
  ]

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const q = searchTerm.trim().toLowerCase()
      const linkedInv = p.invoice || invoiceMap[p.invoice_id]
      const linkedMember = p.member || linkedInv?.member || (linkedInv ? memberMap[linkedInv.member_id] : null)
      const matchSearch =
        !q ||
        String(p.id).includes(q) ||
        `gd #${p.id}`.toLowerCase().includes(q) ||
        String(p.invoice_id).includes(q) ||
        `hóa đơn #${p.invoice_id}`.toLowerCase().includes(q) ||
        (linkedMember?.full_name && linkedMember.full_name.toLowerCase().includes(q)) ||
        (p.notes && p.notes.toLowerCase().includes(q))
      const matchMethod = methodFilter === 'all' || p.payment_method === methodFilter
      return matchSearch && matchMethod
    })
  }, [payments, searchTerm, methodFilter, invoiceMap, memberMap])

  const handleResetFilter = () => {
    setSearchTerm('')
    setMethodFilter('all')
  }

  return (
    <div>
      <ManagementHeader
        title="Thanh toán"
        description="Lịch sử thu tiền và phương thức thanh toán theo từng hóa đơn"
        onRefresh={fetchData}
        onAdd={handleOpenAdd}
        addLabel="Ghi nhận thanh toán"
        count={payments.length}
      />

      {error && (
        <div className="management-error" role="alert">
          <i className="bi bi-exclamation-circle me-2"></i> {error}
        </div>
      )}

      <ManagementFilterBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Tìm theo mã GD, mã HĐ, hội viên hoặc ghi chú..."
        filterValue={methodFilter}
        onFilterChange={setMethodFilter}
        filterOptions={methodOptions}
        filterLabel="Lọc theo phương thức thanh toán"
        totalCount={payments.length}
        filteredCount={filteredPayments.length}
        onReset={handleResetFilter}
      />

      <ManagementTable
        columns={[
          { key: 'payment', label: 'Mã giao dịch', width: '21%' },
          { key: 'invoice', label: 'Hóa đơn / Hội viên', width: '21%' },
          { key: 'amount', label: 'Số tiền', width: '15%', align: 'right' },
          { key: 'method', label: 'Phương thức', width: '15%' },
          { key: 'notes', label: 'Ghi chú', width: '13%' },
          { key: 'actions', label: 'Hành động', width: '190px', align: 'center' },
        ]}
        loading={loading}
        loadingMessage="Đang tải dữ liệu Thanh toán..."
        isEmpty={payments.length === 0 || filteredPayments.length === 0}
        emptyMessage={payments.length === 0 ? 'Chưa có dữ liệu thanh toán nào' : 'Không tìm thấy giao dịch nào phù hợp với bộ lọc'}
        emptyIcon={payments.length === 0 ? 'bi-inbox' : 'bi-search'}
        emptyAction={
          payments.length > 0 && filteredPayments.length === 0 ? (
            <button
              type="button"
              className="management-secondary-button mt-3"
              onClick={handleResetFilter}
            >
              <i className="bi bi-arrow-counterclockwise"></i> Đặt lại bộ lọc
            </button>
          ) : null
        }
        minWidth={900}
      >
        {filteredPayments.map((p) => {
                  const linkedInv = p.invoice || invoiceMap[p.invoice_id]
                  const linkedMember = p.member || linkedInv?.member || (linkedInv ? memberMap[linkedInv.member_id] : null)
                  return (
                    <tr key={p.id}>
                      <td><span className="technical-id">GD #{p.id}</span></td>
                      <td>
                        <div className="primary-cell">Hóa đơn #{p.invoice_id}</div>
                        <div className="secondary-cell">{linkedMember ? linkedMember.full_name : `Hội viên #${linkedInv?.member_id || '—'}`}</div>
                      </td>
                      <td className="money">{formatVnd(p.amount)}</td>
                      <td>
                        <span className="semantic-badge">{({ cash: 'Tiền mặt', bank_transfer: 'Chuyển khoản', vietqr: 'VietQR', credit_card: 'Thẻ tín dụng' })[p.payment_method] || p.payment_method}</span>
                      </td>
                      <td className="table-note">{p.notes || '—'}</td>
                      <td className="text-end">
                        <ActionMenu onEdit={() => handleOpenEdit(p)} onDelete={() => handleOpenDelete(p.id)} />
                      </td>
                    </tr>
                  )
                })}
      </ManagementTable>

      {showModal && (
        <div
          className="modal show d-block"
          tabIndex="-1"
          role="dialog"
          aria-modal="true"
          aria-labelledby="payment-modal-title"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.45)' }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header">
                <h5 className="modal-title fw-bold" id="payment-modal-title">
                  {editingId ? `Cập nhật Thanh toán #${editingId}` : 'Ghi nhận Thanh toán mới'}
                </h5>
                <button type="button" className="btn-close" onClick={handleCloseModal} aria-label="Đóng"></button>
              </div>
              <form onSubmit={handleSave}>
                <div className="modal-body">
                  {formError && (
                    <div className="alert alert-danger py-2 small mb-3">
                      <i className="bi bi-exclamation-triangle me-1"></i> {formError}
                    </div>
                  )}
                  <div className="mb-3">
                    <label htmlFor="payment-invoice-select" className="form-label small fw-bold">Chọn Hóa đơn cần thanh toán</label>
                    <select
                      id="payment-invoice-select"
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
                            Hóa đơn #{inv.id} - {m ? m.full_name : `Hội viên #${inv.member_id}`} (Tổng: {formatVnd(inv.amount)}, Còn thiếu: {formatVnd(remaining)})
                          </option>
                        )
                      })}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label htmlFor="payment-amount" className="form-label small fw-bold">Số tiền thanh toán (VNĐ)</label>
                    <input
                      id="payment-amount"
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
                    <label htmlFor="payment-method-select" className="form-label small fw-bold">Phương thức thanh toán</label>
                    <select
                      id="payment-method-select"
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
                    <label htmlFor="payment-notes" className="form-label small fw-bold">Ghi chú</label>
                    <input
                      id="payment-notes"
                      type="text"
                      className="form-control"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Nội dung ghi chú chuyển khoản / giao dịch"
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="management-secondary-button" onClick={handleCloseModal}>
                    Hủy
                  </button>
                  <button type="submit" className="management-primary-button" disabled={submitting}>
                    {submitting ? 'Đang lưu...' : (editingId ? 'Lưu thay đổi' : 'Thêm mới')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Xác nhận xóa Giao dịch Thanh toán"
        message={`Bạn có chắc muốn xóa Giao dịch Thanh toán #${deleteConfirm.id}? Thao tác này không thể hoàn tác.`}
        confirmText="Xóa giao dịch"
        cancelText="Hủy bỏ"
        variant="danger"
        loading={deleteConfirm.loading}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, id: null, loading: false })}
      />
    </div>
  )
}
