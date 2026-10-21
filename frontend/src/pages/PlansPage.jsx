import { useState, useEffect, useMemo } from 'react'
import { plansApi } from '../services/api'
import StatusBadge from '../components/StatusBadge'
import { ActionMenu, ManagementHeader, ManagementTable, ManagementFilterBar } from '../components/ManagementUI'
import { formatVnd } from '../components/managementUtils'
import ConfirmDialog from '../components/ConfirmDialog'

export default function PlansPage() {
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null, loading: false })

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

  async function fetchPlans() {
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

  const handleOpenDelete = (id) => {
    setDeleteConfirm({ isOpen: true, id, loading: false })
  }

  const handleConfirmDelete = async () => {
    if (!deleteConfirm.id) return
    setDeleteConfirm((prev) => ({ ...prev, loading: true }))
    try {
      await plansApi.delete(deleteConfirm.id)
      setDeleteConfirm({ isOpen: false, id: null, loading: false })
      fetchData()
    } catch (err) {
      setDeleteConfirm({ isOpen: false, id: null, loading: false })
      setError('Lỗi xóa: ' + (err.response?.data?.detail || err.message))
    }
  }

  const statusOptions = [
    { value: 'all', label: 'Tất cả trạng thái' },
    { value: 'active', label: 'active (Đang mở bán)' },
    { value: 'inactive', label: 'inactive (Tạm ẩn)' },
  ]

  const filteredPlans = useMemo(() => {
    return plans.filter((p) => {
      const q = searchTerm.trim().toLowerCase()
      const matchSearch =
        !q ||
        (p.name && p.name.toLowerCase().includes(q)) ||
        String(p.id).includes(q)
      const isAct = Boolean(p.is_active)
      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && isAct) ||
        (statusFilter === 'inactive' && !isAct)
      return matchSearch && matchStatus
    })
  }, [plans, searchTerm, statusFilter])

  const handleResetFilter = () => {
    setSearchTerm('')
    setStatusFilter('all')
  }

  return (
    <div>
      <ManagementHeader
        title="Gói tập"
        description="Quản lý thời hạn và mức giá các gói thành viên"
        onRefresh={fetchPlans}
        onAdd={handleOpenAdd}
        addLabel="Thêm gói tập"
        count={plans.length}
      />

      {error && (
        <div className="management-error" role="alert">
          <i className="bi bi-exclamation-circle me-2"></i> {error}
        </div>
      )}

      <ManagementFilterBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Tìm theo tên gói tập hoặc ID..."
        filterValue={statusFilter}
        onFilterChange={setStatusFilter}
        filterOptions={statusOptions}
        filterLabel="Lọc theo trạng thái mở bán"
        totalCount={plans.length}
        filteredCount={filteredPlans.length}
        onReset={handleResetFilter}
      />

      <ManagementTable
        columns={[
          { key: 'name', label: 'Tên gói tập', width: '34%' },
          { key: 'duration', label: 'Thời hạn', width: '17%' },
          { key: 'price', label: 'Giá', width: '18%', align: 'right' },
          { key: 'status', label: 'Trạng thái', width: '16%' },
          { key: 'actions', label: 'Hành động', width: '190px', align: 'center' },
        ]}
        loading={loading}
        loadingMessage="Đang tải dữ liệu Gói tập..."
        isEmpty={plans.length === 0 || filteredPlans.length === 0}
        emptyMessage={plans.length === 0 ? 'Chưa có dữ liệu gói tập nào' : 'Không tìm thấy gói tập nào phù hợp với bộ lọc'}
        emptyIcon={plans.length === 0 ? 'bi-inbox' : 'bi-search'}
        emptyAction={
          plans.length > 0 && filteredPlans.length === 0 ? (
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
        {filteredPlans.map((p) => (
                  <tr key={p.id}>
                    <td><div className="primary-cell">{p.name}</div><div className="secondary-cell">Gói #{p.id}</div></td>
                    <td>{p.duration_days} ngày</td>
                    <td className="money">{formatVnd(p.price)}</td>
                    <td>
                      <StatusBadge status={p.is_active ? 'active' : 'inactive'} />
                    </td>
                    <td className="text-end">
                      <ActionMenu onEdit={() => handleOpenEdit(p)} onDelete={() => handleOpenDelete(p.id)} />
                    </td>
                  </tr>
                ))}
      </ManagementTable>

      {showModal && (
        <div
          className="modal show d-block"
          tabIndex="-1"
          role="dialog"
          aria-modal="true"
          aria-labelledby="plan-modal-title"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.45)' }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header">
                <h5 id="plan-modal-title" className="modal-title fw-bold">
                  {editingId ? `Cập nhật Gói tập #${editingId}` : 'Thêm mới Gói tập'}
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
                    <label htmlFor="plan-name" className="form-label small fw-bold">Tên gói tập</label>
                    <input
                      id="plan-name"
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
                      <label htmlFor="plan-duration" className="form-label small fw-bold">Thời hạn (Ngày)</label>
                      <input
                        id="plan-duration"
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
                      <label htmlFor="plan-price" className="form-label small fw-bold">Giá tiền (VNĐ)</label>
                      <input
                        id="plan-price"
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
        title="Xác nhận xóa Gói tập"
        message={`Bạn có chắc muốn xóa Gói tập #${deleteConfirm.id}? Thao tác này có thể ảnh hưởng đến các hội viên đang tham chiếu gói này.`}
        confirmText="Xóa gói tập"
        cancelText="Hủy bỏ"
        variant="danger"
        loading={deleteConfirm.loading}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, id: null, loading: false })}
      />
    </div>
  )
}
