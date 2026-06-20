import { useEffect, useState, type RefObject } from 'react'

export function useSelectDropdown(wrapRef: RefObject<HTMLElement | null>) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return

    const onDocClick = (event: MouseEvent) => {
      if (wrapRef.current?.contains(event.target as Node)) return
      setOpen(false)
    }

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onEscape)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onEscape)
    }
  }, [open, wrapRef])

  return { open, setOpen, toggle: () => setOpen((value) => !value), close: () => setOpen(false) }
}
