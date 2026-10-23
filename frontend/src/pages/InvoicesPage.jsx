import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { invoicesApi, membersApi } from '../services/api'
import StatusBadge from '../components/StatusBadge'
import { ActionMenu, ManagementHeader, ManagementTable, ManagementFilterBar, ManagementModal } from '../components/ManagementUI'
import { formatVnd } from '../components/managementUtils'
import ConfirmDialog from '../components/ConfirmDialog'
import { useToast } from '../context/ToastContext'

export default function InvoicesPage() {
  const toast = useToast()
  const { isAdmin } = useAuth()
  const [invoices, setInvoices] = useState([])

  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null, loading: false })

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

    if (!formData.member_id) {
      setFormError('Vui lòng chọn hội viên')
      setSubmitting(false)
      return
    }
    if (formData.amount === '' || Number(formData.amount) <= 0) {
      setFormError('Tổng tiền hóa đơn phải lớn hơn 0')
      setSubmitting(false)
      return
    }
    if (formData.amount_paid !== '' && Number(formData.amount_paid) < 0) {
      setFormError('Số tiền đã thanh toán không hợp lệ')
      setSubmitting(false)
      return
    }
    if (Number(formData.amount_paid) > Number(formData.amount)) {
      setFormError('Số tiền đã thanh toán không thể lớn hơn tổng tiền hóa đơn')
      setSubmitting(false)
      return
    }

    try {
      const payload = {
        member_id: Number(formData.member_id),
        amount: Number(formData.amount),
        amount_paid: Number(formData.amount_paid),
        status: formData.status,
      }
      if (editingId) {
        await invoicesApi.update(editingId, payload)
        toast.success('Cập nhật hóa đơn thành công')
      } else {
        await invoicesApi.create(payload)
        toast.success('Tạo mới hóa đơn thành công')
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
      await invoicesApi.delete(deleteConfirm.id)
      setDeleteConfirm({ isOpen: false, id: null, loading: false })
      toast.success('Đã hủy hóa đơn thành công')
      fetchData()
    } catch (err) {
      setDeleteConfirm({ isOpen: false, id: null, loading: false })
      const errorMsg = 'Lỗi xóa: ' + (err.response?.data?.detail || err.message)
      setError(errorMsg)
      toast.error(errorMsg)
    }
  }

  const memberMap = useMemo(() => Object.fromEntries(members.map((m) => [m.id, m])), [members])

  const statusOptions = [
    { value: 'all', label: 'Tất cả trạng thái' },
    { value: 'pending', label: 'Chờ thanh toán' },
    { value: 'partially_paid', label: 'Thanh toán một phần' },
    { value: 'paid', label: 'Đã thanh toán' },
    { value: 'cancelled', label: 'Đã hủy' },
  ]

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const q = searchTerm.trim().toLowerCase()
      const member = inv.member || memberMap[inv.member_id]
      const matchSearch =
        !q ||
        (member?.full_name && member.full_name.toLowerCase().includes(q)) ||
        (member?.email && member.email.toLowerCase().includes(q)) ||
        String(inv.id).includes(q) ||
        `hđ #${inv.id}`.toLowerCase().includes(q)
      const matchStatus = statusFilter === 'all' || inv.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [invoices, searchTerm, statusFilter, memberMap])

  const handleResetFilter = () => {
    setSearchTerm('')
    setStatusFilter('all')
  }

  return (
    <div>
      <ManagementHeader
        title="Hóa đơn"
        onRefresh={fetchData}
        onAdd={isAdmin ? handleOpenAdd : undefined}
        addLabel="Tạo hóa đơn"
      />

      {error && (
        <div className="management-error" role="alert">
          <i className="bi bi-exclamation-circle me-2"></i> {error}
        </div>
      )}

      <ManagementFilterBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Tìm theo mã HĐ, tên hoặc email hội viên..."
        filterValue={statusFilter}
        onFilterChange={setStatusFilter}
        filterOptions={statusOptions}
        filterLabel="Lọc theo trạng thái hóa đơn"
        totalCount={invoices.length}
        filteredCount={filteredInvoices.length}
        onReset={handleResetFilter}
      />

      <ManagementTable
        minWidth={isAdmin ? 750 : 640}
        columns={[
          { key: 'invoice', label: 'Mã hóa đơn', width: isAdmin ? '12%' : '14%' },
          { key: 'member', label: 'Hội viên', width: isAdmin ? '24%' : '28%' },
          { key: 'amount', label: 'Tổng tiền', width: isAdmin ? '14%' : '16%' },
          { key: 'paid', label: 'Đã thanh toán', width: isAdmin ? '14%' : '16%' },
          { key: 'remaining', label: 'Còn lại', width: isAdmin ? '14%' : '14%' },
          { key: 'status', label: 'Trạng thái', width: isAdmin ? '11%' : '12%' },
          ...(isAdmin ? [{ key: 'actions', label: 'Hành động', width: '11%', align: 'center' }] : []),
        ]}
        loading={loading}
        loadingMessage="Đang tải dữ liệu Hóa đơn..."
        isEmpty={invoices.length === 0 || filteredInvoices.length === 0}
        emptyMessage={invoices.length === 0 ? 'Chưa có dữ liệu hóa đơn nào' : 'Không tìm thấy hóa đơn nào phù hợp với bộ lọc'}
        emptyIcon={invoices.length === 0 ? 'bi-inbox' : 'bi-search'}
        emptyAction={
          invoices.length > 0 && filteredInvoices.length === 0 ? (
            <button
              type="button"
              className="management-secondary-button mt-3"
              onClick={handleResetFilter}
            >
              <i className="bi bi-arrow-counterclockwise"></i> Đặt lại bộ lọc
            </button>
          ) : null
        }
      >
        {filteredInvoices.map((inv) => {
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
              {isAdmin && (
                <td className="text-center actions-cell">
                  <ActionMenu onEdit={() => handleOpenEdit(inv)} onDelete={() => handleOpenDelete(inv.id)} />
                </td>
              )}
            </tr>
          )
        })}
      </ManagementTable>


      <ManagementModal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={editingId ? `Cập nhật Hóa đơn #${editingId}` : 'Tạo mới Hóa đơn'}
        titleId="invoice-modal-title"
        isSubmitting={submitting}
      >
        <form onSubmit={handleSave}>
          <div className="modal-body">
            {formError && (
              <div className="alert alert-danger py-2 small mb-3">
                <i className="bi bi-exclamation-triangle me-1"></i> {formError}
              </div>
            )}
            <div className="mb-3">
              <label htmlFor="invoice-member-select" className="form-label small fw-bold">Chọn Hội viên</label>
              <select
                id="invoice-member-select"
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
                <label htmlFor="invoice-amount" className="form-label small fw-bold">Tổng tiền (VNĐ)</label>
                <input
                  id="invoice-amount"
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
                <label htmlFor="invoice-amount-paid" className="form-label small fw-bold">Đã thanh toán (VNĐ)</label>
                <input
                  id="invoice-amount-paid"
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
              <label htmlFor="invoice-status" className="form-label small fw-bold">Trạng thái thanh toán</label>
              <select
                id="invoice-status"
                className="form-select"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="pending">Chờ thanh toán</option>
                <option value="partially_paid">Thanh toán một phần</option>
                <option value="paid">Đã thanh toán</option>
                <option value="cancelled">Đã hủy</option>
              </select>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="management-secondary-button" onClick={handleCloseModal} disabled={submitting}>
              Hủy
            </button>
            <button type="submit" className="management-primary-button" disabled={submitting}>
              {submitting ? 'Đang lưu...' : (editingId ? 'Lưu thay đổi' : 'Thêm mới')}
            </button>
          </div>
        </form>
      </ManagementModal>

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Hủy hóa đơn thanh toán"
        message={`Hóa đơn #${deleteConfirm.id} sẽ bị xóa khỏi hệ thống tài chính. Dữ liệu thanh toán liên quan có thể cần đối soát lại.`}
        confirmText="Hủy hóa đơn"
        cancelText="Giữ lại"
        variant="danger"
        loading={deleteConfirm.loading}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, id: null, loading: false })}
      />
    </div>
  )
}
