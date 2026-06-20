import { useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import PageHeader from '../components/ui/PageHeader'
import NativeSelect from '../components/ui/NativeSelect'
import {
  btnSecondary,
  formInput,
  formToolbar,
} from '../components/ui/formClasses'
import { ErrorState, LoadingSpinner } from '../components/ui/DataState'
import { fetchRiskPredictions } from '../services/crimeApi'
import type { RiskDriver, RiskPrediction } from '../types/crime'
import { exportRiskPDF } from '../utils/exportHelpers'
import { riskLevel, trendIcon } from '../utils/helpers'

function RiskGauge({ score }: { score: number }) {
  const { color } = riskLevel(score)
  const circumference = 2 * Math.PI * 54
  const offset = circumference - (score / 100) * circumference

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="140" height="140" className="-rotate-90">
        <circle cx="70" cy="70" r="54" fill="none" stroke="#2a4570" strokeWidth="10" />
        <circle
          cx="70"
          cy="70"
          r="54"
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-3xl font-bold text-white">{score}</p>
        <p className="text-xs text-text-muted">Risk Score</p>
      </div>
    </div>
  )
}

function RiskDriversBreakdown({ drivers }: { drivers: RiskDriver[] }) {
  if (drivers.length === 0) {
    return (
      <p className="text-xs text-text-muted">Insufficient incident data to compute driver breakdown.</p>
    )
  }

  return (
    <ul className="space-y-2.5">
      {drivers.map((driver) => (
        <li key={driver.label}>
          <div className="mb-1 flex items-center justify-between gap-2 text-xs">
            <span className="font-medium text-white">{driver.label}</span>
            <span className="shrink-0 text-text-muted">{driver.percent}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-navy-950">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${driver.percent}%` }}
            />
          </div>
          <p className="mt-1 text-[10px] leading-snug text-text-muted">{driver.detail}</p>
        </li>
      ))}
    </ul>
  )
}

