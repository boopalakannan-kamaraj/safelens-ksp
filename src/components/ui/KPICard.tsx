import type { ReactNode } from 'react'

interface KPICardProps {
  title: string
  value: string | number
  subtitle?: string
  trend?: { value: number; label: string }
  icon: ReactNode
  accent?: 'default' | 'danger' | 'warning' | 'success'
}

const accentStyles = {
  default: 'bg-accent/10 text-accent ring-accent/30',
  danger: 'bg-danger/10 text-danger ring-danger/30',
  warning: 'bg-warning/10 text-warning ring-warning/30',
  success: 'bg-success/10 text-success ring-success/30',
}

export default function KPICard({ title, value, subtitle, trend, icon, accent = 'default' }: KPICardProps) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5 transition-colors hover:border-accent/30">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-text-muted">{title}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-white">{value}</p>
          {subtitle && <p className="mt-1 text-xs text-text-muted">{subtitle}</p>}
          {trend && (
            <p className={`mt-2 text-xs font-medium ${trend.value >= 0 ? 'text-danger' : 'text-success'}`}>
              {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
            </p>
          )}
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-lg ring-1 ${accentStyles[accent]}`}>
          {icon}
        </div>
      </div>
    </div>
  )
}
