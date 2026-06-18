export type SortDirection = 'asc' | 'desc'

export function toggleSort<T extends string>(
  current: { key: T; direction: SortDirection } | null,
  key: T,
): { key: T; direction: SortDirection } {
  if (current?.key === key) {
    return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
  }
  return { key, direction: 'desc' }
}

export function compareValues(a: string | number, b: string | number, direction: SortDirection) {
  const mult = direction === 'asc' ? 1 : -1
  if (typeof a === 'number' && typeof b === 'number') return (a - b) * mult
  return String(a).localeCompare(String(b), undefined, { numeric: true }) * mult
}

export function paginate<T>(items: T[], page: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
  const safePage = Math.min(Math.max(1, page), totalPages)
  const start = (safePage - 1) * pageSize
  return {
    items: items.slice(start, start + pageSize),
    page: safePage,
    totalPages,
    totalItems: items.length,
  }
}
