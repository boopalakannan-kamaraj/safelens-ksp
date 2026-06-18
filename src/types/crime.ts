export type CrimeCategory =
  | 'Theft'
  | 'Assault'
  | 'Burglary'
  | 'Cybercrime'
  | 'Fraud'
  | 'Robbery'
  | 'Domestic Violence'
  | 'Drug Offense'
  | 'Murder'
  | 'Kidnapping'

export type CrimeSeverity = 'Low' | 'Medium' | 'High' | 'Critical'

export interface District {
  id: string
  name: string
  lat: number
  lng: number
  population: number
}

export interface CrimeIncident {
  id: string
  districtId: string
  districtName: string
  category: CrimeCategory
  severity: CrimeSeverity
  date: string
  lat: number
  lng: number
  location: string
  description: string
  status: 'Open' | 'Under Investigation' | 'Closed'
  officer: string
  suspectId?: string
  victimId?: string
}

export interface MonthlyTrend {
  month: string
  theft: number
  assault: number
  burglary: number
  cybercrime: number
  fraud: number
  robbery: number
  domesticViolence: number
  drugOffense: number
  murder: number
  kidnapping: number
  total: number
}

export interface NetworkNode {
  id: string
  label: string
  type: 'suspect' | 'victim' | 'location'
  riskScore?: number
  mo?: string
}

export interface NetworkEdge {
  source: string
  target: string
  label: string
  weight: number
}

export interface RiskPrediction {
  districtId: string
  districtName: string
  riskScore: number
  trend: 'rising' | 'stable' | 'declining'
  primaryThreat: CrimeCategory
  confidence: number
  factors: string[]
  predictedIncidents: number
}

export interface DistrictIncidentCount {
  districtId: string
  districtName: string
  count: number
  severity: CrimeSeverity
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export interface DashboardKPIs {
  totalIncidents: number
  openCases: number
  clearanceRate: number
  avgResponseTime: number
  highRiskDistricts: number
  monthlyChange: number
  categoryBreakdown: { category: CrimeCategory; count: number }[]
  recentIncidents: CrimeIncident[]
  districtStats: {
    districtId: string
    districtName: string
    count: number
    severity: CrimeSeverity
  }[]
}
