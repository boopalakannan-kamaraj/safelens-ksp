import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  description: string
  actions?: ReactNode
  filterBar?: ReactNode
}

export default function PageHeader({ title, description, actions, filterBar }: PageHeaderProps) {
  return (
    <div className="relative z-[1001] border-b border-border bg-navy-950/50">
      <div className="flex flex-nowrap items-center justify-between gap-4 px-8 py-6">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-white">{title}</h1>
          <p className="mt-1 text-sm text-text-muted">{description}</p>
        </div>
        {actions && <div className="ml-auto shrink-0">{actions}</div>}
      </div>
      {filterBar && (
        <div className="flex flex-wrap items-center gap-3 border-t border-border/60 px-8 pb-4 pt-3">
          {filterBar}
        </div>
      )}
    </div>
  )
}
