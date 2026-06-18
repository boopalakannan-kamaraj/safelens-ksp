import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import PageHeader from '../components/ui/PageHeader'
import SortableTh from '../components/ui/SortableTh'
import { btnSegment, btnSegmentActive, btnSegmentGroup } from '../components/ui/formClasses'
import { ErrorState, LoadingSpinner } from '../components/ui/DataState'
import { fetchMonthlyTrends } from '../services/crimeApi'
import type { MonthlyTrend } from '../types/crime'
import { CATEGORY_TO_TREND_KEY, type InvestigationContext } from '../types/navigation'
import { getTopCategoryForMonth } from '../utils/crimeAnalytics'
import { compareValues, toggleSort, type SortDirection } from '../utils/tableHelpers'

type ChartMode = 'total' | 'category' | 'comparison'

const categoryKeys = [
  { key: 'theft', label: 'Theft', color: '#4a90d9' },
  { key: 'assault', label: 'Assault', color: '#e74c3c' },
  { key: 'burglary', label: 'Burglary', color: '#f39c12' },
  { key: 'cybercrime', label: 'Cybercrime', color: '#9b59b6' },
  { key: 'fraud', label: 'Fraud', color: '#1abc9c' },
  { key: 'robbery', label: 'Robbery', color: '#e67e22' },
  { key: 'domesticViolence', label: 'Domestic Violence', color: '#3498db' },
  { key: 'drugOffense', label: 'Drug Offense', color: '#27ae60' },
  { key: 'murder', label: 'Murder', color: '#c0392b' },
  { key: 'kidnapping', label: 'Kidnapping', color: '#8e44ad' },
] as const

type TrendSortKey = 'month' | (typeof categoryKeys)[number]['key'] | 'total'

const tooltipStyle = {
  contentStyle: { background: '#132238', border: '1px solid #2a4570', borderRadius: 8 },
  labelStyle: { color: '#e8edf4' },
}

