import type { CrimeCategory, CrimeIncident, CrimeSeverity, MonthlyTrend, RiskPrediction } from '../types/crime'

type TrendKey = Exclude<keyof MonthlyTrend, 'month' | 'total'>

const CATEGORY_TO_KEY: Record<CrimeCategory, TrendKey> = {
  Theft: 'theft',
  Assault: 'assault',
  Burglary: 'burglary',
  Cybercrime: 'cybercrime',
  Fraud: 'fraud',
  Robbery: 'robbery',
  'Domestic Violence': 'domesticViolence',
  'Drug Offense': 'drugOffense',
  Murder: 'murder',
  Kidnapping: 'kidnapping',
}

const TREND_KEYS: TrendKey[] = [
  'theft', 'assault', 'burglary', 'cybercrime', 'fraud',
  'robbery', 'domesticViolence', 'drugOffense', 'murder', 'kidnapping',
]

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const TREND_RANGE_START = { year: 2025, month: 1 }
const TREND_RANGE_END = { year: 2026, month: 6 }

const SEVERITY_WEIGHT: Record<CrimeSeverity, number> = {
  Low: 1,
  Medium: 2,
  High: 3.5,
  Critical: 5,
}

const CATEGORY_DANGER: Record<CrimeCategory, number> = {
  Murder: 5,
  Kidnapping: 4.5,
  Robbery: 3.5,
  Assault: 3,
  'Drug Offense': 2.8,
  Burglary: 2.2,
  Cybercrime: 2.5,
  Fraud: 2,
  'Domestic Violence': 2.4,
  Theft: 1.5,
}

function parseIncidentMonth(dateStr: string): { year: number; month: number } {
  const [year, month] = dateStr.split('-').map(Number)
  return { year, month }
}

function monthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}`
}

function emptyMonth(): Omit<MonthlyTrend, 'month'> {
  return {
    theft: 0,
    assault: 0,
    burglary: 0,
    cybercrime: 0,
    fraud: 0,
    robbery: 0,
    domesticViolence: 0,
    drugOffense: 0,
    murder: 0,
    kidnapping: 0,
    total: 0,
  }
}

function finalizeMonth(data: Omit<MonthlyTrend, 'month'>) {
  data.total = TREND_KEYS.reduce((sum, key) => sum + data[key], 0)
  return data
}

function enumerateMonths(
  start = TREND_RANGE_START,
  end = TREND_RANGE_END,
): Array<{ year: number; month: number; key: string }> {
  const months: Array<{ year: number; month: number; key: string }> = []
  let year = start.year
  let month = start.month

  while (year < end.year || (year === end.year && month <= end.month)) {
    months.push({ year, month, key: monthKey(year, month) })
    month++
    if (month > 12) {
      month = 1
      year++
    }
  }
  return months
}

export function computeCategoryBreakdown(incidents: CrimeIncident[]) {
  const counts = new Map<string, number>()
  for (const inc of incidents) {
    counts.set(inc.category, (counts.get(inc.category) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .map(([category, count]) => ({ category: category as CrimeCategory, count }))
    .sort((a, b) => b.count - a.count)
}

export function computeDistrictStats(incidents: CrimeIncident[]) {
  const stats = new Map<string, { count: number; maxSeverity: number; districtName: string }>()
  const severityRank: Record<CrimeSeverity, number> = { Low: 1, Medium: 2, High: 3, Critical: 4 }
  const rankToSeverity: CrimeSeverity[] = ['Low', 'Medium', 'High', 'Critical']

  for (const inc of incidents) {
    const existing = stats.get(inc.districtId) ?? { count: 0, maxSeverity: 0, districtName: inc.districtName }
    existing.count++
    existing.maxSeverity = Math.max(existing.maxSeverity, severityRank[inc.severity])
    stats.set(inc.districtId, existing)
  }

  return Array.from(stats.entries())
    .map(([districtId, { count, maxSeverity, districtName }]) => ({
      districtId,
      districtName,
      count,
      severity: rankToSeverity[maxSeverity - 1] ?? 'Low',
    }))
    .sort((a, b) => b.count - a.count)
}

export function computeMonthlyTrends(incidents: CrimeIncident[]): MonthlyTrend[] {
  const buckets = new Map<string, Omit<MonthlyTrend, 'month'>>()

  for (const { year, month, key } of enumerateMonths()) {
    buckets.set(key, emptyMonth())
    void year
    void month
  }

  for (const inc of incidents) {
    const { year, month } = parseIncidentMonth(inc.date)
    const key = monthKey(year, month)
    if (!buckets.has(key)) continue

    const bucket = buckets.get(key)!
    const catKey = CATEGORY_TO_KEY[inc.category]
    bucket[catKey]++
  }

  return enumerateMonths().map(({ year, month, key }) => {
    const data = finalizeMonth(buckets.get(key) ?? emptyMonth())
    return {
      month: `${MONTH_LABELS[month - 1]} ${year}`,
      ...data,
    }
  })
}

export function getTopCategoryForMonth(month: MonthlyTrend): { label: string; count: number; key: TrendKey } {
  let topKey: TrendKey = 'theft'
  let topCount = 0
  for (const key of TREND_KEYS) {
    if (month[key] > topCount) {
      topCount = month[key]
      topKey = key
    }
  }
  const label = categoryKeysLabel[topKey]
  return { label, count: topCount, key: topKey }
}

const categoryKeysLabel: Record<TrendKey, string> = {
  theft: 'Theft',
  assault: 'Assault',
  burglary: 'Burglary',
  cybercrime: 'Cybercrime',
  fraud: 'Fraud',
  robbery: 'Robbery',
  domesticViolence: 'Domestic Violence',
  drugOffense: 'Drug Offense',
  murder: 'Murder',
  kidnapping: 'Kidnapping',
}

export function computeKPIs(incidents: CrimeIncident[]) {
  const openCases = incidents.filter((i) => i.status === 'Open' || i.status === 'Under Investigation').length
  const closedCases = incidents.filter((i) => i.status === 'Closed').length
  const clearanceRate = incidents.length ? +((closedCases / incidents.length) * 100).toFixed(1) : 0

  const byMonth = computeMonthlyTrends(incidents)
  const monthlyChange =
    byMonth.length >= 2
      ? +(((byMonth[byMonth.length - 1].total - byMonth[byMonth.length - 2].total) /
          Math.max(byMonth[byMonth.length - 2].total, 1)) *
        100).toFixed(1)
      : 0

  const districtStats = computeDistrictStats(incidents)
  const highRiskDistricts = districtStats.filter((d) => d.count >= 15 || d.severity === 'Critical').length

  return {
    totalIncidents: incidents.length,
    openCases,
    clearanceRate,
    avgResponseTime: 11.8,
    highRiskDistricts: Math.min(highRiskDistricts, 12),
    monthlyChange,
  }
}

function districtTrend(incidents: CrimeIncident[], districtId: string): 'rising' | 'stable' | 'declining' {
  const districtIncidents = incidents
    .filter((i) => i.districtId === districtId)
    .sort((a, b) => a.date.localeCompare(b.date))

  if (districtIncidents.length < 4) return 'stable'

  const mid = Math.floor(districtIncidents.length / 2)
  const firstHalf = districtIncidents.slice(0, mid).length
  const secondHalf = districtIncidents.length - firstHalf
  const ratio = secondHalf / Math.max(firstHalf, 1)

  if (ratio > 1.2) return 'rising'
  if (ratio < 0.85) return 'declining'
  return 'stable'
}

function computeRawRiskScore(districtIncidents: CrimeIncident[], maxCount: number): number {
  if (districtIncidents.length === 0) return 40

  const count = districtIncidents.length
  const countNorm = count / Math.max(maxCount, 1)

  const avgSeverity =
    districtIncidents.reduce((s, i) => s + SEVERITY_WEIGHT[i.severity], 0) / count
  const severityNorm = avgSeverity / 5

  const criticalHigh = districtIncidents.filter((i) => i.severity === 'Critical' || i.severity === 'High').length
  const criticalHighNorm = criticalHigh / count

  const avgCategoryDanger =
    districtIncidents.reduce((s, i) => s + CATEGORY_DANGER[i.category], 0) / count
  const categoryNorm = avgCategoryDanger / 5

  const violentCrimes = districtIncidents.filter((i) =>
    ['Murder', 'Kidnapping', 'Robbery', 'Assault'].includes(i.category),
  ).length
  const violentNorm = violentCrimes / count

  const raw =
    40 +
    countNorm * 28 +
    severityNorm * 18 +
    criticalHighNorm * 12 +
    categoryNorm * 10 +
    violentNorm * 7

  return Math.min(95, Math.max(40, raw))
}

function uniquifyScores(
  predictions: Array<RiskPrediction & { rawScore: number }>,
): RiskPrediction[] {
  const used = new Set<number>()
  const sorted = [...predictions].sort((a, b) => b.rawScore - a.rawScore)

  return sorted.map((p, index) => {
    let score = Math.round(p.rawScore)

    while (used.has(score) && score < 95) score++
    while (used.has(score) && score > 40) score--

    if (used.has(score)) {
      score = Math.min(95, 40 + ((index * 7 + p.districtId.charCodeAt(0)) % 56))
      while (used.has(score) && score < 95) score++
    }

    used.add(score)

    const { rawScore: _, ...rest } = p
    return { ...rest, riskScore: score }
  })
}

export function computeRiskPredictions(incidents: CrimeIncident[]): RiskPrediction[] {
  const districtStats = computeDistrictStats(incidents)
  const maxCount = districtStats[0]?.count ?? 1
  const byDistrict = new Map<string, CrimeIncident[]>()

  for (const inc of incidents) {
    if (!byDistrict.has(inc.districtId)) byDistrict.set(inc.districtId, [])
    byDistrict.get(inc.districtId)!.push(inc)
  }

  const predictions = districtStats.map((d) => {
    const districtIncidents = byDistrict.get(d.districtId) ?? []
    const categoryCounts = new Map<string, number>()
    for (const inc of districtIncidents) {
      categoryCounts.set(inc.category, (categoryCounts.get(inc.category) ?? 0) + 1)
    }

    const primaryThreat =
      ([...categoryCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] as CrimeCategory) ?? 'Theft'

    const criticalCount = districtIncidents.filter((i) => i.severity === 'Critical').length
    const highCount = districtIncidents.filter((i) => i.severity === 'High').length
    const violentCount = districtIncidents.filter((i) =>
      ['Murder', 'Kidnapping', 'Robbery'].includes(i.category),
    ).length

    const rawScore = computeRawRiskScore(districtIncidents, maxCount)
    const trend = districtTrend(incidents, d.districtId)

    return {
      districtId: d.districtId,
      districtName: d.districtName,
      riskScore: 0,
      rawScore,
      trend,
      primaryThreat,
      confidence: +(0.68 + (d.count / maxCount) * 0.27 + (criticalCount > 0 ? 0.03 : 0)).toFixed(2),
      factors: [
        `${d.count} incidents — ${criticalCount} critical, ${highCount} high severity`,
        `Primary threat: ${primaryThreat} (${categoryCounts.get(primaryThreat) ?? 0} cases)`,
        violentCount > 0
          ? `${violentCount} violent crime${violentCount > 1 ? 's' : ''} recorded`
          : 'Low violent crime density relative to volume',
        trend === 'rising'
          ? 'Incident volume trending upward in recent period'
          : trend === 'declining'
            ? 'Incident volume declining in recent period'
            : 'Stable incident volume over time',
      ],
      predictedIncidents: Math.max(3, Math.round(d.count * (trend === 'rising' ? 0.42 : trend === 'declining' ? 0.28 : 0.35))),
    }
  })

  return uniquifyScores(predictions).sort((a, b) => b.riskScore - a.riskScore)
}

/** Crime map heatmap tier based on district incident count */
export function getHeatmapTier(count: number): 'high' | 'medium' | 'low' | 'none' {
  if (count >= 15) return 'high'
  if (count >= 8) return 'medium'
  if (count >= 1) return 'low'
  return 'none'
}

export function getHeatmapTierLabel(tier: ReturnType<typeof getHeatmapTier>): string {
  switch (tier) {
    case 'high':
      return 'High (15+ incidents)'
    case 'medium':
      return 'Medium (8–14 incidents)'
    case 'low':
      return 'Low (1–7 incidents)'
    case 'none':
      return 'No incidents'
  }
}
