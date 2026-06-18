import type { CrimeSeverity } from '../types/crime'

export function severityColor(severity: CrimeSeverity): string {
  switch (severity) {
    case 'Critical':
      return '#e74c3c'
    case 'High':
      return '#f39c12'
    case 'Medium':
      return '#4a90d9'
    case 'Low':
      return '#27ae60'
    default:
      return '#4a90d9'
  }
}

export function statusBadge(status: string) {
  const styles: Record<string, string> = {
    Open: 'bg-danger/15 text-danger ring-danger/30',
    'Under Investigation': 'bg-warning/15 text-warning ring-warning/30',
    Closed: 'bg-success/15 text-success ring-success/30',
  }
  return styles[status] ?? 'bg-surface-light text-text-muted ring-border'
}

export function trendIcon(trend: 'rising' | 'stable' | 'declining') {
  switch (trend) {
    case 'rising':
      return { icon: '↑', color: 'text-danger', label: 'Rising' }
    case 'declining':
      return { icon: '↓', color: 'text-success', label: 'Declining' }
    case 'stable':
      return { icon: '→', color: 'text-accent', label: 'Stable' }
  }
}

export function riskLevel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: 'Critical', color: '#e74c3c' }
  if (score >= 65) return { label: 'High', color: '#f39c12' }
  if (score >= 45) return { label: 'Medium', color: '#4a90d9' }
  return { label: 'Low', color: '#27ae60' }
}
