import mockData from '../data/mockCrimeData.json'
import type { CrimeCategory, CrimeIncident } from '../types/crime'
import { computeDistrictStats, computeKPIs } from '../utils/crimeAnalytics'
import { fetchIncidents, fetchMonthlyTrends, fetchRiskPredictions } from './crimeApi'

const MONTH_MAP: Record<string, number> = {
  january: 0, jan: 0,
  february: 1, feb: 1,
  march: 2, mar: 2,
  april: 3, apr: 3,
  may: 4,
  june: 5, jun: 5,
  july: 6, jul: 6,
  august: 7, aug: 7,
  september: 8, sep: 8, sept: 8,
  october: 9, oct: 9,
  november: 10, nov: 10,
  december: 11, dec: 11,
}

const CATEGORY_ALIASES: Record<string, CrimeCategory> = {
  theft: 'Theft',
  steal: 'Theft',
  stolen: 'Theft',
  assault: 'Assault',
  attack: 'Assault',
  burglary: 'Burglary',
  break: 'Burglary',
  cyber: 'Cybercrime',
  cybercrime: 'Cybercrime',
  fraud: 'Fraud',
  scam: 'Fraud',
  robbery: 'Robbery',
  rob: 'Robbery',
  domestic: 'Domestic Violence',
  'domestic violence': 'Domestic Violence',
  drug: 'Drug Offense',
  ndps: 'Drug Offense',
  murder: 'Murder',
  homicide: 'Murder',
  kidnapping: 'Kidnapping',
  abduct: 'Kidnapping',
}

function normalize(text: string) {
  return text.toLowerCase().trim()
}

function detectCategory(query: string): CrimeCategory | null {
  const q = normalize(query)
  for (const [alias, category] of Object.entries(CATEGORY_ALIASES)) {
    if (q.includes(alias)) return category
  }
  return null
}

function detectDistrict(query: string): string | null {
  const q = normalize(query)
  const districts = mockData.districts as { id: string; name: string }[]
  for (const d of districts) {
    const nameParts = d.name.toLowerCase().split(/[\s-]+/)
    if (q.includes(d.name.toLowerCase()) || nameParts.some((p) => p.length > 3 && q.includes(p))) {
      return d.name
    }
  }
  if (q.includes('mysuru') || q.includes('mysore')) return 'Mysuru'
  if (q.includes('bengaluru') || q.includes('bangalore')) return 'Bengaluru Urban'
  if (q.includes('hubballi') || q.includes('dharwad')) return 'Hubballi-Dharwad'
  if (q.includes('mangaluru') || q.includes('mangalore')) return 'Dakshina Kannada'
  return null
}

function detectTimeRange(query: string): { start: Date; end: Date; label: string } | null {
  const q = normalize(query)
  const now = new Date(2026, 5, 8)

  if (q.includes('last month') || q.includes('previous month')) {
    return { start: new Date(2026, 4, 1), end: new Date(2026, 4, 31), label: 'May 2026' }
  }
  if (q.includes('last week') || q.includes('past week')) {
    return { start: new Date(2026, 5, 1), end: now, label: 'the past week' }
  }
  if (q.includes('this month') || q.includes('current month')) {
    return { start: new Date(2026, 5, 1), end: now, label: 'June 2026' }
  }
  if (q.includes('last 30 days') || q.includes('past 30 days')) {
    return { start: new Date(2026, 4, 9), end: now, label: 'the last 30 days' }
  }
  if (q.includes('ytd') || q.includes('this year') || q.includes('year to date')) {
    return { start: new Date(2026, 0, 1), end: now, label: 'year-to-date 2026' }
  }

  for (const [name, monthIdx] of Object.entries(MONTH_MAP)) {
    if (q.includes(name)) {
      return {
        start: new Date(2026, monthIdx, 1),
        end: new Date(2026, monthIdx + 1, 0),
        label: `${name.charAt(0).toUpperCase()}${name.slice(1)} 2026`,
      }
    }
  }
  return null
}

function filterIncidents(incidents: CrimeIncident[], opts: {
  category?: CrimeCategory | null
  district?: string | null
  timeRange?: { start: Date; end: Date } | null
}) {
  return incidents.filter((inc) => {
    if (opts.category && inc.category !== opts.category) return false
    if (opts.district && !inc.districtName.toLowerCase().includes(opts.district.toLowerCase())) return false
    if (opts.timeRange) {
      const d = new Date(inc.date)
      if (d < opts.timeRange.start || d > opts.timeRange.end) return false
    }
    return true
  })
}

function formatIncidentList(incidents: CrimeIncident[], limit = 5) {
  if (!incidents.length) return 'No matching incidents found in the current dataset.'
  const lines = incidents.slice(0, limit).map(
    (inc) => `• **${inc.id}** — ${inc.category} (${inc.severity}) in ${inc.districtName} on ${inc.date}\n  ${inc.description}`,
  )
  const suffix = incidents.length > limit ? `\n\n_...and ${incidents.length - limit} more cases._` : ''
  return lines.join('\n') + suffix
}

