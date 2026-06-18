import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import type { InvestigationContext } from '../../types/navigation'
import { btn } from '../ui/formClasses'

type AnomalySeverity = 'critical' | 'high' | 'medium'

export interface AnomalyAlert {
  id: string
  description: string
  district: string
  route: string
  navState?: InvestigationContext
  severity: AnomalySeverity
  detectedAt: string
}

const SEVERITY_CONFIG: Record<
  AnomalySeverity,
  {
    label: string
    border: string
    iconColor: string
    iconBg: string
    iconRing: string
    badge: string
    button: string
    headerText: string
  }
> = {
  critical: {
    label: 'CRITICAL',
    border: '#e05a3a',
    iconColor: '#e05a3a',
    iconBg: 'rgba(224, 90, 58, 0.15)',
    iconRing: 'rgba(224, 90, 58, 0.3)',
    badge: 'bg-[#e05a3a]/15 text-[#e05a3a] ring-[#e05a3a]/35',
    button: `${btn} bg-[#e05a3a] border-[#e05a3a] text-white hover:bg-[#e87055] hover:border-[#e87055]`,
    headerText: 'text-[#e05a3a]',
  },
  high: {
    label: 'HIGH',
    border: '#d4a020',
    iconColor: '#d4a020',
    iconBg: 'rgba(212, 160, 32, 0.15)',
    iconRing: 'rgba(212, 160, 32, 0.3)',
    badge: 'bg-[#d4a020]/15 text-[#d4a020] ring-[#d4a020]/35',
    button: `${btn} bg-transparent border-[#d4a020] text-[#d4a020] hover:bg-[#d4a020]/12 hover:border-[#e0b030] hover:text-[#e0b030]`,
    headerText: 'text-[#d4a020]',
  },
  medium: {
    label: 'MEDIUM',
    border: '#4a90d9',
    iconColor: '#4a90d9',
    iconBg: 'rgba(74, 144, 217, 0.15)',
    iconRing: 'rgba(74, 144, 217, 0.3)',
    badge: 'bg-[#4a90d9]/15 text-[#4a90d9] ring-[#4a90d9]/35',
    button: `${btn} bg-transparent border-[#4a90d9] text-[#4a90d9] hover:bg-[#4a90d9]/12 hover:border-[#6ba8e8] hover:text-[#6ba8e8]`,
    headerText: 'text-[#4a90d9]',
  },
}

const ANOMALIES: AnomalyAlert[] = [
  {
    id: 'anomaly-1',
    description: 'Cybercrime in Kodagu up 240% vs district average',
    district: 'Kodagu',
    route: '/trends',
    navState: { category: 'Cybercrime', district: 'Kodagu' },
    severity: 'critical',
    detectedAt: 'Detected 2 hours ago',
  },
  {
    id: 'anomaly-2',
    description: 'Night-time theft cluster detected in Bengaluru CBD',
    district: 'Bengaluru Urban',
    route: '/map',
    navState: { category: 'Theft', district: 'Bengaluru Urban' },
    severity: 'high',
    detectedAt: 'Detected 5 hours ago',
  },
  {
    id: 'anomaly-3',
    description: 'Repeat offender pattern: 3 suspects linked across 5 districts',
    district: 'Multi-district',
    route: '/network',
    severity: 'high',
    detectedAt: 'Jun 7, 2026',
  },
  {
    id: 'anomaly-4',
    description: 'Domestic violence spike in Raichur — 40% above seasonal average',
    district: 'Raichur',
    route: '/trends',
    navState: { category: 'Domestic Violence', district: 'Raichur' },
    severity: 'medium',
    detectedAt: 'Jun 8, 2026',
  },
]

function SeveritySummary() {
  const counts = useMemo(() => {
    const tally = { critical: 0, high: 0, medium: 0 }
    for (const a of ANOMALIES) tally[a.severity]++
    return tally
  }, [])

  const parts = [
    counts.critical > 0 && (
      <span key="c" className={SEVERITY_CONFIG.critical.headerText}>
        {counts.critical} Critical
      </span>
    ),
    counts.high > 0 && (
      <span key="h" className={SEVERITY_CONFIG.high.headerText}>
        {counts.high} High
      </span>
    ),
    counts.medium > 0 && (
      <span key="m" className={SEVERITY_CONFIG.medium.headerText}>
        {counts.medium} Medium
      </span>
    ),
  ].filter(Boolean)

  return (
    <span className="flex flex-wrap items-center gap-1 text-xs font-medium">
      {parts.map((part, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <span className="text-text-muted">·</span>}
          {part}
        </span>
      ))}
    </span>
  )
}

export default function AnomalyAlerts() {
  const navigate = useNavigate()

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">Anomaly Alerts</h3>
          <p className="mt-0.5 text-xs text-text-muted">AI-detected patterns requiring review</p>
        </div>
        <SeveritySummary />
      </div>

      <ul className="space-y-3">
        {ANOMALIES.map((alert) => {
          const config = SEVERITY_CONFIG[alert.severity]
          const isCritical = alert.severity === 'critical'

          return (
            <li
              key={alert.id}
              className={`relative flex flex-wrap items-center justify-between gap-3 overflow-hidden rounded-lg border border-[#2a4070]/60 bg-[#1a2f56]/40 py-3 pl-4 pr-4 ${
                isCritical ? 'anomaly-critical-border' : ''
              }`}
              style={!isCritical ? { borderLeft: `3px solid ${config.border}` } : undefined}
            >
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <div
                  className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1"
                  style={{
                    background: config.iconBg,
                    color: config.iconColor,
                    borderColor: config.iconRing,
                  }}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <div className="mb-1.5 flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide ring-1 ${config.badge}`}
                    >
                      {config.label}
                    </span>
                  </div>
                  <p className="text-sm text-[#c8dff5]">{alert.description}</p>
                  <p className="mt-1 text-[11px] text-text-muted">{alert.detectedAt}</p>
                  <span className="mt-1.5 inline-block rounded-full bg-navy-950/60 px-2 py-0.5 text-[10px] font-medium text-accent-light ring-1 ring-accent/20">
                    {alert.district}
                  </span>
                </div>
              </div>
              <button
                onClick={() => navigate(alert.route, { state: alert.navState })}
                className={`${config.button} shrink-0 text-xs`}
              >
                Investigate
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
