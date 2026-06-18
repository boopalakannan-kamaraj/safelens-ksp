export type InvestigationContext = {
  category?: string
  district?: string
  incidentId?: string
  lat?: number
  lng?: number
}

export const CATEGORY_TO_TREND_KEY: Record<string, string> = {
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
