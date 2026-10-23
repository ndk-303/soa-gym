import { useEffect, useRef } from 'react'
import LoadingSpinner from './LoadingSpinner'

export function ManagementHeader({ title, description, onRefresh, onAdd, addLabel, count }) {
  return (
    <div className="management-header">
      <div className="management-title-block">
        <div className="management-title-row">
          <h1>{title}</h1>
        </div>
        {description && <p className="management-description">{description}</p>}
      </div>
      <div className="management-header-actions">
        {onRefresh && (
          <button className="management-secondary-button" type="button" onClick={onRefresh} title="Tải lại dữ liệu">
            <i className="bi bi-arrow-clockwise"></i> Làm mới
          </button>
        )}
        {onAdd && (
          <button className="management-primary-button" type="button" onClick={onAdd}>
            <i className="bi bi-plus-lg"></i> {addLabel || 'Thêm mới'}
          </button>
        )}
      </div>
    </div>
  )
}

export function ManagementFilterBar({
  searchTerm = '',
  onSearchChange,
  searchPlaceholder = 'Tìm kiếm nhanh...',
  filterValue = 'all',
  onFilterChange,
  filterOptions = [],
  filterLabel = 'Lọc theo trạng thái',
  totalCount = 0,
  filteredCount = 0,
  onReset,
}) {
  const searchInputRef = useRef(null)
  const isFiltered = Boolean(searchTerm.trim() || (filterValue && filterValue !== 'all'))

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Shortcut '/' to focus search when not in an editable control
      if (
        e.key === '/' &&
        !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName) &&
        !document.activeElement?.isContentEditable
      ) {
        e.preventDefault()
        searchInputRef.current?.focus()
        searchInputRef.current?.select()
      }
      // Escape inside search input clears or blurs
      if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
        if (searchTerm) {
          onSearchChange?.('')
        } else {
          searchInputRef.current?.blur()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [searchTerm, onSearchChange])

  return (
    <div className="management-filter-bar">
      <div className="management-filter-inputs">
        <div className="management-search-wrapper">
          <i className="bi bi-search management-search-icon" aria-hidden="true"></i>
          <input
            ref={searchInputRef}
            type="search"
            className="management-search-input"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
          />
          {searchTerm ? (
            <button
              type="button"
              className="management-search-clear"
              onClick={() => onSearchChange('')}
              aria-label="Xóa từ khóa tìm kiếm"
            >
              <i className="bi bi-x"></i>
            </button>
          ) : (
            <span className="management-search-shortcut" title="Phím tắt: /" aria-hidden="true">
              /
            </span>
          )}
        </div>

        {filterOptions.length > 0 && (
          <div className="management-select-wrapper">
            <select
              className="management-filter-select"
              value={filterValue}
              onChange={(e) => onFilterChange(e.target.value)}
              aria-label={filterLabel}
            >
              {filterOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {isFiltered && (
        <div className="management-filter-summary">
          <span className="management-filter-count">
            Khớp <strong>{filteredCount}</strong> / {totalCount}
          </span>
          {onReset && (
            <button
              type="button"
              className="management-reset-button"
              onClick={onReset}
              title="Đặt lại bộ lọc"
            >
              <i className="bi bi-arrow-counterclockwise"></i> Đặt lại
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export function ManagementModal({
  isOpen,
  onClose,
  title,
  titleId = 'management-modal-title',
  children,
  dialogClassName = 'modal-dialog-centered',
  isSubmitting = false,
}) {
  const modalContentRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return

    // Lock background scrolling
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // Auto focus first interactive element in modal
    const timer = setTimeout(() => {
      if (modalContentRef.current) {
        const focusable = modalContentRef.current.querySelector(
          'input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), button.btn-close'
        )
        focusable?.focus()
      }
    }, 60)

    // Keydown handler for Escape key
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose?.()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      clearTimeout(timer)
      document.body.style.overflow = originalOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, isSubmitting, onClose])

  if (!isOpen) return null

  return (
    <div
      className="modal show d-block"
      tabIndex="-1"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(2px)' }}
      onClick={(e) => {
        // Prevent accidental closing if clicking inside modal content
        if (e.target === e.currentTarget && !isSubmitting) {
          onClose?.()
        }
      }}
    >
      <div className={`modal-dialog ${dialogClassName}`}>
        <div ref={modalContentRef} className="modal-content border-0 shadow">
          <div className="modal-header">
            <h2 className="modal-title fs-5 fw-bold" id={titleId}>
              {title}
            </h2>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              disabled={isSubmitting}
              aria-label="Đóng"
            ></button>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}

const alignmentClasses = {
  left: 'is-left',
  center: 'is-center',
  right: 'is-right',
}

export function ManagementTable({
  columns,
  loading,
  loadingMessage,
  isEmpty,
  emptyMessage = 'Chưa có dữ liệu nào',
  emptyIcon = 'bi-inbox',
  emptyAction,
  children,
  minWidth = 760,
  className = '',
}) {
  return (
    <div className="management-table-shell">
      <div className="management-table-scroll">
        {loading ? (
          <LoadingSpinner message={loadingMessage} />
        ) : isEmpty ? (
          <div className="management-empty">
            <i className={`bi ${emptyIcon} management-empty-icon`}></i>
            <p>{emptyMessage}</p>
            {emptyAction}
          </div>
        ) : (
          <table
            className={`management-table ${className}`.trim()}
            style={{ '--management-table-min-width': `${minWidth}px` }}
          >
            <colgroup>
              {columns.map((column) => (
                <col key={column.key} style={{ width: column.width }} />
              ))}
            </colgroup>
            <thead>
              <tr>
                {columns.map((column) => {
                  const isAction = column.key === 'actions'
                  const alignClass = alignmentClasses[column.align || (isAction ? 'center' : 'left')]
                  return (
                    <th
                      key={column.key}
                      className={`${alignClass} ${isAction ? 'actions-col' : ''} ${column.className || ''}`.trim()}
                    >
                      {column.label}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>{children}</tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export function ActionMenu({ onEdit, onDelete, deleteLabel = 'Xóa' }) {
  return (
    <div className="row-actions">
      {onEdit && (
        <button type="button" className="row-action-button" onClick={onEdit} title="Chỉnh sửa bản ghi">
          <i className="bi bi-pencil"></i>
          <span>Sửa</span>
        </button>
      )}
      {onDelete && (
        <button type="button" className="row-action-button is-danger" onClick={onDelete} title="Xóa bản ghi">
          <i className="bi bi-trash3"></i>
          <span>{deleteLabel}</span>
        </button>
      )}
    </div>
  )
}
