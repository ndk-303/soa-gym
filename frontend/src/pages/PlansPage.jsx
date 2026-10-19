import { useState, useEffect } from 'react'
import { plansApi } from '../services/api'
import StatusBadge from '../components/StatusBadge'
import { ActionMenu, ManagementHeader, ManagementTable } from '../components/ManagementUI'
import { formatVnd } from '../components/managementUtils'

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
      <ManagementHeader title="Gói tập" description="Quản lý thời hạn và mức giá các gói thành viên" onRefresh={fetchPlans} onAdd={handleOpenAdd} addLabel="Thêm gói tập" />

      {error && (
        <div className="management-error" role="alert">
          <i className="bi bi-exclamation-circle me-2"></i> {error}
        </div>
      )}

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
        isEmpty={plans.length === 0}
        emptyMessage="Chưa có dữ liệu gói tập nào"
      >
                {plans.map((p) => (
                  <tr key={p.id}>
                    <td><div className="primary-cell">{p.name}</div><div className="secondary-cell">Gói #{p.id}</div></td>
                    <td>{p.duration_days} ngày</td>
                    <td className="money">{formatVnd(p.price)}</td>
                    <td>
                      <StatusBadge status={p.is_active ? 'active' : 'inactive'} />
                    </td>
                    <td className="text-end">
                      <ActionMenu onEdit={() => handleOpenEdit(p)} onDelete={() => handleDelete(p.id)} />
                    </td>
                  </tr>
                ))}
      </ManagementTable>

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
