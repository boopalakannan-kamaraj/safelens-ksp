import type { SortDirection } from '../../utils/tableHelpers'

interface SortableThProps {
  label: string
  sortKey: string
  currentSort: { key: string; direction: SortDirection } | null
  onSort: (key: string) => void
  className?: string
}

export default function SortableTh({ label, sortKey, currentSort, onSort, className = '' }: SortableThProps) {
  const active = currentSort?.key === sortKey
  return (
    <th
      className={`cursor-pointer select-none px-5 py-3 font-medium transition-colors hover:text-white ${className}`}
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center">
        {label}
        <span className={`ml-1 text-[10px] ${active ? 'text-accent-light' : 'text-text-muted/50'}`}>
          {active ? (currentSort!.direction === 'asc' ? '▲' : '▼') : '↕'}
        </span>
      </span>
    </th>
  )
}
