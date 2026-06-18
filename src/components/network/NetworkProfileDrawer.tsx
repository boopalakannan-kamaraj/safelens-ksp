import { useEffect, useState } from 'react'
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
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (node) {
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

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {node.riskScore != null && (
            <div className="mb-5 rounded-lg bg-navy-950/40 p-4 ring-1 ring-danger/25">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">Risk Score</p>
                <p className="text-2xl font-bold text-danger">{node.riskScore}<span className="text-sm text-text-muted">/100</span></p>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-navy-950">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-warning to-danger transition-all duration-500"
                  style={{ width: `${node.riskScore}%` }}
                />
              </div>
            </div>
          )}

          {node.mo && (
            <section className="mb-5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">Modus Operandi</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#c8dff5]">{node.mo}</p>
            </section>
          )}

          <section className="mb-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Connected Incidents ({relatedIncidents.length})
            </h3>
            {relatedIncidents.length > 0 ? (
              <ul className="mt-2 max-h-52 space-y-2 overflow-y-auto pr-1">
                {relatedIncidents.map((inc) => (
                  <li key={inc.id} className="rounded-lg bg-navy-950/50 p-3 ring-1 ring-[#2a4070]/60">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs text-accent-light">{inc.id}</span>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] ring-1 ${statusBadge(inc.status)}`}>
                        {inc.status}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs text-white">{inc.category} · {inc.location}</p>
                    <p className="text-[11px] text-text-muted">{inc.districtName}</p>
                    <p className="mt-1 line-clamp-2 text-[11px] text-text-muted">{inc.description}</p>
                    <p className="mt-1.5 text-[10px]" style={{ color: severityColor(inc.severity) }}>
                      {inc.severity} · {inc.date}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-text-muted">No direct incident records linked.</p>
            )}
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Linked Entities ({connectedNodes.length})
            </h3>
            {connectedNodes.length > 0 ? (
              <ul className="mt-2 space-y-1.5">
                {connectedNodes.map(({ node: linked, edge }, i) => (
                  <li
                    key={i}
                    onClick={() => linked && onSelectNode(linked.id)}
                    className="flex cursor-pointer items-center justify-between rounded-lg bg-navy-950/50 px-3 py-2.5 transition-colors hover:bg-navy-950 ring-1 ring-[#2a4070]/40"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ background: linked ? NODE_COLORS[linked.type] : '#666' }}
                      />
                      <div className="min-w-0">
                        <span className="block truncate text-xs font-medium text-white">{linked?.label}</span>
                        <span className="text-[10px] capitalize text-text-muted">{linked?.type}</span>
                      </div>
                    </div>
                    <span className="ml-2 shrink-0 rounded bg-[#132238] px-2 py-0.5 text-[10px] text-text-muted">
                      {edge.label}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-text-muted">No linked entities in the network.</p>
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
