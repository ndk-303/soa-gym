import { useState, useEffect } from 'react'
import { invoicesApi, membersApi } from '../services/api'
import StatusBadge from '../components/StatusBadge'
import { ActionMenu, ManagementHeader, ManagementTable } from '../components/ManagementUI'
import { formatVnd } from '../components/managementUtils'

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

  async function fetchData() {
    setLoading(true)
    setError(null)
    try {
      const [invoicesRes, membersRes] = await Promise.all([
        invoicesApi.getDetailed(),
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
      <ManagementHeader title="Hóa đơn" description="Theo dõi công nợ, số tiền đã thanh toán và trạng thái hóa đơn" onRefresh={fetchData} onAdd={handleOpenAdd} addLabel="Tạo hóa đơn" />

      {error && (
        <div className="management-error" role="alert">
          <i className="bi bi-exclamation-circle me-2"></i> {error}
        </div>
      )}

      <ManagementTable
        columns={[
          { key: 'invoice', label: 'Mã hóa đơn', width: '13%' },
          { key: 'member', label: 'Hội viên', width: '20%' },
          { key: 'amount', label: 'Tổng tiền', width: '13%', align: 'right' },
          { key: 'paid', label: 'Đã thanh toán', width: '13%', align: 'right' },
          { key: 'remaining', label: 'Còn lại', width: '13%', align: 'right' },
          { key: 'status', label: 'Trạng thái', width: '12%' },
          { key: 'actions', label: 'Hành động', width: '190px', align: 'center' },
        ]}
        loading={loading}
        loadingMessage="Đang tải dữ liệu Hóa đơn..."
        isEmpty={invoices.length === 0}
        emptyMessage="Chưa có dữ liệu hóa đơn nào"
        minWidth={1020}
      >
                {invoices.map((inv) => {
                  const member = inv.member || memberMap[inv.member_id]
                  return (
                    <tr key={inv.id}>
                      <td><span className="technical-id">HĐ #{inv.id}</span></td>
                      <td>
                        <div className="primary-cell">{member ? member.full_name : `Hội viên #${inv.member_id}`}</div>
                        <div className="secondary-cell">{member?.email || 'Chưa có email'}</div>
                      </td>
                      <td className="money">{formatVnd(inv.amount)}</td>
                      <td className="money">{formatVnd(inv.amount_paid)}</td>
                      <td className="money">{formatVnd(Math.max(0, Number(inv.amount) - Number(inv.amount_paid)))}</td>
                      <td>
                        <StatusBadge status={inv.status} />
                      </td>
                      <td className="text-end">
                        <ActionMenu onEdit={() => handleOpenEdit(inv)} onDelete={() => handleDelete(inv.id)} />
                      </td>
                    </tr>
                  )
                })}
      </ManagementTable>

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
