import { useState, useEffect, useCallback } from 'react'
import { invoicesApi } from '../../services/api'
import LoadingSpinner from '../../components/LoadingSpinner'
import StatusBadge from '../../components/StatusBadge'
import { formatVnd, formatDateTime } from '../../components/managementUtils'

export default function MemberHistoryPage({ currentMember }) {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchInvoices = useCallback(async () => {
    if (!currentMember?.id) return
    setLoading(true)
    setError(null)
    try {
      const res = await invoicesApi.getAll()
      const allInvoices = res.data || []
      // Filter invoices strictly for current member
      const memberInvoices = allInvoices.filter(
        (inv) => String(inv.member_id) === String(currentMember.id)
      )
      // Sort most recent first
      setInvoices(memberInvoices.sort((a, b) => b.id - a.id))
    } catch {
      setError('Lỗi khi tải lịch sử giao dịch')
    } finally {
      setLoading(false)
    }
  }, [currentMember?.id])

  useEffect(() => {
    fetchInvoices()
  }, [fetchInvoices])

  const totalSpent = invoices
    .filter((inv) => inv.status === 'paid')
    .reduce((sum, inv) => sum + (Number(inv.amount_paid) || Number(inv.amount) || 0), 0)

  return (
    <div className="member-history-page">
      <div className="management-header">
        <div>
          <h1>Lịch sử giao dịch</h1>
          <p>Xem danh sách các hóa đơn, khoản phí đăng ký gói tập và thanh toán cá nhân</p>
        </div>
        <button className="management-secondary-button" type="button" onClick={fetchInvoices}>
          <i className="bi bi-arrow-clockwise"></i> Làm mới
        </button>
      </div>

      {error && (
        <div className="management-error" role="alert">
          <i className="bi bi-exclamation-circle me-2"></i> {error}
        </div>
      )}

      {/* Summary Highlights */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
        <div className="kpi-card">
          <div className="kpi-card-top">
            <span className="kpi-icon"><i className="bi bi-wallet2"></i></span>
            <span className="kpi-group-tag">Chi tiêu</span>
          </div>
          <div>
            <div className="kpi-card-value" style={{ color: 'var(--color-primary)' }}>
              {formatVnd(totalSpent)}
            </div>
            <div className="kpi-card-label">Tổng chi tiêu thành công</div>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-top">
            <span className="kpi-icon"><i className="bi bi-receipt"></i></span>
            <span className="kpi-group-tag">Giao dịch</span>
          </div>
          <div>
            <div className="kpi-card-value">
              {invoices.length} hóa đơn
            </div>
            <div className="kpi-card-label">Tổng số giao dịch</div>
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner message="Đang tải lịch sử giao dịch..." />
      ) : invoices.length === 0 ? (
        <div className="management-empty">
          <i className="bi bi-receipt-cutoff"></i>
          <p>Bạn chưa có giao dịch hóa đơn nào</p>
        </div>
      ) : (
        <div className="management-table-shell">
          <div className="management-table-scroll">
            <table className="management-table">
              <thead>
                <tr>
                  <th style={{ width: '15%' }}>Mã hóa đơn</th>
                  <th style={{ width: '30%' }}>Khoản mục</th>
                  <th style={{ width: '18%' }} className="text-end">Số tiền</th>
                  <th style={{ width: '18%' }} className="text-end">Đã thanh toán</th>
                  <th style={{ width: '19%' }}>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td>
                      <span className="technical-id">#HĐ-{inv.id}</span>
                    </td>
                    <td>
                      <div className="primary-cell">Phí dịch vụ phòng gym</div>
                      <div className="secondary-cell">
                        {inv.created_at ? formatDateTime(inv.created_at) : 'Ghi nhận từ hệ thống'}
                      </div>
                    </td>
                    <td className="text-end">
                      <span className="money">{formatVnd(inv.amount)}</span>
                    </td>
                    <td className="text-end">
                      <span className="money is-success">{formatVnd(inv.amount_paid || (inv.status === 'paid' ? inv.amount : 0))}</span>
                    </td>
                    <td>
                      <StatusBadge status={inv.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
