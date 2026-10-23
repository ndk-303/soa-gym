import { useState, useEffect } from 'react'
import { plansApi, membersApi, invoicesApi } from '../../services/api'
import LoadingSpinner from '../../components/LoadingSpinner'
import { formatVnd } from '../../components/managementUtils'
import { ManagementModal } from '../../components/ManagementUI'
import { useToast } from '../../context/ToastContext'

export default function MemberPlansPage({ currentMember, onMemberRefresh, onTabChange }) {
  const toast = useToast()
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
      toast.success(`Đã đăng ký ${selectedPlan.name} thành công!`)
      onMemberRefresh?.()

      setTimeout(() => {
        handleCloseModal()
        onTabChange?.('dashboard')
      }, 1200)
    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.message || 'Lỗi đăng ký gói tập'
      setRegisterError(errorMsg)
      toast.error(errorMsg)
    } finally {
      setRegistering(false)
    }
  }

  const getPlanFeatures = (plan) => {
    const defaultFeatures = [
      'Tập luyện không giới hạn thời gian',
      'Sử dụng toàn bộ trang thiết bị và máy tập tiêu chuẩn',
      'Tủ đồ cá nhân thông minh và phòng tắm nóng lạnh',
      'Đo và tư vấn chỉ số cơ thể InBody định kỳ',
    ]
    if (Number(plan.price) >= 1000000) {
      defaultFeatures.push('Ưu tiên đặt chỗ ca tập & các lớp Yoga, HIIT')
      defaultFeatures.push('02 buổi định hướng tập luyện cùng Huấn luyện viên')
    }
    return defaultFeatures
  }

  return (
    <div className="member-plans-page">
      <div className="management-header">
        <div>
          <h1>Danh mục Gói tập</h1>
          <p>Lựa chọn gói tập phù hợp để bắt đầu hành trình rèn luyện sức khỏe tại SOA Gym Center</p>
        </div>
        <button className="management-secondary-button" type="button" onClick={fetchPlans}>
          <i className="bi bi-arrow-clockwise"></i> Làm mới
        </button>
      </div>

      {error && (
        <div className="management-error" role="alert">
          <i className="bi bi-exclamation-circle"></i>
          <span>{error}</span>
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
        <div className="member-cards-grid">
          {plans.map((p) => {
            const isCurrentPlan = Number(currentMember?.membership_plan_id) === Number(p.id)

            return (
              <div
                key={p.id}
                className={`member-plan-card ${isCurrentPlan ? 'is-active-plan' : ''}`}
              >
                {isCurrentPlan && (
                  <span className="active-plan-badge-tag">Gói hiện tại</span>
                )}

                <div>
                  <div className="member-plan-header">
                    <h2 className="member-plan-title">{p.name}</h2>
                    <span className="semantic-badge is-success">
                      {p.duration_days} ngày
                    </span>
                  </div>

                  <div className="member-plan-price">{formatVnd(p.price)}</div>
                  <div className="member-plan-duration">Thời hạn: {p.duration_days} ngày sử dụng</div>

                  <ul className="member-features-list">
                    {getPlanFeatures(p).map((feature, idx) => (
                      <li key={idx}>
                        <i className="bi bi-check-circle-fill"></i>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  {isCurrentPlan ? (
                    <button
                      type="button"
                      className="management-secondary-button w-100 justify-content-center"
                      disabled
                    >
                      <i className="bi bi-check2"></i> Đang sử dụng
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="management-primary-button w-100 justify-content-center"
                      onClick={() => handleOpenConfirm(p)}
                    >
                      <span>Đăng ký gói này</span>
                      <i className="bi bi-arrow-right"></i>
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <ManagementModal
        isOpen={Boolean(selectedPlan)}
        onClose={handleCloseModal}
        title="Xác nhận Đăng ký Gói tập"
        titleId="plan-confirm-modal-title"
        isSubmitting={registering}
      >
        <div className="modal-body">
          {registerSuccess ? (
            <div className="management-error" style={{ background: 'var(--color-success-bg)', borderColor: 'var(--color-success-border)', color: 'var(--color-success)' }}>
              <i className="bi bi-check-circle-fill fs-5"></i>
              <div>{registerSuccess}</div>
            </div>
          ) : (
            <>
              {registerError && (
                <div className="management-error">
                  <i className="bi bi-exclamation-triangle"></i>
                  <div>{registerError}</div>
                </div>
              )}
              <p style={{ color: 'var(--text-secondary)', marginBottom: '14px', fontSize: '14px' }}>
                Bạn có chắc muốn đăng ký gói tập sau đây?
              </p>
              {selectedPlan && (
                <div style={{ padding: '16px', background: 'var(--page-background)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', marginBottom: '14px' }}>
                  <div style={{ fontWeight: 750, color: 'var(--text-primary)', fontSize: '16px' }}>
                    {selectedPlan.name}
                  </div>
                  <div style={{ color: 'var(--color-primary)', fontWeight: 750, fontSize: '26px', marginTop: '4px', fontVariantNumeric: 'tabular-nums' }}>
                    {formatVnd(selectedPlan.price)}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '11.5px', marginTop: '4px' }}>
                    <i className="bi bi-clock me-1"></i> Thời hạn sử dụng: {selectedPlan.duration_days} ngày
                  </div>
                </div>
              )}
              <div style={{ color: 'var(--text-muted)', fontSize: '11.5px' }}>
                * Chế độ kiểm thử: Gói tập sẽ được tự động kích hoạt ngay lập tức và sinh hóa đơn đã thanh toán.
              </div>
            </>
          )}
        </div>
        {!registerSuccess && (
          <div className="modal-footer">
            <button type="button" className="management-secondary-button" onClick={handleCloseModal} disabled={registering}>
              Hủy bỏ
            </button>
            <button
              type="button"
              className="management-primary-button"
              onClick={handleConfirmRegister}
              disabled={registering}
            >
              {registering ? 'Đang kích hoạt...' : 'Xác nhận đăng ký'}
            </button>
          </div>
        )}
      </ManagementModal>
    </div>
  )
}
