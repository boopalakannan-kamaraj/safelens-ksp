import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  description: string
  actions?: ReactNode
}

export default function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="relative z-[1001] flex flex-nowrap items-center justify-between gap-4 border-b border-border bg-navy-950/50 px-8 py-6">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-white">{title}</h1>
        <p className="mt-1 text-sm text-text-muted">{description}</p>
      </div>
      {actions && <div className="ml-auto shrink-0">{actions}</div>}
    </div>
  )
}
