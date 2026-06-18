import { useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import KPICard from '../components/ui/KPICard'
import AnomalyAlerts from '../components/dashboard/AnomalyAlerts'
import PageHeader from '../components/ui/PageHeader'
import IncidentDetailDrawer from '../components/ui/IncidentDetailDrawer'
import Pagination from '../components/ui/Pagination'
import SortableTh from '../components/ui/SortableTh'
import { ErrorState, LoadingSpinner } from '../components/ui/DataState'
import {
  fetchIncidents,
  fetchStats,
  statsToCategoryBreakdown,
  statsToDistrictStats,
  type StatsResponse,
} from '../services/crimeApi'
import type { CrimeIncident } from '../types/crime'
import { computeKPIs } from '../utils/crimeAnalytics'
import { exportIncidentsCSV } from '../utils/exportHelpers'
import { compareValues, paginate, toggleSort, type SortDirection } from '../utils/tableHelpers'
import { severityColor, statusBadge } from '../utils/helpers'
import {
  btnSecondary,
  formDate,
  formDateGroup,
  formInput,
  formLabel,
  formToolbar,
} from '../components/ui/formClasses'

const CHART_COLORS = ['#4a90d9', '#6ba8e8', '#357abd', '#27ae60', '#f39c12', '#e74c3c', '#9b59b6', '#1abc9c', '#e67e22', '#34495e']
const PAGE_SIZE = 10

type IncidentSortKey = 'id' | 'districtName' | 'category' | 'severity' | 'location' | 'officer' | 'date' | 'status'

export default function Dashboard() {
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [allIncidents, setAllIncidents] = useState<CrimeIncident[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [startDate, setStartDate] = useState('2025-01-01')
  const [endDate, setEndDate] = useState('2026-06-08')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState<{ key: IncidentSortKey; direction: SortDirection } | null>({
    key: 'date',
    direction: 'desc',
  })
  const [selectedIncident, setSelectedIncident] = useState<CrimeIncident | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    Promise.all([fetchStats(), fetchIncidents()])
      .then(([statsData, incidents]) => {
        if (cancelled) return
        setStats(statsData)
        setAllIncidents(incidents)
      })
      .catch((err: Error) => {
        if (cancelled) return
        setError(err.message || 'Unable to reach Catalyst API')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [reloadKey])

  const derivedKpis = useMemo(() => (stats ? computeKPIs(allIncidents) : null), [stats, allIncidents])

  const categoryBreakdown = useMemo(
    () => (stats ? statsToCategoryBreakdown(stats) : []),
    [stats],
  )

  const districtStats = useMemo(() => (stats ? statsToDistrictStats(stats) : []), [stats])

  const kpiCards = useMemo(() => {
    if (!stats) return null
    const openCases =
      (stats.byStatus.Open ?? 0) + (stats.byStatus['Under Investigation'] ?? 0)
    const closed = stats.byStatus.Closed ?? 0
    const clearanceRate = stats.total ? +((closed / stats.total) * 100).toFixed(1) : 0
    const highRiskDistricts = Object.values(stats.byDistrict).filter((c) => c >= 20).length
    return { openCases, clearanceRate, highRiskDistricts }
  }, [stats])

  const filtered = useMemo(() => {
    if (!stats) return null
    const start = new Date(startDate)
    const end = new Date(endDate)
    end.setHours(23, 59, 59, 999)

    const incidentsInRange = allIncidents.filter((inc) => {
      const d = new Date(inc.date)
      return d >= start && d <= end
    })

    return {
      incidentsInRange,
      periodIncidents: incidentsInRange.length,
    }
  }, [stats, allIncidents, startDate, endDate])

  const tableData = useMemo(() => {
    if (!filtered) return { items: [], page: 1, totalPages: 1, totalItems: 0 }

    const q = search.toLowerCase().trim()
    let rows = filtered.incidentsInRange

    if (q) {
      rows = rows.filter(
        (inc) =>
          inc.id.toLowerCase().includes(q) ||
          inc.districtName.toLowerCase().includes(q) ||
          inc.category.toLowerCase().includes(q),
      )
    }

    if (sort) {
      rows = [...rows].sort((a, b) => compareValues(a[sort.key], b[sort.key], sort.direction))
    }

    return paginate(rows, page, PAGE_SIZE)
  }, [filtered, search, sort, page])

  const exportRows = useMemo(() => {
    if (!filtered) return []
    const q = search.toLowerCase().trim()
    let rows = filtered.incidentsInRange
    if (q) {
      rows = rows.filter(
        (inc) =>
          inc.id.toLowerCase().includes(q) ||
          inc.districtName.toLowerCase().includes(q) ||
          inc.category.toLowerCase().includes(q),
      )
    }
    if (sort) {
      rows = [...rows].sort((a, b) => compareValues(a[sort.key], b[sort.key], sort.direction))
    }
    return rows
  }, [filtered, search, sort])

  const handleSort = (key: string) => {
    setSort((prev) => toggleSort(prev, key as IncidentSortKey))
    setPage(1)
  }

  const barChartMax = districtStats.length
    ? Math.max(...districtStats.slice(0, 8).map((d) => d.count))
    : 0

  if (loading) {
    return <LoadingSpinner message="Loading intelligence data..." />
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => setReloadKey((k) => k + 1)} />
  }

  if (!stats || !filtered || !kpiCards || !derivedKpis) {
    return null
  }

  return (
    <div>
      <PageHeader
        title="Command Dashboard"
        description="Real-time crime intelligence overview for Karnataka State Police"
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <div className={formDateGroup}>
              <label className={formLabel}>From</label>
              <input
                type="date"
                value={startDate}
                max={endDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={formDate}
              />
            </div>
            <div className={formDateGroup}>
              <label className={formLabel}>To</label>
              <input
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={formDate}
              />
            </div>
            <span className="rounded-lg bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent-light ring-1 ring-accent/30">
              Live · Updated {new Date().toLocaleDateString('en-IN')}
            </span>
          </div>
        }
      />

      <div className="space-y-6 p-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KPICard
            title="Total Incidents"
            value={stats.total.toLocaleString('en-IN')}
            trend={{ value: derivedKpis.monthlyChange, label: 'vs last month' }}
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
              </svg>
            }
          />
          <KPICard
            title="Open Cases"
            value={kpiCards.openCases.toLocaleString('en-IN')}
            subtitle={`${stats.total ? ((kpiCards.openCases / stats.total) * 100).toFixed(1) : 0}% of total`}
            accent="warning"
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            }
          />
          <KPICard
            title="Clearance Rate"
            value={`${kpiCards.clearanceRate}%`}
            subtitle="Cases resolved this quarter"
            accent="success"
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <KPICard
            title="High-Risk Districts"
            value={kpiCards.highRiskDistricts}
            subtitle={`Avg response: ${derivedKpis.avgResponseTime} min`}
            accent="danger"
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            }
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-surface p-5">
            <h3 className="mb-4 text-sm font-semibold text-white">Crime Category Distribution</h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={categoryBreakdown}
                  dataKey="count"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                >
                  {categoryBreakdown.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#132238', border: '1px solid #2a4570', borderRadius: 8 }}
                  labelStyle={{ color: '#e8edf4' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-2 flex flex-wrap gap-3">
              {categoryBreakdown.map((item, i) => (
                <div key={item.category} className="flex items-center gap-1.5 text-xs text-text-muted">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                  {item.category} ({item.count})
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface p-5">
            <h3 className="mb-4 text-sm font-semibold text-white">Top Districts by Incident Count</h3>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={districtStats.slice(0, 8)} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a4570" horizontal={false} />
                <XAxis
                  type="number"
                  stroke="#8ba4c4"
                  fontSize={12}
                  domain={[0, Math.ceil(barChartMax * 1.15)]}
                  tickFormatter={(v) => v.toLocaleString('en-IN')}
                />
                <YAxis
                  type="category"
                  dataKey="districtName"
                  stroke="#8ba4c4"
                  fontSize={11}
                  width={130}
                  tickFormatter={(v: string) => (v.length > 16 ? v.slice(0, 14) + '…' : v)}
                />
                <Tooltip
                  contentStyle={{ background: '#132238', border: '1px solid #2a4570', borderRadius: 8 }}
                  labelStyle={{ color: '#e8edf4' }}
                  formatter={(value) => [Number(value).toLocaleString('en-IN'), 'Incidents']}
                />
                <Bar dataKey="count" fill="#4a90d9" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <AnomalyAlerts />

        <div className="rounded-xl border border-border bg-surface">
          <div className="flex flex-nowrap items-center justify-between gap-3 border-b border-border px-5 py-4">
            <div className="min-w-0 shrink">
              <h3 className="text-sm font-semibold text-white">Recent Incidents</h3>
              <p className="mt-0.5 text-xs text-text-muted">
                {filtered.incidentsInRange.length} records between {startDate} and {endDate}
              </p>
            </div>
            <div className={formToolbar}>
              <input
                type="search"
                placeholder="Search ID, district, category…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                className={`w-[220px] shrink-0 ${formInput}`}
              />
              <button onClick={() => exportIncidentsCSV(exportRows)} className={`${btnSecondary} shrink-0 text-xs`}>
                Export CSV
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-text-muted">
                  <SortableTh label="ID" sortKey="id" currentSort={sort} onSort={handleSort} />
                  <SortableTh label="District" sortKey="districtName" currentSort={sort} onSort={handleSort} />
                  <SortableTh label="Category" sortKey="category" currentSort={sort} onSort={handleSort} />
                  <SortableTh label="Severity" sortKey="severity" currentSort={sort} onSort={handleSort} />
                  <SortableTh label="Location" sortKey="location" currentSort={sort} onSort={handleSort} />
                  <SortableTh label="Officer" sortKey="officer" currentSort={sort} onSort={handleSort} />
                  <SortableTh label="Date" sortKey="date" currentSort={sort} onSort={handleSort} />
                  <SortableTh label="Status" sortKey="status" currentSort={sort} onSort={handleSort} />
                </tr>
              </thead>
              <tbody>
                {tableData.totalItems === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-8 text-center text-text-muted">
                      No incidents found matching your filters.
                    </td>
                  </tr>
                ) : (
                  tableData.items.map((inc) => (
                    <tr
                      key={inc.id}
                      onClick={() => setSelectedIncident(inc)}
                      className="cursor-pointer border-b border-border/50 transition-colors hover:bg-surface-light/50"
                    >
                      <td className="px-5 py-3 font-mono text-xs text-accent-light">{inc.id}</td>
                      <td className="px-5 py-3 text-white">{inc.districtName}</td>
                      <td className="px-5 py-3 text-text-muted">{inc.category}</td>
                      <td className="px-5 py-3">
                        <span
                          className="inline-flex items-center gap-1.5 text-xs font-medium"
                          style={{ color: severityColor(inc.severity) }}
                        >
                          <span className="h-1.5 w-1.5 rounded-full" style={{ background: severityColor(inc.severity) }} />
                          {inc.severity}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-text-muted">{inc.location}</td>
                      <td className="px-5 py-3 text-xs text-text-muted">{inc.officer}</td>
                      <td className="px-5 py-3 text-text-muted">{inc.date}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${statusBadge(inc.status)}`}>
                          {inc.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {tableData.totalItems > 0 && (
            <Pagination
              page={tableData.page}
              totalPages={tableData.totalPages}
              totalItems={tableData.totalItems}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
          )}
        </div>

        <IncidentDetailDrawer
          incident={selectedIncident}
          incidents={exportRows}
          onClose={() => setSelectedIncident(null)}
          onSelect={setSelectedIncident}
        />
      </div>
    </div>
  )
}
