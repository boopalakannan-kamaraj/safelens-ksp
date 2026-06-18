import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { btnIcon, btnPrimary, btnSecondary } from '../ui/formClasses'
import type { CrimeIncident, NetworkEdge, NetworkNode } from '../../types/crime'
import { exportNetworkProfilePDF } from '../../utils/exportHelpers'
import { severityColor, statusBadge } from '../../utils/helpers'

const NODE_COLORS = {
  suspect: '#e74c3c',
  victim: '#4a90d9',
  location: '#27ae60',
} as const

interface ConnectedEntity {
  node: NetworkNode | undefined
  edge: NetworkEdge
}

interface NetworkProfileDrawerProps {
  node: NetworkNode | null
  relatedIncidents: CrimeIncident[]
  connectedNodes: ConnectedEntity[]
  onClose: () => void
  onSelectNode: (id: string) => void
}

function getPrimaryDistrict(node: NetworkNode, incidents: CrimeIncident[]): string | null {
  if (node.type === 'location') return node.label
  if (!incidents.length) return null
  const counts = new Map<string, number>()
  for (const inc of incidents) {
    counts.set(inc.districtName, (counts.get(inc.districtName) ?? 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
}

export default function NetworkProfileDrawer({
  node,
  relatedIncidents,
  connectedNodes,
  onClose,
  onSelectNode,
}: NetworkProfileDrawerProps) {
  const navigate = useNavigate()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (node) {
      scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
      const frame = requestAnimationFrame(() => setVisible(true))
      return () => cancelAnimationFrame(frame)
    }
    setVisible(false)
  }, [node])

  if (!node) return null

  const color = NODE_COLORS[node.type]
  const district = getPrimaryDistrict(node, relatedIncidents)

  const handleClose = () => {
    setVisible(false)
    window.setTimeout(onClose, 300)
  }

  const handleViewMap = () => {
    if (district) {
      navigate(`/map?district=${encodeURIComponent(district)}`)
    } else {
      navigate('/map')
    }
  }

  const handleLinkedEntityClick = (linked: NetworkNode | undefined) => {
    if (!linked) return
    onSelectNode(linked.id)
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
        className={`fixed right-0 top-0 z-[2001] flex h-full w-[380px] flex-col border-l border-[#2a4070] bg-[#1a2f56] shadow-2xl shadow-black/40 transition-transform duration-300 ease-in-out ${
          visible ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label={`Profile: ${node.label}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-[#2a4070] px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold uppercase ring-2"
              style={{
                background: `${color}25`,
                color,
                borderColor: `${color}50`,
              }}
            >
              {node.type[0]}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold text-white">{node.label}</h2>
              <span
                className="mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1"
                style={{ color, background: `${color}18`, borderColor: `${color}40` }}
              >
                {node.type}
              </span>
            </div>
          </div>
          <button onClick={handleClose} className={btnIcon} aria-label="Close profile">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4">
          {node.riskScore != null && (
            <div className="mb-5 rounded-lg bg-navy-950/40 p-4 ring-1 ring-danger/25">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">Risk Score</p>
                <p className="text-2xl font-bold text-danger">
                  {node.riskScore}
                  <span className="text-sm text-text-muted">/100</span>
                </p>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-navy-950">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-warning to-danger transition-all duration-500"
                  style={{ width: `${node.riskScore}%` }}
                />
              </div>
            </div>
          )}

          <section className="mb-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-accent-light">
                Connected Incidents
              </h3>
              <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-bold text-accent-light ring-1 ring-accent/30">
                {relatedIncidents.length}
              </span>
            </div>
            <p className="mb-3 text-[11px] leading-relaxed text-text-muted">
              Repeat offender tracking — incidents linked to this {node.type} across jurisdictions.
            </p>

            {relatedIncidents.length > 0 ? (
              <ul className="space-y-3">
                {relatedIncidents.map((inc) => (
                  <li
                    key={inc.id}
                    className="rounded-xl border border-accent/20 bg-gradient-to-br from-navy-950/80 to-[#132238]/60 p-4 shadow-[0_0_16px_rgba(74,144,217,0.08)] ring-1 ring-[#2a4070]/50"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-mono text-xs font-semibold text-accent-light">{inc.id}</span>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ${statusBadge(inc.status)}`}>
                        {inc.status}
                      </span>
                    </div>
                    <p className="mt-2 text-base font-semibold text-white">{inc.category}</p>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-md bg-navy-950/50 px-2.5 py-2 ring-1 ring-[#2a4070]/40">
                        <p className="text-[10px] uppercase tracking-wide text-text-muted">Date</p>
                        <p className="mt-0.5 font-medium text-white">{inc.date}</p>
                      </div>
                      <div className="rounded-md bg-navy-950/50 px-2.5 py-2 ring-1 ring-[#2a4070]/40">
                        <p className="text-[10px] uppercase tracking-wide text-text-muted">District</p>
                        <p className="mt-0.5 font-medium text-white">{inc.districtName}</p>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-text-muted">
                      <span className="text-text-muted">Location · </span>
                      {inc.location}
                    </p>
                    <p className="mt-2 text-[11px] font-medium" style={{ color: severityColor(inc.severity) }}>
                      {inc.severity} severity
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-xl border border-dashed border-[#2a4070]/60 bg-navy-950/30 px-4 py-6 text-center">
                <p className="text-sm text-text-muted">No directly linked incident records</p>
                <p className="mt-1 text-[11px] text-text-muted/80">
                  Association data may still be available via linked entities below.
                </p>
              </div>
            )}
          </section>

          {node.mo && (
            <section className="mb-5">
              <div className="rounded-lg bg-navy-950/40 p-4 ring-1 ring-warning/30">
                <div className="mb-2 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-warning/15 text-warning ring-1 ring-warning/30">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </span>
                  <p className="text-xs font-semibold uppercase tracking-wider text-warning">Modus Operandi</p>
                </div>
                <p className="text-sm font-medium leading-relaxed text-[#e8edf4]">{node.mo}</p>
                <p className="mt-2 text-[10px] uppercase tracking-wide text-text-muted">
                  MO pattern across linked jurisdictions
                </p>
              </div>
            </section>
          )}

          <section>
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                Linked Entities
              </h3>
              <span className="text-[10px] text-accent-light">Click to trace associations →</span>
            </div>
            <p className="mb-3 text-[11px] leading-relaxed text-text-muted">
              Association detection — follow hidden links between suspects, victims, and locations.
            </p>
            {connectedNodes.length > 0 ? (
              <ul className="space-y-2">
                {connectedNodes.map(({ node: linked, edge }) => (
                  <li key={linked?.id ?? edge.label}>
                    <button
                      type="button"
                      disabled={!linked}
                      onClick={() => handleLinkedEntityClick(linked)}
                      className="flex w-full cursor-pointer items-center justify-between rounded-lg bg-navy-950/50 px-3 py-3 text-left transition-colors ring-1 ring-[#2a4070]/40 hover:bg-accent/10 hover:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white/10"
                          style={{ background: linked ? NODE_COLORS[linked.type] : '#666' }}
                        />
                        <div className="min-w-0">
                          <span className="block truncate text-sm font-medium text-white">{linked?.label}</span>
                          <span className="text-[10px] capitalize text-text-muted">{linked?.type}</span>
                        </div>
                      </div>
                      <div className="ml-2 flex shrink-0 items-center gap-2">
                        <span className="rounded bg-[#132238] px-2 py-0.5 text-[10px] text-text-muted">
                          {edge.label}
                        </span>
                        <svg className="h-4 w-4 text-accent-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-text-muted">No linked entities in the network.</p>
            )}
          </section>
        </div>

        <div className="space-y-2 border-t border-[#2a4070] px-5 py-4">
          <button onClick={handleViewMap} className={`w-full ${btnPrimary}`}>
            View on Crime Map
            {district && <span className="ml-1 text-xs opacity-80">· {district}</span>}
          </button>
          <button
            onClick={() => exportNetworkProfilePDF(node, relatedIncidents, connectedNodes)}
            className={`w-full ${btnSecondary}`}
          >
            Export Profile PDF
          </button>
        </div>
      </aside>
    </>
  )
}
