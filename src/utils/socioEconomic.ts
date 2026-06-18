import type { District } from '../types/crime'

export interface SocioEconomicProfile {
  districtId: string
  districtName: string
  populationDensity: number
  urbanizationLevel: number
  areaKm2: number
}

/** Deterministic mock socio-economic profiles derived from district data */
export function buildSocioEconomicProfile(district: District): SocioEconomicProfile {
  const hash = district.id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)
  const areaKm2 = 1800 + (hash % 7200)
  const populationDensity = Math.round(district.population / areaKm2)
  const urbanBoost = district.population > 2_000_000 ? 18 : district.population > 900_000 ? 10 : 0
  const urbanizationLevel = Math.min(96, 22 + (hash % 58) + urbanBoost)

  return {
    districtId: district.id,
    districtName: district.name,
    populationDensity,
    urbanizationLevel,
    areaKm2,
  }
}

export type CorrelationZone = 'priority' | 'elevated' | 'standard'

export function getCorrelationZone(
  incidentCount: number,
  profile: SocioEconomicProfile,
): { zone: CorrelationZone; label: string } {
  const highCrime = incidentCount >= 15
  const highDensity = profile.populationDensity >= 350
  const highUrban = profile.urbanizationLevel >= 65

  if (highCrime && highDensity && highUrban) {
    return {
      zone: 'priority',
      label: 'High crime + High density = Resource Priority Zone',
    }
  }
  if (highCrime && (highDensity || highUrban)) {
    return {
      zone: 'elevated',
      label: 'Elevated crime–density correlation',
    }
  }
  return {
    zone: 'standard',
    label: 'Standard monitoring zone',
  }
}

/** Map urbanization 0–100 to overlay color (subtle purple → amber) */
export function urbanizationColor(level: number): string {
  if (level >= 75) return '#9b59b6'
  if (level >= 50) return '#4a90d9'
  if (level >= 30) return '#27ae60'
  return '#2a4570'
}

/** Density → circle radius in metres for map overlay */
export function densityToRadius(density: number): number {
  return Math.min(48000, Math.max(12000, density * 35))
}
