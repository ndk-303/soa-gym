import LoadingSpinner from './LoadingSpinner'

export function ManagementHeader({ title, description, onRefresh, onAdd, addLabel, count }) {
  return (
    <div className="management-header">
      <div>
        <div className="management-title-row">
          <h1>{title}</h1>
          {count !== undefined && count !== null && (
            <span className="management-count-badge">{count} bản ghi</span>
          )}
        </div>
        {description && <p className="management-description">{description}</p>}
      </div>
      <div className="management-header-actions">
        {onRefresh && (
          <button className="management-secondary-button" type="button" onClick={onRefresh}>
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
  const isFiltered = Boolean(searchTerm.trim() || (filterValue && filterValue !== 'all'))

  return (
    <div className="management-filter-bar">
      <div className="management-filter-inputs">
        <div className="management-search-wrapper">
          <i className="bi bi-search management-search-icon" aria-hidden="true"></i>
          <input
            type="search"
            className="management-search-input"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
          />
          {searchTerm && (
            <button
              type="button"
              className="management-search-clear"
              onClick={() => onSearchChange('')}
              aria-label="Xóa từ khóa tìm kiếm"
            >
              <i className="bi bi-x"></i>
            </button>
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

      <div className="management-filter-summary">
        {isFiltered ? (
          <>
            <span className="management-filter-count">
              Hiển thị <strong>{filteredCount}</strong> / {totalCount} bản ghi
            </span>
            {onReset && (
              <button
                type="button"
                className="management-reset-button"
                onClick={onReset}
              >
                <i className="bi bi-arrow-counterclockwise"></i> Đặt lại
              </button>
            )}
          </>
        ) : (
          <span className="management-filter-count is-muted">
            Tổng số: <strong>{totalCount}</strong> bản ghi
          </span>
        )}
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
            <i className={`bi ${emptyIcon}`}></i>
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
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={`${alignmentClasses[column.align || 'left']} ${column.className || ''}`.trim()}
                  >
                    {column.label}
                  </th>
                ))}
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