export default function Trends() {
  const location = useLocation()
  const [trends, setTrends] = useState<MonthlyTrend[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [chartMode, setChartMode] = useState<ChartMode>('total')
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['theft', 'cybercrime', 'assault'])
  const [highlightedCategoryKey, setHighlightedCategoryKey] = useState<string | null>(null)
  const [investigationContext, setInvestigationContext] = useState<InvestigationContext | null>(null)
  const [sort, setSort] = useState<{ key: TrendSortKey; direction: SortDirection } | null>(null)

  useEffect(() => {
    const state = location.state as InvestigationContext | undefined
    if (!state?.category && !state?.district) return

    setInvestigationContext(state)

    if (state.category) {
      const trendKey = CATEGORY_TO_TREND_KEY[state.category]
      if (trendKey) {
        setChartMode('category')
        setSelectedCategories([trendKey])
        setHighlightedCategoryKey(trendKey)
      }
    }
  }, [location.key, location.state])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    fetchMonthlyTrends()
      .then((data) => {
        if (cancelled) return
        setTrends(data)
      })
      .catch((err: Error) => {
        if (cancelled) return
        setError(err.message || 'Unable to load trend data')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [reloadKey])

  const stats = useMemo(() => {
    if (!trends.length) return null
    const latest = trends[trends.length - 1]
    const previous = trends[trends.length - 2]
    const change =
      previous && previous.total > 0
        ? ((latest.total - previous.total) / previous.total) * 100
        : latest.total > 0
          ? 100
          : 0
    const peak = trends.reduce((max, t) => (t.total > max.total ? t : max), trends[0])
    const topCategory = getTopCategoryForMonth(latest)
    const datasetTotal = trends.reduce((sum, t) => sum + t.total, 0)
    return { latest, previous, change, peak, topCategory, datasetTotal }
  }, [trends])

  const toggleCategory = (key: string) => {
    setSelectedCategories((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    )
  }

  const sortedTrends = useMemo(() => {
    if (!sort) return trends
    return [...trends].sort((a, b) => compareValues(a[sort.key], b[sort.key], sort.direction))
  }, [trends, sort])

  const columnMaxes = useMemo(() => {
    const maxes: Record<string, number> = { total: 0 }
    categoryKeys.forEach(({ key }) => {
      maxes[key] = Math.max(...trends.map((row) => row[key]), 0)
    })
    maxes.total = Math.max(...trends.map((row) => row.total), 0)
    return maxes
  }, [trends])

  const totalsRow = useMemo(() => {
    const totals: Record<string, number> = { total: 0 }
    categoryKeys.forEach(({ key }) => {
      totals[key] = trends.reduce((sum, row) => sum + row[key], 0)
    })
    totals.total = trends.reduce((sum, row) => sum + row.total, 0)
    return totals
  }, [trends])

  const handleSort = (key: string) => {
    setSort((prev) => toggleSort(prev, key as TrendSortKey))
  }

  const isMaxCell = (key: string, value: number) => value > 0 && value === columnMaxes[key]

  const maxCellClass = 'rounded bg-accent/15 text-accent-light shadow-[0_0_8px_rgba(74,144,217,0.35)]'

  const stickyLeftTh = 'sticky left-0 z-30 min-w-[96px] bg-surface shadow-[4px_0_8px_-4px_rgba(0,0,0,0.45)]'
  const stickyRightTh = 'sticky right-0 z-30 min-w-[72px] bg-surface text-right shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.45)]'
  const stickyLeftTd = 'sticky left-0 z-10 min-w-[96px] bg-surface shadow-[4px_0_8px_-4px_rgba(0,0,0,0.45)] group-hover:bg-surface-light/50'
  const stickyRightTd = 'sticky right-0 z-10 min-w-[72px] bg-surface text-right shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.45)] group-hover:bg-surface-light/50'
  const stickyLeftTotal = 'sticky left-0 z-10 min-w-[96px] bg-navy-950 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.45)]'
  const stickyRightTotal = 'sticky right-0 z-10 min-w-[72px] bg-navy-950 text-right shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.45)]'

  if (loading) {
    return <LoadingSpinner message="Loading trend data..." />
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => setReloadKey((k) => k + 1)} />
  }

  return (
    <div>
      <PageHeader
        title="Crime Trends"
        description="Temporal analysis of crime patterns across Karnataka"
        actions={
          <div className={btnSegmentGroup}>
            {([
              ['total', 'Overview'],
              ['category', 'By Category'],
              ['comparison', 'Comparison'],
            ] as const).map(([mode, label]) => (
              <button
                key={mode}
                onClick={() => setChartMode(mode)}
                className={`${btnSegment} ${chartMode === mode ? btnSegmentActive : ''}`}
              >
                {label}
              </button>
            ))}
          </div>
        }
      />

      <div className="space-y-6 p-8">
        {investigationContext && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent/40 bg-accent/10 px-4 py-3">
            <p className="text-sm text-white">
              Investigating anomaly
              {investigationContext.category && (
                <>
                  {' '}
                  · <span className="font-semibold text-accent-light">{investigationContext.category}</span>
                </>
              )}
              {investigationContext.district && (
                <>
                  {' '}
                  in <span className="font-semibold text-accent-light">{investigationContext.district}</span>
                </>
              )}
            </p>
            <button
              type="button"
              onClick={() => setInvestigationContext(null)}
              className="text-xs text-text-muted transition-colors hover:text-white"
            >
              Dismiss
            </button>
          </div>
        )}

        {stats && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-border bg-surface p-5">
              <p className="text-sm text-text-muted">Latest Month Total</p>
              <p className="mt-1 text-3xl font-bold text-white">{stats.latest.total.toLocaleString('en-IN')}</p>
              <p className="mt-0.5 text-xs font-medium text-accent-light">{stats.latest.month}</p>
              <p className={`mt-1 text-xs font-medium ${stats.change >= 0 ? 'text-danger' : 'text-success'}`}>
                {stats.change >= 0 ? '↑' : '↓'} {Math.abs(stats.change).toFixed(1)}% vs {stats.previous?.month ?? 'prior month'} ({stats.previous?.total ?? 0})
              </p>
            </div>
            <div className="rounded-xl border border-border bg-surface p-5">
              <p className="text-sm text-text-muted">Peak Month</p>
              <p className="mt-1 text-3xl font-bold text-white">{stats.peak.month}</p>
              <p className="mt-1 text-xs text-text-muted">{stats.peak.total.toLocaleString('en-IN')} incidents</p>
            </div>
            <div className="rounded-xl border border-border bg-surface p-5">
              <p className="text-sm text-text-muted">Top Category (Latest)</p>
              <p className="mt-1 text-3xl font-bold text-accent-light">{stats.topCategory.label}</p>
              <p className="mt-1 text-xs text-text-muted">
                {stats.topCategory.count} incidents in {stats.latest.month}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-surface p-5">
              <p className="text-sm text-text-muted">Dataset Total (18 months)</p>
              <p className="mt-1 text-3xl font-bold text-white">{stats.datasetTotal.toLocaleString('en-IN')}</p>
              <p className="mt-1 text-xs text-text-muted">Jan 2025 – Jun 2026 · {trends.length} months tracked</p>
            </div>
          </div>
        )}

        {chartMode === 'category' && (
          <div className="flex flex-wrap gap-2">
            {categoryKeys.map(({ key, label, color }) => {
              const active = selectedCategories.includes(key)
              return (
                <button
                  key={key}
                  onClick={() => toggleCategory(key)}
                  className={`rounded-full px-3 py-1 text-xs font-medium ring-1 transition-colors ${
                    active
                      ? 'text-white ring-2'
                      : 'bg-surface text-text-muted ring-border hover:text-white'
                  }`}
                  style={active ? { background: `${color}30`, color, boxShadow: `0 0 0 2px ${color}` } : undefined}
                >
                  {label}
                </button>
              )
            })}
          </div>
        )}

        <div className="rounded-xl border border-border bg-surface p-5">
          <h3 className="mb-4 text-sm font-semibold text-white">
            {chartMode === 'total' && 'Monthly Incident Volume'}
            {chartMode === 'category' && 'Category Breakdown Over Time'}
            {chartMode === 'comparison' && 'Theft vs Cybercrime Comparison'}
          </h3>

          <ResponsiveContainer width="100%" height={400}>
            {chartMode === 'total' ? (
              <AreaChart data={trends}>
                <defs>
                  <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4a90d9" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#4a90d9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a4570" />
                <XAxis dataKey="month" stroke="#8ba4c4" fontSize={11} interval={0} angle={-35} textAnchor="end" height={60} />
                <YAxis stroke="#8ba4c4" fontSize={12} />
                <Tooltip {...tooltipStyle} />
                <Area type="monotone" dataKey="total" stroke="#4a90d9" fill="url(#totalGrad)" strokeWidth={2} name="Total Incidents" />
              </AreaChart>
            ) : chartMode === 'comparison' ? (
              <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a4570" />
                <XAxis dataKey="month" stroke="#8ba4c4" fontSize={11} interval={0} angle={-35} textAnchor="end" height={60} />
                <YAxis stroke="#8ba4c4" fontSize={12} />
                <Tooltip {...tooltipStyle} />
                <Legend />
                <Line type="monotone" dataKey="theft" stroke="#4a90d9" strokeWidth={2} dot={{ r: 4 }} name="Theft" />
                <Line type="monotone" dataKey="cybercrime" stroke="#9b59b6" strokeWidth={2} dot={{ r: 4 }} name="Cybercrime" />
              </LineChart>
            ) : (
              <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a4570" />
                <XAxis dataKey="month" stroke="#8ba4c4" fontSize={11} interval={0} angle={-35} textAnchor="end" height={60} />
                <YAxis stroke="#8ba4c4" fontSize={12} />
                <Tooltip {...tooltipStyle} />
                <Legend />
                {categoryKeys
                  .filter(({ key }) => selectedCategories.includes(key))
                  .map(({ key, label, color }) => {
                    const highlighted = highlightedCategoryKey === key
                    return (
                      <Line
                        key={key}
                        type="monotone"
                        dataKey={key}
                        stroke={color}
                        strokeWidth={highlighted ? 4 : 2}
                        dot={{ r: highlighted ? 5 : 3, strokeWidth: highlighted ? 2 : 0 }}
                        activeDot={{ r: highlighted ? 7 : 5 }}
                        name={label}
                        style={highlighted ? { filter: `drop-shadow(0 0 6px ${color})` } : undefined}
                      />
                    )
                  })}
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5">
          <h3 className="mb-4 text-sm font-semibold text-white">Monthly Data Table</h3>
          <div className="overflow-x-auto rounded-lg">
            <table className="w-full min-w-max text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-text-muted">
                  <SortableTh
                    label="Month"
                    sortKey="month"
                    currentSort={sort}
                    onSort={handleSort}
                    className={`${stickyLeftTh} border-r border-border/40`}
                  />
                  {categoryKeys.map(({ key, label }) => (
                    <SortableTh key={key} label={label} sortKey={key} currentSort={sort} onSort={handleSort} className="whitespace-nowrap px-4 py-2" />
                  ))}
                  <SortableTh
                    label="Total"
                    sortKey="total"
                    currentSort={sort}
                    onSort={handleSort}
                    className={`${stickyRightTh} border-l border-border/40`}
                  />
                </tr>
              </thead>
              <tbody>
                {sortedTrends.map((row) => (
                  <tr key={row.month} className="group border-b border-border/50 hover:bg-surface-light/50">
                    <td className={`px-4 py-2 font-medium text-white ${stickyLeftTd} border-r border-border/40`}>
                      {row.month}
                    </td>
                    {categoryKeys.map(({ key }) => (
                      <td
                        key={key}
                        className={`whitespace-nowrap px-4 py-2 text-text-muted ${isMaxCell(key, row[key]) ? maxCellClass : ''}`}
                      >
                        {row[key]}
                      </td>
                    ))}
                    <td
                      className={`px-4 py-2 font-semibold text-accent-light ${stickyRightTd} border-l border-border/40 ${isMaxCell('total', row.total) ? maxCellClass : ''}`}
                    >
                      {row.total}
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-accent/30 bg-navy-950/40 font-semibold">
                  <td className={`px-4 py-2.5 text-white ${stickyLeftTotal} border-r border-border/40`}>Total</td>
                  {categoryKeys.map(({ key }) => (
                    <td key={key} className="whitespace-nowrap px-4 py-2.5 text-accent-light">
                      {totalsRow[key]}
                    </td>
                  ))}
                  <td className={`px-4 py-2.5 text-accent-light ${stickyRightTotal} border-l border-border/40`}>
                    {totalsRow.total}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
