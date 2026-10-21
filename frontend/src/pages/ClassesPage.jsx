import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { classesApi, usersApi } from '../services/api'
import StatusBadge from '../components/StatusBadge'
import { ActionMenu, ManagementHeader, ManagementTable, ManagementFilterBar } from '../components/ManagementUI'
import ConfirmDialog from '../components/ConfirmDialog'

export default function ClassesPage() {
  const { isAdmin } = useAuth()
  const [classes, setClasses] = useState([])

  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')

  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null, loading: false })

  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    category: 'Yoga',
    trainer_id: '',
    is_active: true,
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
      const [classesRes, usersRes] = await Promise.all([
        classesApi.getDetailed(),
        usersApi.getAll(),
      ])
      setClasses(classesRes.data)
      setUsers(usersRes.data)
    } catch (err) {
      setError(err.message || 'Lỗi khi tải danh sách lớp học')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenAdd = () => {
    setEditingId(null)
    const trainers = users.filter((u) => u.role === 'trainer')
    const defaultTrainer = trainers.length > 0 ? trainers[0] : (users[0] || null)
    setFormData({
      name: '',
      category: 'Yoga',
      trainer_id: defaultTrainer ? defaultTrainer.id : '',
      is_active: true,
    })
    setFormError(null)
    setShowModal(true)
  }

  const handleOpenEdit = (c) => {
    setEditingId(c.id)
    setFormData({
      name: c.name,
      category: c.category,
      trainer_id: c.trainer_id,
      is_active: c.is_active,
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
        category: formData.category,
        trainer_id: Number(formData.trainer_id),
        is_active: Boolean(formData.is_active),
      }
      if (editingId) {
        await classesApi.update(editingId, payload)
      } else {
        await classesApi.create(payload)
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
      await classesApi.delete(deleteConfirm.id)
      setDeleteConfirm({ isOpen: false, id: null, loading: false })
      fetchData()
    } catch (err) {
      setDeleteConfirm({ isOpen: false, id: null, loading: false })
      setError('Lỗi xóa: ' + (err.response?.data?.detail || err.message))
    }
  }

  const userMap = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users])

  const categoryOptions = useMemo(() => {
    const cats = Array.from(new Set(classes.map((c) => c.category).filter(Boolean)))
    return [
      { value: 'all', label: 'Tất cả bộ môn' },
      ...cats.map((cat) => ({ value: cat, label: cat })),
    ]
  }, [classes])

  const filteredClasses = useMemo(() => {
    return classes.filter((c) => {
      const q = searchTerm.trim().toLowerCase()
      const trainer = c.trainer || userMap[c.trainer_id]
      const matchSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        (c.category && c.category.toLowerCase().includes(q)) ||
        (trainer?.email && trainer.email.toLowerCase().includes(q)) ||
        String(c.id).includes(q)
      const matchCategory = categoryFilter === 'all' || c.category === categoryFilter
      return matchSearch && matchCategory
    })
  }, [classes, searchTerm, categoryFilter, userMap])

  const handleResetFilter = () => {
    setSearchTerm('')
    setCategoryFilter('all')
  }

  return (
    <div>
      <ManagementHeader
        title="Lớp học"
        description="Quản lý bộ môn, huấn luyện viên và trạng thái lớp học"
        onRefresh={fetchData}
        onAdd={isAdmin ? handleOpenAdd : undefined}
        addLabel="Thêm lớp học"
        count={classes.length}
      />

      {error && (
        <div className="management-error" role="alert">
          <i className="bi bi-exclamation-circle me-2"></i> {error}
        </div>
      )}

      <ManagementFilterBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Tìm theo tên lớp, bộ môn hoặc HLV..."
        filterValue={categoryFilter}
        onFilterChange={setCategoryFilter}
        filterOptions={categoryOptions}
        filterLabel="Lọc theo bộ môn"
        totalCount={classes.length}
        filteredCount={filteredClasses.length}
        onReset={handleResetFilter}
      />

      <ManagementTable
        columns={[
          { key: 'name', label: 'Tên lớp', width: isAdmin ? '28%' : '35%' },
          { key: 'category', label: 'Bộ môn', width: isAdmin ? '18%' : '25%' },
          { key: 'trainer', label: 'Huấn luyện viên', width: isAdmin ? '19%' : '25%' },
          { key: 'status', label: 'Trạng thái', width: isAdmin ? '15%' : '15%' },
          ...(isAdmin ? [{ key: 'actions', label: 'Hành động', width: '190px', align: 'center' }] : []),
        ]}
        loading={loading}
        loadingMessage="Đang tải dữ liệu Lớp học..."
        isEmpty={classes.length === 0 || filteredClasses.length === 0}
        emptyMessage={classes.length === 0 ? 'Chưa có dữ liệu lớp học nào' : 'Không tìm thấy lớp học nào phù hợp với bộ lọc'}
        emptyIcon={classes.length === 0 ? 'bi-inbox' : 'bi-search'}
        emptyAction={
          classes.length > 0 && filteredClasses.length === 0 ? (
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
        {filteredClasses.map((c) => {
          const trainer = c.trainer || userMap[c.trainer_id]
          return (
            <tr key={c.id}>
              <td><div className="primary-cell">{c.name}</div><div className="secondary-cell">Lớp #{c.id}</div></td>
              <td><span className="semantic-badge">{c.category}</span></td>
              <td>
                <span className="linked-value"><i className="bi bi-person-workspace"></i>{trainer ? trainer.email : `Huấn luyện viên #${c.trainer_id}`}</span>
              </td>
              <td>
                <StatusBadge status={c.is_active ? 'active' : 'inactive'} />
              </td>
              {isAdmin && (
                <td className="text-end">
                  <ActionMenu onEdit={() => handleOpenEdit(c)} onDelete={() => handleOpenDelete(c.id)} />
                </td>
              )}
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
          aria-labelledby="class-modal-title"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.45)' }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header">
                <h5 id="class-modal-title" className="modal-title fw-bold">
                  {editingId ? `Cập nhật Lớp học #${editingId}` : 'Thêm mới Lớp học'}
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
                    <label htmlFor="class-name" className="form-label small fw-bold">Tên lớp học</label>
                    <input
                      id="class-name"
                      type="text"
                      className="form-control"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      placeholder="Ví dụ: Yoga Bình Minh"
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="class-category" className="form-label small fw-bold">Thể loại (Category)</label>
                    <input
                      id="class-category"
                      type="text"
                      className="form-control"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      required
                      placeholder="Yoga, Boxing, Cardio, Pilates..."
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="class-trainer-id" className="form-label small fw-bold">Chọn Huấn luyện viên phụ trách</label>
                    <select
                      id="class-trainer-id"
                      className="form-select"
                      value={formData.trainer_id}
                      onChange={(e) => setFormData({ ...formData, trainer_id: e.target.value })}
                      required
                    >
                      <option value="">-- Chọn huấn luyện viên --</option>
                      {users
                        .filter((u) => u.role === 'trainer' || String(u.id) === String(formData.trainer_id))
                        .map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.email}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="form-check form-switch mb-2">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="classActiveSwitch"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    />
                    <label className="form-check-label small" htmlFor="classActiveSwitch">
                      Đang mở lớp hoạt động
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
        title="Xác nhận xóa Lớp học"
        message={`Bạn có chắc muốn xóa Lớp học #${deleteConfirm.id}? Thao tác này sẽ ảnh hưởng đến các ca tập thuộc lớp này.`}
        confirmText="Xóa lớp học"
        cancelText="Hủy bỏ"
        variant="danger"
        loading={deleteConfirm.loading}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, id: null, loading: false })}
      />
    </div>
  )
}
