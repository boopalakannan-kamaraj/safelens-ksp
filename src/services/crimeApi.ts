import mockData from '../data/mockCrimeData.json'
import type {
  CrimeCategory,
  CrimeIncident,
  CrimeSeverity,
  DashboardKPIs,
  District,
  DistrictIncidentCount,
  MonthlyTrend,
  NetworkEdge,
  NetworkNode,
  RiskPrediction,
} from '../types/crime'
import {
  computeKPIs,
  computeMonthlyTrends,
  computeRiskPredictions,
} from '../utils/crimeAnalytics'
import {
  fetchAll,
  fetchByDistrict,
  fetchIncidents as fetchIncidentsPage,
  fetchStats,
} from './api.js'

export { fetchStats, fetchByDistrict, fetchAll }

type ApiIncidentRow = {
  incident_id: string
  district: string
  category: CrimeCategory
  severity: CrimeSeverity
  status: CrimeIncident['status']
  incident_date: string
  location: string
  description: string
  officer: string
  latitude: number | string
  longitude: number | string
}

export type StatsResponse = {
  total: number
  byCategory: Record<string, number>
  byDistrict: Record<string, number>
  bySeverity: Record<string, number>
  byStatus: Record<string, number>
}

const districtNameToId = new Map(
  (mockData.districts as District[]).map((d) => [d.name, d.id]),
)

export function mapApiIncident(row: ApiIncidentRow): CrimeIncident {
  const districtName = row.district
  return {
    id: row.incident_id,
    districtId: districtNameToId.get(districtName) ?? districtName.replace(/\s+/g, '-').slice(0, 8).toUpperCase(),
    districtName,
    category: row.category,
    severity: row.severity,
    date: row.incident_date,
    lat: Number(row.latitude),
    lng: Number(row.longitude),
    location: row.location,
    description: row.description,
    status: row.status,
    officer: row.officer,
  }
}

function mapIncidents(rows: ApiIncidentRow[]): CrimeIncident[] {
  return rows.map(mapApiIncident)
}

export function statsToCategoryBreakdown(stats: StatsResponse) {
  return Object.entries(stats.byCategory)
    .map(([category, count]) => ({ category: category as CrimeCategory, count }))
    .sort((a, b) => b.count - a.count)
}

export function statsToDistrictStats(stats: StatsResponse) {
  return Object.entries(stats.byDistrict)
    .map(([districtName, count]) => ({
      districtId: districtNameToId.get(districtName) ?? districtName,
      districtName,
      count,
      severity: (count >= 50 ? 'High' : count >= 20 ? 'Medium' : 'Low') as CrimeSeverity,
    }))
    .sort((a, b) => b.count - a.count)
}

export async function fetchIncidents(): Promise<CrimeIncident[]> {
  const rows = (await fetchAll()) as ApiIncidentRow[]
  return mapIncidents(rows)
}

export async function fetchIncidentsPaged(page: number, limit: number) {
  const result = await fetchIncidentsPage(page, limit)
  return {
    data: mapIncidents(result.data as ApiIncidentRow[]),
    pagination: result.pagination,
  }
}

export async function fetchDistrictIncidents(district: string): Promise<CrimeIncident[]> {
  const result = await fetchByDistrict(district)
  return mapIncidents(result.data as ApiIncidentRow[])
}

export async function fetchDistricts(): Promise<District[]> {
  return mockData.districts as District[]
}

export async function fetchMonthlyTrends(): Promise<MonthlyTrend[]> {
  const incidents = await fetchIncidents()
  return computeMonthlyTrends(incidents)
}

export async function fetchNetworkData(): Promise<{ nodes: NetworkNode[]; edges: NetworkEdge[] }> {
  return {
    nodes: mockData.networkNodes as NetworkNode[],
    edges: mockData.networkEdges as NetworkEdge[],
  }
}

export async function fetchRiskPredictions(): Promise<RiskPrediction[]> {
  const incidents = await fetchIncidents()
  return computeRiskPredictions(incidents)
}

export async function fetchDistrictIncidentCounts(): Promise<DistrictIncidentCount[]> {
  const stats = (await fetchStats()) as StatsResponse
  return statsToDistrictStats(stats)
}

export async function fetchDashboardKPIs(): Promise<DashboardKPIs> {
  const [stats, incidents] = await Promise.all([
    fetchStats() as Promise<StatsResponse>,
    fetchIncidents(),
  ])
  const derived = computeKPIs(incidents)
  const openCases =
    (stats.byStatus.Open ?? 0) + (stats.byStatus['Under Investigation'] ?? 0)
  const closed = stats.byStatus.Closed ?? 0
  const clearanceRate = stats.total ? +((closed / stats.total) * 100).toFixed(1) : 0
  const highRiskDistricts = Object.values(stats.byDistrict).filter((count) => count >= 20).length

  return {
    totalIncidents: stats.total,
    openCases,
    clearanceRate,
    highRiskDistricts,
    monthlyChange: derived.monthlyChange,
    avgResponseTime: derived.avgResponseTime,
    categoryBreakdown: statsToCategoryBreakdown(stats),
    recentIncidents: [...incidents]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 8),
    districtStats: statsToDistrictStats(stats),
  }
}
