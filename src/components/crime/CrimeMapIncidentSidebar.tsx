import type { CrimeIncident } from '../../types/crime'
import { CrimeCategoryIcon } from '../../utils/crimeCategoryIcons'
import { severityColor, statusBadge } from '../../utils/helpers'

interface CrimeMapIncidentSidebarProps {
  incidents: CrimeIncident[]
  selectedCategory: string
}

function IncidentListCard({ incident }: { incident: CrimeIncident }) {
  const severityBg = severityColor(incident.severity)

  return (
    <article className="flex gap-2.5 rounded-lg border border-border/60 bg-navy-950/40 px-2.5 py-2">
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
        </div>
      </div>
    </article>
  )
}

export default function CrimeMapIncidentSidebar({
  incidents,
  selectedCategory,
}: CrimeMapIncidentSidebarProps) {
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

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {incidents.length === 0 ? (
          <p className="px-1 py-6 text-center text-xs text-text-muted">
            No incidents match the current category filter.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {incidents.map((incident) => (
              <li key={incident.id}>
                <IncidentListCard incident={incident} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  )
}