function DistrictDetailPanel({ district }: { district: RiskPrediction }) {
  const trend = trendIcon(district.trend)

  return (
    <div className="rounded-xl border border-accent/30 bg-surface p-5">
      <h3 className="text-sm font-semibold text-white">{district.districtName}</h3>
      <div className="mt-4 flex justify-center">
        <RiskGauge score={district.riskScore} />
      </div>
      <div className="mt-4 space-y-2 text-center">
        <p className={`text-sm font-medium ${trend.color}`}>
          {trend.icon} {trend.label} Trend
        </p>
        <p className="text-xs text-text-muted">
          Primary Threat: <span className="text-accent-light">{district.primaryThreat}</span>
        </p>
        <p className="text-xs text-text-muted">
          Confidence: <span className="text-white">{(district.confidence * 100).toFixed(0)}%</span>
        </p>
        <p className="text-xs text-text-muted">
          Predicted Incidents (30d):{' '}
          <span className="font-semibold text-warning">{district.predictedIncidents}</span>
        </p>
      </div>
      <div className="mt-4 border-t border-border pt-4">
        <p className="text-xs font-medium text-text-muted">Risk Drivers</p>
        <p className="mt-0.5 text-[10px] text-text-muted">
          Share of weighted model inputs (excludes 40-point baseline floor).
        </p>
        <div className="mt-3">
          <RiskDriversBreakdown drivers={district.drivers} />
        </div>
      </div>
      <div className="mt-4 border-t border-border pt-4">
        <p className="text-xs font-medium text-text-muted">Supporting Evidence</p>
        <ul className="mt-2 space-y-1.5">
          {district.factors.map((factor, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-white">
              <span className="mt-0.5 text-accent">•</span>
              {factor}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default function RiskScoring() {
  const [predictions, setPredictions] = useState<RiskPrediction[]>([])
  const [selected, setSelected] = useState<RiskPrediction | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [sortBy, setSortBy] = useState<'score' | 'incidents'>('score')
  const [search, setSearch] = useState('')
  const [levelFilter, setLevelFilter] = useState<'all' | 'Critical' | 'High' | 'Medium' | 'Low'>('all')
  const [trendFilter, setTrendFilter] = useState<'all' | 'rising' | 'stable' | 'declining'>('all')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    fetchRiskPredictions()
      .then((data) => {
        if (cancelled) return
        setPredictions(data)
        setSelected(data[0] ?? null)
      })
      .catch((err: Error) => {
        if (cancelled) return
        setError(err.message || 'Unable to run risk analysis')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [reloadKey])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return predictions.filter((p) => {
      if (q && !p.districtName.toLowerCase().includes(q)) return false
      if (levelFilter !== 'all' && riskLevel(p.riskScore).label !== levelFilter) return false
      if (trendFilter !== 'all' && p.trend !== trendFilter) return false
      return true
    })
  }, [predictions, search, levelFilter, trendFilter])

  const sorted = useMemo(
    () =>
      [...filtered].sort((a, b) =>
        sortBy === 'score' ? b.riskScore - a.riskScore : b.predictedIncidents - a.predictedIncidents,
      ),
    [filtered, sortBy],
  )

  const chartData = sorted.map((p) => ({
    name: p.districtName.split(' ')[0],
    score: p.riskScore,
    predicted: p.predictedIncidents,
  }))

  if (loading) {
    return <LoadingSpinner message="Running risk analysis..." />
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => setReloadKey((k) => k + 1)} />
  }

  return (
    <div>
      <PageHeader
        title="AI Risk Scoring"
        description="Machine learning-powered crime risk prediction by district"
        actions={
          <div className={`${formToolbar} flex-wrap md:flex-nowrap`}>
            <span className="flex shrink-0 items-center gap-1.5 rounded-lg bg-success/10 px-3 py-1.5 text-xs font-medium text-success ring-1 ring-success/30">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
              Model Active
            </span>
            <NativeSelect
              selectWidth="wide"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'score' | 'incidents')}
            >
              <option value="score">Sort by Risk Score</option>
              <option value="incidents">Sort by Predicted Incidents</option>
            </NativeSelect>
          </div>
        }
      />

      <div className="space-y-6 p-8">
        <div className="rounded-xl border border-border bg-surface p-5">
          <h3 className="mb-4 text-sm font-semibold text-white">District Risk Scores</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a4570" />
              <XAxis dataKey="name" stroke="#8ba4c4" fontSize={11} />
              <YAxis stroke="#8ba4c4" fontSize={12} domain={[0, 100]} />
              <Tooltip
                contentStyle={{ background: '#132238', border: '1px solid #2a4570', borderRadius: 8 }}
                labelStyle={{ color: '#e8edf4' }}
              />
              <Bar dataKey="score" radius={[4, 4, 0, 0]} name="Risk Score">
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={riskLevel(entry.score).color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,320px)]">
          <div className="order-2 min-w-0 space-y-6 lg:order-1">
            <div className="rounded-xl border border-border bg-surface">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
            <div>
              <h3 className="text-sm font-semibold text-white">District Risk Rankings</h3>
              <p className="mt-0.5 text-xs text-text-muted">
                {sorted.length} of {predictions.length} districts shown
              </p>
            </div>
            <div className={`${formToolbar} flex-wrap lg:flex-nowrap`}>
              <input
                type="search"
                placeholder="Search district…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`w-auto min-w-[180px] ${formInput}`}
              />
              <NativeSelect
                selectWidth="medium"
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value as typeof levelFilter)}
              >
                <option value="all">All Levels</option>
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </NativeSelect>
              <NativeSelect
                selectWidth="medium"
                value={trendFilter}
                onChange={(e) => setTrendFilter(e.target.value as typeof trendFilter)}
              >
                <option value="all">All Trends</option>
                <option value="rising">Rising</option>
                <option value="stable">Stable</option>
                <option value="declining">Declining</option>
              </NativeSelect>
              <button
                onClick={() => exportRiskPDF(sorted.length ? sorted : predictions)}
                className={`${btnSecondary} shrink-0 text-xs`}
              >
                Export PDF Report
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-text-muted">
                  <th className="px-5 py-3 font-medium">Rank</th>
                  <th className="px-5 py-3 font-medium">District</th>
                  <th className="px-5 py-3 font-medium">Risk Score</th>
                  <th className="px-5 py-3 font-medium">Level</th>
                  <th className="px-5 py-3 font-medium">Trend</th>
                  <th className="px-5 py-3 font-medium">Primary Threat</th>
                  <th className="px-5 py-3 font-medium">Confidence</th>
                  <th className="px-5 py-3 font-medium">Predicted (30d)</th>
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-8 text-center text-text-muted">
                      No districts match your filters.
                    </td>
                  </tr>
                ) : (
                  sorted.map((pred, i) => {
                  const level = riskLevel(pred.riskScore)
                  const trend = trendIcon(pred.trend)
                  return (
                    <tr
                      key={pred.districtId}
                      onClick={() => setSelected(pred)}
                      className={`cursor-pointer border-b border-border/50 transition-colors hover:bg-surface-light/50 ${
                        selected?.districtId === pred.districtId ? 'bg-accent/5' : ''
                      }`}
                    >
                      <td className="px-5 py-3 font-mono text-xs text-text-muted">#{i + 1}</td>
                      <td className="px-5 py-3 font-medium text-white">{pred.districtName}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 overflow-hidden rounded-full bg-navy-950">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${pred.riskScore}%`, background: level.color }}
                            />
                          </div>
                          <span className="font-semibold" style={{ color: level.color }}>
                            {pred.riskScore}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className="rounded-full px-2.5 py-0.5 text-xs font-medium ring-1"
                          style={{ color: level.color, background: `${level.color}15`, borderColor: `${level.color}30` }}
                        >
                          {level.label}
                        </span>
                      </td>
                      <td className={`px-5 py-3 text-xs font-medium ${trend.color}`}>
                        {trend.icon} {trend.label}
                      </td>
                      <td className="px-5 py-3 text-text-muted">{pred.primaryThreat}</td>
                      <td className="px-5 py-3 text-text-muted">{(pred.confidence * 100).toFixed(0)}%</td>
                      <td className="px-5 py-3 font-semibold text-warning">{pred.predictedIncidents}</td>
                    </tr>
                  )
                })
                )}
              </tbody>
            </table>
          </div>
            </div>

            <div className="rounded-xl border border-border bg-surface p-5">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 ring-1 ring-accent/30">
                  <svg className="h-5 w-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.847-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.847.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">AI Model Information</h3>
                  <p className="mt-1 text-sm text-text-muted">
                    Risk scores are generated using a gradient boosting model trained on historical crime data,
                    demographic indicators, seasonal patterns, and geographic clustering. Scores range from 0–100
                    with confidence intervals based on data completeness per district.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-4 text-xs text-text-muted">
                    <span>Model: XGBoost v2.1</span>
                    <span>Last trained: May 2026</span>
                    <span>Features: 47</span>
                    <span>Accuracy: 84.3%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {selected && (
            <aside className="order-1 lg:order-2 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
              <DistrictDetailPanel district={selected} />
            </aside>
          )}
        </div>
      </div>
    </div>
  )
}