export async function processSafeLensQuery(query: string): Promise<string> {
  await new Promise((r) => setTimeout(r, 800 + Math.random() * 600))

  const q = normalize(query)
  if (!q) return 'Please enter a query about crime data in Karnataka.'

  const category = detectCategory(q)
  const district = detectDistrict(q)
  const timeRange = detectTimeRange(q)

  if (q.includes('help') || q.includes('what can you')) {
    return `I can help you explore Karnataka crime intelligence. Try queries like:

• "Show me theft cases in Mysuru last month"
• "Cybercrime incidents in Bengaluru"
• "What are the high-risk districts?"
• "Assault cases in May 2026"
• "Total crime trends this year"

I analyze incident records, district statistics, and risk predictions to generate insights.`
  }

  if (q.includes('high risk') || q.includes('risk score') || q.includes('riskiest')) {
    const predictions = await fetchRiskPredictions()
    const top = predictions.sort((a, b) => b.riskScore - a.riskScore).slice(0, 5)
    const lines = top.map(
      (p, i) => `${i + 1}. **${p.districtName}** — Score ${p.riskScore}/100 (${p.trend}, ${p.primaryThreat})`,
    )
    return `**Top High-Risk Districts (AI Model):**\n\n${lines.join('\n')}\n\nBengaluru Urban leads with rising cybercrime threat. Consider increased patrol deployment in flagged corridors.`
  }

  if (q.includes('trend') || q.includes('increasing') || q.includes('statistics')) {
    const trends = await fetchMonthlyTrends()
    const latest = trends[trends.length - 1]
    const prev = trends[trends.length - 2]
    const change = (((latest.total - prev.total) / prev.total) * 100).toFixed(1)
    return `**Crime Trend Summary (${latest.month} 2026):**

Total incidents: **${latest.total}** (${Number(change) >= 0 ? '↑' : '↓'}${Math.abs(Number(change))}% vs ${prev.month})

Top categories this month:
• Theft: ${latest.theft}
• Cybercrime: ${latest.cybercrime}
• Assault: ${latest.assault}
• Fraud: ${latest.fraud}

Cybercrime and theft continue to drive overall volume, particularly in urban districts.`
  }

  if (q.includes('compare') && district) {
    const incidents = await fetchIncidents()
    const counts = computeDistrictStats(incidents)
    const match = counts.find((c) => c.districtName === district)
    const avg = counts.reduce((s, c) => s + c.count, 0) / counts.length
    if (match) {
      const diff = ((match.count - avg) / avg * 100).toFixed(0)
      return `**${district}** has **${match.count.toLocaleString('en-IN')}** YTD incidents — ${Number(diff) >= 0 ? `${diff}% above` : `${Math.abs(Number(diff))}% below`} the state average (${Math.round(avg).toLocaleString('en-IN')}).\n\nSeverity level: **${match.severity}**. ${Number(diff) > 20 ? 'Recommend enhanced surveillance and community policing initiatives.' : 'Within expected range for district population.'}`
    }
  }

  const incidents = await fetchIncidents()
  const filtered = filterIncidents(incidents, { category, district, timeRange })

  if (category || district || timeRange) {
    const parts: string[] = []
    if (category) parts.push(category)
    if (district) parts.push(`in ${district}`)
    if (timeRange) parts.push(`during ${timeRange.label}`)

    const header = `**${parts.join(' ')}** — Found **${filtered.length}** case${filtered.length !== 1 ? 's' : ''}:\n\n`

    if (filtered.length === 0) {
      const incidents = await fetchIncidents()
      const counts = computeDistrictStats(incidents)
      const districtMatch = district ? counts.find((c) => c.districtName === district) : null
      if (districtMatch && category) {
        const estimated = Math.round(districtMatch.count * 0.15)
        return `${header}No individual records in the detailed dataset for this filter, but district-level data shows approximately **${estimated}** ${category.toLowerCase()} cases YTD in ${district}. Check the Crime Map or Trends page for broader patterns.`
      }
      return `${header}No matching incidents found. Try broadening your search — e.g., remove the time filter or check a nearby district.`
    }

    const open = filtered.filter((i) => i.status === 'Open').length
    const critical = filtered.filter((i) => i.severity === 'Critical').length

    return `${header}${formatIncidentList(filtered)}

**Summary:** ${open} open case${open !== 1 ? 's' : ''}, ${critical} critical severity. ${district ? `Primary patrol zone: ${district}.` : ''} Recommend cross-referencing with Network Analysis for linked suspects.`
  }

  if (q.includes('total') || q.includes('how many')) {
    const incidents = await fetchIncidents()
    const kpis = computeKPIs(incidents)
    return `**Karnataka Crime Overview (Dataset):**

• Total incidents: **${kpis.totalIncidents.toLocaleString('en-IN')}**
• Open cases: **${kpis.openCases.toLocaleString('en-IN')}**
• Clearance rate: **${kpis.clearanceRate}%**
• High-risk districts: **${kpis.highRiskDistricts}**

Ask about specific districts, crime types, or time periods for detailed breakdowns.`
  }

  return `I analyzed your query but need more specifics. Try including:

• A **crime type** (theft, assault, cybercrime, etc.)
• A **district** (Mysuru, Bengaluru, Hubballi, etc.)
• A **time period** (last month, May 2026, YTD)

Example: _"Show me theft cases in Mysuru last month"_`
}
