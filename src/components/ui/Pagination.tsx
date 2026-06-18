import { btnSegment, btnSegmentActive } from './formClasses'

interface PaginationProps {
  page: number
  totalPages: number
  totalItems: number
  pageSize: number
  onPageChange: (page: number) => void
}

export default function Pagination({ page, totalPages, totalItems, pageSize, onPageChange }: PaginationProps) {
  const start = totalItems === 0 ? 0 : (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, totalItems)

  const pages = buildPageNumbers(page, totalPages)

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3">
      <p className="text-xs text-text-muted">
        Showing {start}–{end} of {totalItems}
      </p>
      <div className="flex items-center gap-1">
        <PageBtn disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          ‹
        </PageBtn>
        {pages.map((p, i) =>
          p === '…' ? (
            <span key={`ellipsis-${i}`} className="px-2 text-xs text-text-muted">…</span>
          ) : (
            <PageBtn key={p} active={p === page} onClick={() => onPageChange(p as number)}>
              {p}
            </PageBtn>
          ),
        )}
        <PageBtn disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          ›
        </PageBtn>
      </div>
    </div>
  )
}

function PageBtn({
  children,
  onClick,
  disabled,
  active,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  active?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${btnSegment} min-w-[32px] px-2 py-1 ${active ? btnSegmentActive : ''} ${disabled ? 'cursor-not-allowed opacity-40' : ''}`}
    >
      {children}
    </button>
  )
}

function buildPageNumbers(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const pages: (number | '…')[] = [1]
  if (current > 3) pages.push('…')

  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
    pages.push(i)
  }

  if (current < total - 2) pages.push('…')
  pages.push(total)
  return pages
}
