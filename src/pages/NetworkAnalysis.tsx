import { useEffect, useMemo, useState } from 'react'
import PageHeader from '../components/ui/PageHeader'
import ForceDirectedNetworkGraph, { NODE_COLORS } from '../components/network/ForceDirectedNetworkGraph'
import NetworkProfileDrawer from '../components/network/NetworkProfileDrawer'
import {
  btnPrimary,
  btnSegment,
  btnSegmentActive,
  btnSegmentGroup,
  formInput,
} from '../components/ui/formClasses'
import { fetchIncidents, fetchNetworkData } from '../services/crimeApi'
import type { CrimeIncident, NetworkEdge, NetworkNode } from '../types/crime'

export default function NetworkAnalysis() {
  const [nodes, setNodes] = useState<NetworkNode[]>([])
  const [edges, setEdges] = useState<NetworkEdge[]>([])
  const [incidents, setIncidents] = useState<CrimeIncident[]>([])
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'suspect' | 'victim' | 'location'>('all')
  const [loading, setLoading] = useState(true)
  const [nodeSearch, setNodeSearch] = useState('')
  const [searchHighlightId, setSearchHighlightId] = useState<string | null>(null)
  const [searchMessage, setSearchMessage] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([fetchNetworkData(), fetchIncidents()])
      .then(([{ nodes: n, edges: e }, inc]) => {
        setNodes(n)
        setEdges(e)
        setIncidents(inc)
      })
      .finally(() => setLoading(false))
  }, [])

  const filteredNodes = filter === 'all' ? nodes : nodes.filter((n) => n.type === filter)
  const filteredEdges =
    filter === 'all'
      ? edges
      : edges.filter((e) => {
          const nodeIds = new Set(filteredNodes.map((n) => n.id))
          return nodeIds.has(e.source) && nodeIds.has(e.target)
        })

  const selected = nodes.find((n) => n.id === selectedNode)

  const connectedEdges = selectedNode
    ? edges.filter((e) => e.source === selectedNode || e.target === selectedNode)
    : []

  const relatedIncidents = useMemo(() => {
    if (!selected) return []
    if (selected.type === 'suspect') {
      return incidents.filter((i) => i.suspectId === selected.id)
    }
    if (selected.type === 'victim') {
      return incidents.filter((i) => i.victimId === selected.id)
    }
    if (selected.type === 'location') {
      return incidents.filter((i) => i.districtName === selected.label)
    }
    return []
  }, [selected, incidents])

  const connectedNodes = connectedEdges
    .map((edge) => {
      const otherId = edge.source === selectedNode ? edge.target : edge.source
      const other = nodes.find((n) => n.id === otherId)
      return { node: other, edge }
    })
    .filter((c) => c.node)

  const handleNodeSearch = () => {
    const q = nodeSearch.trim().toLowerCase()
    if (!q) {
      setSearchHighlightId(null)
      setSearchMessage(null)
      return
    }

    const match = nodes.find(
      (n) => (n.type === 'suspect' || n.type === 'victim') && n.label.toLowerCase().includes(q),
    )

    if (match) {
      openNodeProfile(match.id)
      setSearchMessage(null)
      if (filter !== 'all' && match.type !== filter) {
        setFilter('all')
      }
    } else {
      setSearchHighlightId(null)
      setSearchMessage(`No suspect or victim found matching "${nodeSearch.trim()}"`)
    }
  }

  const openNodeProfile = (id: string) => {
    setSelectedNode(id)
    setSearchHighlightId(id)
  }

  const closeDrawer = () => {
    setSelectedNode(null)
    setSearchHighlightId(null)
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex items-center gap-3 text-text-muted">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          Loading network data...
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Network Analysis"
        description="Suspect-victim-location connection mapping and relationship intelligence"
        actions={
          <div className={btnSegmentGroup}>
            {(['all', 'suspect', 'victim', 'location'] as const).map((f) => (
              <button
                key={f}
                onClick={() => {
                  setFilter(f)
                  closeDrawer()
                  setSearchMessage(null)
                }}
                className={`${btnSegment} capitalize ${filter === f ? btnSegmentActive : ''}`}
              >
                {f === 'all' ? 'All Nodes' : `${f}s`}
              </button>
            ))}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 p-8 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <div className="rounded-xl border border-border bg-surface p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-white">Connection Graph</h3>
              <div className="flex gap-4 text-xs">
                {Object.entries(NODE_COLORS).map(([type, color]) => (
                  <span key={type} className="flex items-center gap-1.5 capitalize text-text-muted">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
                    {type}
                  </span>
                ))}
              </div>
            </div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <input
                type="search"
                placeholder="Search suspect or victim by name…"
                value={nodeSearch}
                onChange={(e) => {
                  setNodeSearch(e.target.value)
                  if (!e.target.value.trim()) {
                    setSearchHighlightId(null)
                    setSearchMessage(null)
                  }
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleNodeSearch()}
                className={`min-w-[220px] flex-1 ${formInput}`}
              />
              <button onClick={handleNodeSearch} className={`${btnPrimary} text-xs`}>
                Find
              </button>
            </div>
            {searchMessage && <p className="mb-2 text-xs text-warning">{searchMessage}</p>}
            <p className="mb-2 text-xs text-text-muted">
              Drag nodes to explore · hover to isolate connections · click to open profile
            </p>
            <div className="h-[min(560px,70vh)] min-h-[480px] overflow-hidden rounded-lg bg-navy-950/50">
              <ForceDirectedNetworkGraph
                nodes={filteredNodes}
                edges={filteredEdges}
                selectedNode={selectedNode}
                hoveredNode={hoveredNode}
                searchHighlightId={searchHighlightId}
                onSelectNode={openNodeProfile}
                onHoverNode={setHoveredNode}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-border bg-surface p-5">
            <h3 className="text-sm font-semibold text-white">Network Summary</h3>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-navy-950/50 p-3 text-center">
                <p className="text-2xl font-bold text-danger">{nodes.filter((n) => n.type === 'suspect').length}</p>
                <p className="text-xs text-text-muted">Suspects</p>
              </div>
              <div className="rounded-lg bg-navy-950/50 p-3 text-center">
                <p className="text-2xl font-bold text-accent">{nodes.filter((n) => n.type === 'victim').length}</p>
                <p className="text-xs text-text-muted">Victims</p>
              </div>
              <div className="rounded-lg bg-navy-950/50 p-3 text-center">
                <p className="text-2xl font-bold text-success">{nodes.filter((n) => n.type === 'location').length}</p>
                <p className="text-xs text-text-muted">Locations</p>
              </div>
              <div className="rounded-lg bg-navy-950/50 p-3 text-center">
                <p className="text-2xl font-bold text-white">{edges.length}</p>
                <p className="text-xs text-text-muted">Connections</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface p-5">
            <h3 className="text-sm font-semibold text-white">High-Risk Suspects</h3>
            <ul className="mt-3 space-y-2">
              {nodes
                .filter((n) => n.type === 'suspect' && n.riskScore)
                .sort((a, b) => (b.riskScore ?? 0) - (a.riskScore ?? 0))
                .slice(0, 5)
                .map((suspect) => (
                  <li
                    key={suspect.id}
                    onClick={() => openNodeProfile(suspect.id)}
                    className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 transition-colors hover:bg-navy-950/50 ${
                      selectedNode === suspect.id ? 'bg-accent/10 ring-1 ring-accent/30' : 'bg-navy-950/50'
                    }`}
                  >
                    <span className="text-sm text-white">{suspect.label}</span>
                    <span className="rounded-full bg-danger/15 px-2 py-0.5 text-xs font-semibold text-danger">
                      {suspect.riskScore}
                    </span>
                  </li>
                ))}
            </ul>
          </div>
        </div>
      </div>

      <NetworkProfileDrawer
        node={selected ?? null}
        relatedIncidents={relatedIncidents}
        connectedNodes={connectedNodes}
        onClose={closeDrawer}
        onSelectNode={openNodeProfile}
      />
    </div>
  )
}
