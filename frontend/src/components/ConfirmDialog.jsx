import { useEffect, useRef } from 'react'

export default function ConfirmDialog({
  isOpen,
  title = 'Xác nhận hành động',
  message,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  variant = 'danger', // 'danger' | 'warning' | 'primary'
  onConfirm,
  onCancel,
  loading = false,
  isAlertOnly = false,
}) {
  const confirmBtnRef = useRef(null)
  const cancelBtnRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return

    // Auto focus appropriate button
    const timer = setTimeout(() => {
      if (isAlertOnly && confirmBtnRef.current) {
        confirmBtnRef.current.focus()
      } else if (cancelBtnRef.current) {
        cancelBtnRef.current.focus()
      }
    }, 50)

    // Keydown handler for Escape & Tab trapping
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !loading) {
        onCancel?.()
      }
    }

    // Lock body scroll
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      clearTimeout(timer)
      document.body.style.overflow = originalOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, loading, onCancel, isAlertOnly])

  if (!isOpen) return null

  const iconClasses = {
    danger: 'bi-exclamation-triangle-fill',
    warning: 'bi-exclamation-circle-fill',
    primary: 'bi-info-circle-fill',
  }

  return (
    <div
      className="confirm-dialog-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) {
          onCancel?.()
        }
      }}
    >
      <div
        className="confirm-dialog-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
      >
        <div className="confirm-dialog-body">
          <span className={`confirm-dialog-icon is-${variant}`}>
            <i className={`bi ${iconClasses[variant] || iconClasses.danger}`} aria-hidden="true"></i>
          </span>
          <div className="confirm-dialog-content">
            <h2 id="confirm-dialog-title" className="confirm-dialog-title">
              {title}
            </h2>
            <div id="confirm-dialog-description" className="confirm-dialog-message">
              {message}
            </div>
          </div>
        </div>

        <div className="confirm-dialog-actions">
          {!isAlertOnly && (
            <button
              ref={cancelBtnRef}
              type="button"
              className="confirm-btn-cancel"
              onClick={onCancel}
              disabled={loading}
            >
              {cancelText}
            </button>
          )}
          <button
            ref={confirmBtnRef}
            type="button"
            className={`confirm-btn-confirm is-${variant}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                Đang xử lý...
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
