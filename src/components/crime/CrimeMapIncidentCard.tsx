import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { CrimeIncident, NetworkNode } from '../../types/crime'
import { exportIncidentPDF } from '../../utils/exportHelpers'
import { CrimeCategoryIcon } from '../../utils/crimeCategoryIcons'
import { incidentHasNetworkLink } from '../../utils/networkNavigation'
import { riskLevel, severityColor, statusBadge } from '../../utils/helpers'
import { btnIcon, btnSecondary } from '../ui/formClasses'

interface CrimeMapIncidentCardProps {
  incident: CrimeIncident | null
  incidents: CrimeIncident[]
  networkNodes: NetworkNode[]
  districtRiskScore?: number
  onClose: () => void
  onSelect: (incident: CrimeIncident) => void
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg bg-navy-950/50 p-2.5 ring-1 ring-[#2a4070]/50">
      <p className="text-[11px] text-text-muted">{label}</p>
      <p className={`mt-0.5 text-sm text-white ${mono ? 'font-mono text-xs' : ''}`}>{value}</p>
    </div>
  )
}

export default function CrimeMapIncidentCard({
  incident,
  incidents,
  networkNodes,
  districtRiskScore,
  onClose,
  onSelect,
}: CrimeMapIncidentCardProps) {
  const navigate = useNavigate()

  if (!incident) return null

  const currentIndex = incidents.findIndex((item) => item.id === incident.id)
  const hasPrev = currentIndex > 0
  const hasNext = currentIndex >= 0 && currentIndex < incidents.length - 1
  const districtRisk = districtRiskScore != null ? riskLevel(districtRiskScore) : null
  const showNetworkLinks = incidentHasNetworkLink(incident, networkNodes)

  const handleViewNetwork = () => {
    navigate('/network', {
      state: {
        incidentId: incident.id,
        suspectId: incident.suspectId,
        victimId: incident.victimId,
      },
    })
  }

  return (
    <aside
      className="pointer-events-auto absolute left-6 top-14 z-[1003] flex w-[380px] max-w-[calc(100%-3rem)] max-h-[calc(100vh-4rem)] flex-col rounded-xl border border-border bg-surface/95 shadow-2xl shadow-black/40 backdrop-blur-sm"
      role="dialog"
      aria-modal="false"
      aria-label={`Incident ${incident.id}`}
    >
      <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
        <button
          type="button"
          disabled={!hasPrev}
          onClick={() => hasPrev && onSelect(incidents[currentIndex - 1])}
          className={btnIcon}
          aria-label="Previous incident"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </button>
        <span className="min-w-[4.5rem] text-center text-xs font-medium text-text-muted">
          {currentIndex >= 0 ? `${currentIndex + 1} of ${incidents.length}` : '—'}
        </span>
        <button
          type="button"
          disabled={!hasNext}
          onClick={() => hasNext && onSelect(incidents[currentIndex + 1])}
          className={btnIcon}
          aria-label="Next incident"
        >
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
        <div className="ml-auto">
          <button type="button" onClick={onClose} className={btnIcon} aria-label="Close incident details">
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>

      <div className="px-4 py-3">
        <div className="flex gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-1 ring-white/20"
            style={{ backgroundColor: severityColor(incident.severity) }}
          >
            <CrimeCategoryIcon category={incident.category} size={18} color="#ffffff" strokeWidth={2.25} />
          </div>
          <div className="min-w-0">
            <p className="font-mono text-sm font-semibold text-accent-light">{incident.id}</p>
            <h2 className="mt-0.5 text-lg font-semibold text-white">{incident.category}</h2>
            <p className="mt-0.5 text-sm text-text-muted">{incident.districtName}</p>
          </div>
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${statusBadge(incident.status)}`}>
            {incident.status}
          </span>
          <span
            className="rounded-full px-2.5 py-0.5 text-xs font-medium ring-1"
            style={{
              color: severityColor(incident.severity),
              background: `${severityColor(incident.severity)}15`,
              borderColor: `${severityColor(incident.severity)}40`,
            }}
          >
            {incident.severity}
          </span>
        </div>
        {districtRisk && districtRiskScore != null && (
          <div
            className="mt-2 inline-flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium ring-1"
            style={{
              color: districtRisk.color,
              background: `${districtRisk.color}12`,
              borderColor: `${districtRisk.color}35`,
            }}
            title={`${incident.districtName} district risk score`}
          >
            <span className="text-base font-bold leading-none">{districtRiskScore}</span>
            <span className="min-w-0 text-[10px] uppercase leading-snug tracking-wide opacity-90">
              {districtRisk.label} district risk
            </span>
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <Field label="Date" value={incident.date} />
          <Field label="Location" value={incident.location} />
          <Field label="Assigned Officer" value={incident.officer} />
          <Field label="Coordinates" value={`${incident.lat}, ${incident.lng}`} mono />
        </div>

        <section className="mt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">Description</h3>
          <p className="mt-1.5 max-h-32 overflow-y-auto text-sm leading-relaxed text-[#c8dff5]">
            {incident.description}
          </p>
        </section>

        {(incident.suspectId || incident.victimId) && (
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            {incident.suspectId && <Field label="Suspect ID" value={incident.suspectId} mono />}
            {incident.victimId && <Field label="Victim ID" value={incident.victimId} mono />}
          </div>
        )}
      </div>

      <div className="space-y-2 border-t border-border px-4 py-3">
        {showNetworkLinks && (
          <button type="button" onClick={handleViewNetwork} className={`w-full ${btnSecondary}`}>
            View Network Links
          </button>
        )}
        <button type="button" onClick={() => exportIncidentPDF(incident)} className={`w-full ${btnSecondary}`}>
          Export Incident Report
        </button>
      </div>
    </aside>
  )
}
