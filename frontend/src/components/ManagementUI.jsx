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
            <i className="bi bi-inbox"></i>
            <p>{emptyMessage}</p>
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
