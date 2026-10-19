import { useState, useEffect } from 'react'
import { plansApi, membersApi, invoicesApi } from '../../services/api'
import LoadingSpinner from '../../components/LoadingSpinner'
import { formatVnd } from '../../components/managementUtils'

export default function MemberPlansPage({ currentMember, onMemberRefresh, onTabChange }) {
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Registration modal state
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [registering, setRegistering] = useState(false)
  const [registerSuccess, setRegisterSuccess] = useState(null)
  const [registerError, setRegisterError] = useState(null)

  useEffect(() => {
    fetchPlans()
  }, [])

  async function fetchPlans() {
    setLoading(true)
    setError(null)
    try {
      const res = await plansApi.getAll()
      const allPlans = res.data || []
      setPlans(allPlans.filter((p) => p.is_active !== false))
    } catch {
      setError('Lỗi khi tải danh mục gói tập')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenConfirm = (plan) => {
    setSelectedPlan(plan)
    setRegisterSuccess(null)
    setRegisterError(null)
  }

  const handleCloseModal = () => {
    setSelectedPlan(null)
    setRegisterError(null)
  }

  const handleConfirmRegister = async () => {
    if (!selectedPlan || !currentMember?.id) return
    setRegistering(true)
    setRegisterError(null)
    try {
      // 1. Update member's plan
      await membersApi.update(currentMember.id, {
        user_id: currentMember.user_id,
        full_name: currentMember.full_name,
        email: currentMember.email,
        status: 'active',
        membership_plan_id: selectedPlan.id,
      })

      // 2. Create paid invoice for test environment
      await invoicesApi.create({
        member_id: currentMember.id,
        amount: Number(selectedPlan.price),
        amount_paid: Number(selectedPlan.price),
        status: 'paid',
      })

      setRegisterSuccess(`Chúc mừng bạn đã đăng ký thành công ${selectedPlan.name}! Gói tập đã được kích hoạt.`)
      onMemberRefresh?.()

      setTimeout(() => {
        handleCloseModal()
        onTabChange?.('dashboard')
      }, 1500)
    } catch (err) {
      setRegisterError(err.response?.data?.detail || err.message || 'Lỗi đăng ký gói tập')
    } finally {
      setRegistering(false)
    }
  }

  const getPlanFeatures = (plan) => {
    const defaultFeatures = [
      'Tập luyện không giới hạn thời gian',
      'Sử dụng toàn bộ máy tập và khu tạ tiêu chuẩn',
      'Tủ đồ thông minh và phòng tắm nóng lạnh',
      'Đo và tư vấn chỉ số InBody miễn phí',
    ]
    if (Number(plan.price) >= 1000000) {
      defaultFeatures.push('Ưu tiên đặt chỗ các ca tập & lớp học chuyên đề')
      defaultFeatures.push('Miễn phí 02 buổi hướng dẫn cùng HLV cá nhân')
    }
    return defaultFeatures
  }

  return (
    <div className="member-plans-page">
      <div className="management-header">
        <div>
          <h1>Danh mục Gói tập</h1>
          <p>Lựa chọn gói tập phù hợp để bắt đầu hành trình nâng cao sức khỏe tại SOA Gym Center</p>
        </div>
        <button className="management-secondary-button" type="button" onClick={fetchPlans}>
          <i className="bi bi-arrow-clockwise"></i> Làm mới
        </button>
      </div>

      {error && (
        <div className="management-error" role="alert">
          <i className="bi bi-exclamation-circle me-2"></i> {error}
        </div>
      )}

      {loading ? (
        <LoadingSpinner message="Đang tải danh mục gói tập..." />
      ) : plans.length === 0 ? (
        <div className="management-empty">
          <i className="bi bi-card-list"></i>
          <p>Hiện chưa có gói tập nào khả dụng</p>
        </div>
      ) : (
        <div className="row g-4">
          {plans.map((p) => {
            const isCurrentPlan = Number(currentMember?.membership_plan_id) === Number(p.id)

            return (
              <div key={p.id} className="col-12 col-md-6 col-lg-4">
                <div
                  className="card h-100 border p-4 shadow-sm"
                  style={{
                    borderRadius: 'var(--radius-md, 10px)',
                    borderColor: isCurrentPlan ? 'var(--color-primary)' : 'var(--border-color)',
                    backgroundColor: isCurrentPlan ? '#f8fbff' : '#ffffff',
                    position: 'relative',
                  }}
                >
                  {isCurrentPlan && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '-12px',
                        right: '18px',
                        background: 'var(--color-primary)',
                        color: '#fff',
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 10px',
                        borderRadius: 'var(--radius-sm)',
                        letterSpacing: '0.04em',
                      }}
                    >
                      GÓI HIỆN TẠI
                    </div>
                  )}

                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <h3 className="h5 fw-bold text-dark mb-0">{p.name}</h3>
                    <span className="badge bg-light text-primary border border-primary-subtle px-2 py-1">
                      {p.duration_days} ngày
                    </span>
                  </div>

                  <div className="my-3">
                    <div className="display-6 fw-bold text-primary mb-1" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {formatVnd(p.price)}
                    </div>
                    <div className="small text-muted">Thời hạn: {p.duration_days} ngày sử dụng</div>
                  </div>

                  <hr className="my-3 opacity-10" />

                  <div className="mb-4 flex-grow-1">
                    <div className="small fw-bold text-uppercase text-secondary mb-2" style={{ letterSpacing: '0.04em' }}>
                      Quyền lợi gói tập:
                    </div>
                    <ul className="list-unstyled mb-0">
                      {getPlanFeatures(p).map((feature, idx) => (
                        <li key={idx} className="small text-secondary mb-2 d-flex align-items-start gap-2">
                          <i className="bi bi-check-circle-fill text-success flex-shrink-0 mt-1"></i>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-auto">
                    {isCurrentPlan ? (
                      <button
                        type="button"
                        className="btn btn-outline-primary w-100 py-2 fw-semibold"
                        style={{ borderRadius: 'var(--radius-sm, 6px)' }}
                        disabled
                      >
                        <i className="bi bi-check2 me-1"></i> Đang kích hoạt
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-primary w-100 py-2 fw-bold shadow-sm"
                        style={{ borderRadius: 'var(--radius-sm, 6px)' }}
                        onClick={() => handleOpenConfirm(p)}
                      >
                        Đăng ký gói này <i className="bi bi-arrow-right ms-1"></i>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Confirmation Modal */}
      {selectedPlan && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Xác nhận Đăng ký Gói tập</h5>
                <button type="button" className="btn-close" onClick={handleCloseModal}></button>
              </div>
              <div className="modal-body">
                {registerSuccess ? (
                  <div className="alert alert-success d-flex align-items-center gap-2 mb-0">
                    <i className="bi bi-check-circle-fill fs-5"></i>
                    <div>{registerSuccess}</div>
                  </div>
                ) : (
                  <>
                    {registerError && (
                      <div className="alert alert-danger py-2 small mb-3">
                        <i className="bi bi-exclamation-triangle me-1"></i> {registerError}
                      </div>
                    )}
                    <p className="text-secondary mb-3">
                      Bạn có chắc muốn đăng ký gói tập sau đây?
                    </p>
                    <div className="p-3 bg-light rounded-3 mb-3 border">
                      <div className="fw-bold text-dark fs-5">{selectedPlan.name}</div>
                      <div className="text-primary fw-bold fs-4 mt-1">{formatVnd(selectedPlan.price)}</div>
                      <div className="small text-muted mt-1">
                        <i className="bi bi-clock me-1"></i> Thời hạn sử dụng: {selectedPlan.duration_days} ngày
                      </div>
                    </div>
                    <div className="small text-muted">
                      * Chế độ kiểm thử: Gói tập sẽ được tự động kích hoạt ngay lập tức và sinh hóa đơn đã thanh toán.
                    </div>
                  </>
                )}
              </div>
              {!registerSuccess && (
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={handleCloseModal} disabled={registering}>
                    Hủy bỏ
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm fw-bold px-3"
                    onClick={handleConfirmRegister}
                    disabled={registering}
                  >
                    {registering ? 'Đang kích hoạt...' : 'Xác nhận đăng ký'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
