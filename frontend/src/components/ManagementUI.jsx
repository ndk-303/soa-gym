import LoadingSpinner from './LoadingSpinner'

export function ManagementHeader({ title, description, onRefresh, onAdd, addLabel }) {
  return (
    <div className="management-header">
      <div>
        <div className="management-breadcrumb">Quản lý dữ liệu</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="management-header-actions">
        <button className="management-secondary-button" type="button" onClick={onRefresh}>
          <i className="bi bi-arrow-clockwise"></i> Làm mới
        </button>
        {onAdd && (
          <button className="management-primary-button" type="button" onClick={onAdd}>
            <i className="bi bi-plus-lg"></i> {addLabel}
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
  emptyMessage,
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
            {emptyMessage}
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
      <button type="button" className="row-action-button" onClick={onEdit}>
        <i className="bi bi-pencil"></i>
        <span>Chỉnh sửa</span>
      </button>
      <button type="button" className="row-action-button is-danger" onClick={onDelete}>
        <i className="bi bi-trash3"></i>
        <span>{deleteLabel}</span>
      </button>
    </div>
  )
}

