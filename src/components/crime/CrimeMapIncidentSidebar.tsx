import { useEffect, useRef } from 'react'
import type { CrimeIncident } from '../../types/crime'
import { CrimeCategoryIcon } from '../../utils/crimeCategoryIcons'
import { severityColor, statusBadge, riskLevel } from '../../utils/helpers'

interface CrimeMapIncidentSidebarProps {
  incidents: CrimeIncident[]
  selectedCategory: string
  selectedIncidentId?: string | null
  districtRiskScores: Map<string, number>
  onIncidentSelect: (incident: CrimeIncident) => void
}

function IncidentListCard({
  incident,
  selected,
  districtRiskScore,
  onSelect,
}: {
  incident: CrimeIncident
  selected: boolean
  districtRiskScore?: number
  onSelect: (incident: CrimeIncident) => void
}) {
  const severityBg = severityColor(incident.severity)
  const districtRisk = districtRiskScore != null ? riskLevel(districtRiskScore) : null

  return (
    <button
      type="button"
      onClick={() => onSelect(incident)}
      className={`flex w-full gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-colors ${
        selected
          ? 'border-accent/50 bg-accent/10 ring-1 ring-accent/30'
          : 'border-border/60 bg-navy-950/40 hover:border-border hover:bg-navy-950/70'
      }`}
    >
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1 ring-white/20"
        style={{ backgroundColor: severityBg }}
      >
        <CrimeCategoryIcon category={incident.category} size={14} color="#ffffff" strokeWidth={2.25} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-xs font-semibold text-white">{incident.category}</p>
          <time className="shrink-0 text-[10px] text-text-muted">{incident.date}</time>
        </div>
        <p className="truncate text-[11px] text-text-muted">{incident.districtName}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1">
          <span
            className="rounded px-1.5 py-0.5 text-[10px] font-medium text-white"
            style={{ backgroundColor: `${severityBg}33`, color: severityBg }}
          >
            {incident.severity}
          </span>
          <span
            className={`rounded px-1.5 py-0.5 text-[10px] font-medium ring-1 ${statusBadge(incident.status)}`}
          >
            {incident.status}
          </span>
          {districtRisk && districtRiskScore != null && (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1"
              style={{
                color: districtRisk.color,
                background: `${districtRisk.color}15`,
                borderColor: `${districtRisk.color}40`,
              }}
              title={`${incident.districtName} district risk score`}
            >
              <span className="font-semibold">{districtRiskScore}</span>
              <span className="uppercase tracking-wide opacity-90">{districtRisk.label} district risk</span>
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

export default function CrimeMapIncidentSidebar({
  incidents,
  selectedCategory,
  selectedIncidentId,
  districtRiskScores,
  onIncidentSelect,
}: CrimeMapIncidentSidebarProps) {
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!selectedIncidentId || !listRef.current) return
    const selected = listRef.current.querySelector<HTMLElement>(`[data-incident-id="${selectedIncidentId}"]`)
    selected?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [selectedIncidentId, incidents])

  return (
    <aside
      className="flex h-full w-80 shrink-0 flex-col border-l border-border bg-surface/95 backdrop-blur-sm"
      aria-label="Incident list"
    >
      <div className="border-b border-border px-4 py-3">
        <p className="text-sm font-semibold text-white">Incident list</p>
        <p className="mt-0.5 text-xs text-text-muted">
          {incidents.length} incident{incidents.length === 1 ? '' : 's'}
          {selectedCategory !== 'All' ? ` · ${selectedCategory}` : ''}
        </p>
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-3">
        {incidents.length === 0 ? (
          <p className="px-1 py-6 text-center text-xs text-text-muted">
            No incidents match the current category filter.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {incidents.map((incident) => (
              <li key={incident.id} data-incident-id={incident.id}>
                <IncidentListCard
                  incident={incident}
                  selected={incident.id === selectedIncidentId}
                  districtRiskScore={districtRiskScores.get(incident.districtId)}
                  onSelect={onIncidentSelect}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  )
}
