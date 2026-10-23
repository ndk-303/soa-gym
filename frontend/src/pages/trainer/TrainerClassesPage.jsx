import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { classesApi, slotsApi, bookingsApi } from '../../services/api'
import StatusBadge from '../../components/StatusBadge'
import { ManagementHeader, ManagementFilterBar } from '../../components/ManagementUI'
import LoadingSpinner from '../../components/LoadingSpinner'

export default function TrainerClassesPage() {
  const { user } = useAuth()
  const [classes, setClasses] = useState([])
  const [slots, setSlots] = useState([])
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [classesRes, slotsRes, bookingsRes] = await Promise.allSettled([
        classesApi.getDetailed(),
        slotsApi.getDetailed(),
        bookingsApi.getDetailed(),
      ])

      if (classesRes.status === 'fulfilled') setClasses(classesRes.value.data || [])
      if (slotsRes.status === 'fulfilled') setSlots(slotsRes.value.data || [])
      if (bookingsRes.status === 'fulfilled') setBookings(bookingsRes.value.data || [])
    } catch {
      setError('Lỗi khi tải danh sách lớp học phụ trách')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const trainerId = Number(user?.id)

  // Classes assigned to current trainer
  const myClasses = useMemo(() => {
    return classes.filter((c) => Number(c.trainer_id) === trainerId)
  }, [classes, trainerId])

  // Categories list
  const categoryOptions = useMemo(() => {
    const cats = Array.from(new Set(myClasses.map((c) => c.category).filter(Boolean)))
    return [
      { value: 'all', label: 'Tất cả bộ môn' },
      ...cats.map((cat) => ({ value: cat, label: cat })),
    ]
  }, [myClasses])

  // Filtered classes
  const filteredClasses = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    return myClasses.filter((cls) => {
      const matchSearch =
        !q ||
        (cls.name && cls.name.toLowerCase().includes(q)) ||
        (cls.description && cls.description.toLowerCase().includes(q))
      const matchCat = categoryFilter === 'all' || cls.category === categoryFilter
      return matchSearch && matchCat
    })
  }, [myClasses, searchTerm, categoryFilter])

  const handleResetFilter = () => {
    setSearchTerm('')
    setCategoryFilter('all')
  }

  return (
    <div>
      <ManagementHeader
        title="Lớp học phụ trách"
        subtitle={`Danh sách các bộ môn bạn được phân công làm Huấn luyện viên chính`}
        onRefresh={loadData}
        loading={loading}
      />

      {error && (
        <div className="management-error" role="alert">
          <i className="bi bi-exclamation-triangle-fill flex-shrink-0"></i>
          <div>{error}</div>
        </div>
      )}

      <ManagementFilterBar
        searchPlaceholder="Tìm theo tên lớp, mô tả..."
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        filterValue={categoryFilter}
        onFilterChange={setCategoryFilter}
        filterOptions={categoryOptions}
        onReset={handleResetFilter}
        matchCount={filteredClasses.length}
        totalCount={myClasses.length}
      />

      {loading ? (
        <LoadingSpinner message="Đang tải danh sách lớp học..." />
      ) : myClasses.length === 0 || filteredClasses.length === 0 ? (
        <div className="management-empty">
          <i
            className={`bi ${myClasses.length === 0 ? 'bi-inbox' : 'bi-search'} management-empty-icon`}
          ></i>
          <p>
            {myClasses.length === 0
              ? 'Bạn hiện chưa được phân công lớp học nào trong hệ thống'
              : 'Không tìm thấy lớp học nào phù hợp với bộ lọc'}
          </p>
          {myClasses.length > 0 && filteredClasses.length === 0 && (
            <button
              type="button"
              className="management-secondary-button mt-3"
              onClick={handleResetFilter}
            >
              <i className="bi bi-arrow-counterclockwise"></i> Đặt lại bộ lọc
            </button>
          )}
        </div>
      ) : (
        <div className="row g-4">
          {filteredClasses.map((cls) => {
            const classSlots = slots.filter((s) => Number(s.class_id) === Number(cls.id))
            const classSlotIds = new Set(classSlots.map((s) => Number(s.id)))
            const classBookings = bookings.filter(
              (b) => classSlotIds.has(Number(b.slot_id)) && b.status === 'confirmed',
            )

            return (
              <div key={cls.id} className="col-12 col-md-6 col-xl-4">
                <div className="trainer-card h-100">
                  <div>
                    <div className="trainer-card-header">
                      <div>
                        <h3 className="trainer-class-title">{cls.name}</h3>
                        <span className="trainer-class-category mt-1">
                          <i className="bi bi-tag-fill"></i>
                          {cls.category || 'Thể thao'}
                        </span>
                      </div>
                      <StatusBadge status={cls.is_active ? 'active' : 'inactive'} />
                    </div>

                    <p className="trainer-class-desc">
                      {cls.description || 'Chưa có thông tin mô tả chi tiết cho lớp học này.'}
                    </p>
                  </div>

                    <div className="trainer-card-stats">
                      <div className="trainer-stat-item">
                        <span className="trainer-stat-label">Số ca tập đã mở</span>
                        <span className="trainer-stat-val">
                          <i className="bi bi-clock me-1 text-muted"></i>
                          {classSlots.length} ca
                        </span>
                      </div>

                      <div className="trainer-stat-item">
                        <span className="trainer-stat-label">Lượt học viên</span>
                        <span className="trainer-stat-val">
                          <i className="bi bi-people-fill me-1 text-muted"></i>
                          {classBookings.length} lượt
                        </span>
                      </div>
                    </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
