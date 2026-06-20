import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import type { District } from '../../types/crime'
import {
  formCheckbox,
  formInput,
  formSelectDropdown,
  formSelectDropdownEmpty,
  formSelectDropdownItem,
  formSelectDropdownList,
  formSelectDropdownSearch,
  formSelectFixed,
  formSelectWrap,
} from './formClasses'
import { useSelectDropdown } from './useSelectDropdown'

interface DistrictMultiSelectProps {
  districts: District[]
  selectedIds: string[]
  onChange: (selectedIds: string[]) => void
}

export default function DistrictMultiSelect({ districts, selectedIds, onChange }: DistrictMultiSelectProps) {
  const [search, setSearch] = useState('')
  const wrapRef = useRef<HTMLDivElement>(null)
  const listId = useId()
  const { open, toggle } = useSelectDropdown(wrapRef)

  const sorted = useMemo(
    () => [...districts].sort((a, b) => a.name.localeCompare(b.name)),
    [districts],
  )
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return sorted
    return sorted.filter((d) => d.name.toLowerCase().includes(query))
  }, [sorted, search])

  const label = useMemo(() => {
    if (selectedIds.length === 0) return 'All districts'
    if (selectedIds.length === 1) {
      return districts.find((d) => d.id === selectedIds[0])?.name ?? '1 district'
    }
    return `${selectedIds.length} districts`
  }, [selectedIds, districts])

  const toggleDistrict = useCallback(
    (id: string) => {
      if (selectedSet.has(id)) {
        onChange(selectedIds.filter((value) => value !== id))
        return
      }
      onChange([...selectedIds, id])
    },
    [onChange, selectedIds, selectedSet],
  )

  const clearAll = useCallback(() => onChange([]), [onChange])

  useEffect(() => {
    if (!open) setSearch('')
  }, [open])

  return (
    <div ref={wrapRef} className={`${formSelectWrap} relative`}>
      <button
        type="button"
        className={formSelectFixed}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Filter by district"
        onClick={toggle}
      >
        <span className="block truncate">{label}</span>
      </button>
      {open && (
        <div className={formSelectDropdown}>
          <div className={formSelectDropdownSearch}>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search districts…"
              className={`${formInput} w-full text-xs`}
              aria-label="Search districts"
            />
          </div>
          <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
            <button type="button" className="text-[11px] text-accent hover:underline" onClick={clearAll}>
              All districts
            </button>
            {selectedIds.length > 0 && (
              <span className="text-[10px] text-text-muted">{selectedIds.length} selected</span>
            )}
          </div>
          <ul id={listId} role="listbox" aria-multiselectable="true" className={formSelectDropdownList}>
            {filtered.map((district) => (
              <li key={district.id}>
                <label className={`${formSelectDropdownItem} gap-2 hover:bg-navy-950/60`}>
                  <input
                    type="checkbox"
                    checked={selectedSet.has(district.id)}
                    onChange={() => toggleDistrict(district.id)}
                    className={formCheckbox}
                  />
                  <span>{district.name}</span>
                </label>
              </li>
            ))}
            {filtered.length === 0 && <li className={formSelectDropdownEmpty}>No matches</li>}
          </ul>
        </div>
      )}
    </div>
  )
}
