import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { CrimeIncident } from '../../types/crime'
import { exportIncidentPDF } from '../../utils/exportHelpers'
import { severityColor, statusBadge } from '../../utils/helpers'
import { btnIcon, btnPrimary, btnSecondary } from './formClasses'

interface IncidentDetailDrawerProps {
  incident: CrimeIncident | null
  incidents: CrimeIncident[]
  onClose: () => void
  onSelect: (incident: CrimeIncident) => void
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg bg-navy-950/50 p-3 ring-1 ring-[#2a4070]/50">
      <p className="text-xs text-text-muted">{label}</p>
      <p className={`mt-0.5 text-sm text-white ${mono ? 'font-mono text-xs' : ''}`}>{value}</p>
    </div>
  )
}

export default function IncidentDetailDrawer({
  incident,
  incidents,
  onClose,
  onSelect,
}: IncidentDetailDrawerProps) {
  const navigate = useNavigate()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (incident) {
      const frame = requestAnimationFrame(() => setVisible(true))
      return () => cancelAnimationFrame(frame)
    }
    setVisible(false)
  }, [incident])

  if (!incident) return null

  const currentIndex = incidents.findIndex((item) => item.id === incident.id)
  const hasPrev = currentIndex > 0
  const hasNext = currentIndex >= 0 && currentIndex < incidents.length - 1

  const handleClose = () => {
    setVisible(false)
    window.setTimeout(onClose, 300)
  }

  const handleViewMap = () => {
    navigate('/map', {
      state: {
        category: incident.category,
        district: incident.districtName,
        incidentId: incident.id,
        lat: incident.lat,
        lng: incident.lng,
      },
    })
  }

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
    <>
      <div
        className={`fixed inset-0 z-[2000] bg-navy-950/50 transition-opacity duration-300 ease-in-out ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleClose}
        aria-hidden="true"
      />

      <aside
        className={`fixed right-0 top-0 z-[2001] flex h-full w-[420px] flex-col border-l border-[#2a4070] bg-[#1a2f56] shadow-2xl shadow-black/40 transition-transform duration-300 ease-in-out ${
          visible ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label={`Incident ${incident.id}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-[#2a4070] px-5 py-4">
          <div className="min-w-0 pr-3">
            <p className="font-mono text-sm font-semibold text-accent-light">{incident.id}</p>
            <h2 className="mt-1 text-xl font-semibold text-white">{incident.category}</h2>
            <p className="mt-0.5 text-sm text-text-muted">{incident.districtName}</p>
            <div className="mt-3 flex flex-wrap gap-2">
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
          </div>
          <button onClick={handleClose} className={btnIcon} aria-label="Close incident details">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date" value={incident.date} />
            <Field label="Location" value={incident.location} />
            <Field label="Assigned Officer" value={incident.officer} />
            <Field label="Coordinates" value={`${incident.lat}, ${incident.lng}`} mono />
          </div>

          <section className="mt-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">Description</h3>
            <p className="mt-2 text-sm leading-relaxed text-[#c8dff5]">{incident.description}</p>
          </section>

          {(incident.suspectId || incident.victimId) && (
            <div className="mt-5 grid grid-cols-2 gap-3">
              {incident.suspectId && <Field label="Suspect ID" value={incident.suspectId} mono />}
              {incident.victimId && <Field label="Victim ID" value={incident.victimId} mono />}
            </div>
          )}
        </div>

        <div className="space-y-2 border-t border-[#2a4070] px-5 py-4">
          <button onClick={handleViewMap} className={`w-full ${btnPrimary}`}>
            View on Crime Map
          </button>
          <button onClick={handleViewNetwork} className={`w-full ${btnSecondary}`}>
            View Network Links
          </button>
          <button onClick={() => exportIncidentPDF(incident)} className={`w-full ${btnSecondary}`}>
            Export Incident Report
          </button>
        </div>

        <div className="flex items-center justify-between border-t border-[#2a4070] px-5 py-3">
          <button
            type="button"
            disabled={!hasPrev}
            onClick={() => hasPrev && onSelect(incidents[currentIndex - 1])}
            className="flex items-center gap-1.5 text-sm font-medium text-accent-light transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span aria-hidden="true">←</span> Previous
          </button>
          <span className="text-xs text-text-muted">
            {currentIndex >= 0 ? `${currentIndex + 1} of ${incidents.length}` : '—'}
          </span>
          <button
            type="button"
            disabled={!hasNext}
            onClick={() => hasNext && onSelect(incidents[currentIndex + 1])}
            className="flex items-center gap-1.5 text-sm font-medium text-accent-light transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next <span aria-hidden="true">→</span>
          </button>
        </div>
      </aside>
    </>
  )
}
