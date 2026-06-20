import karnatakaBoundaries from '../data/karnatakaDistrictBoundaries.json'
import type { District } from '../types/crime'

/** Karnataka district boundaries (2011 census). Source: udit-001/india-maps-data */

export type DistrictBoundaryCollection = typeof karnatakaBoundaries

export const GEOJSON_DISTRICT_PROPERTY = 'district' as const

/** App district name → GeoJSON `district` property (2011 boundaries, pre-Vijayanagara split). */
export const APP_DISTRICT_TO_GEOJSON: Record<string, string> = {
  Bagalkot: 'Bagalkote',
  Chamarajanagar: 'Chamarajanagara',
  Chikkaballapur: 'Chikkaballapura',
  Davangere: 'Davanagere',
  'Hubballi-Dharwad': 'Dharwad',
}

export type DistrictBoundaryAuditEntry = {
  appName: string
  geoJsonName: string | null
  matched: boolean
  reason: string
}

export function resolveGeoJsonDistrictName(appDistrictName: string): string | null {
  if (appDistrictName === 'Vijayanagara') return null
  return APP_DISTRICT_TO_GEOJSON[appDistrictName] ?? appDistrictName
}

export function getDistrictBoundaries(): DistrictBoundaryCollection {
  return karnatakaBoundaries
}

export function getGeoJsonDistrictNames(): string[] {
  return getDistrictBoundaries().features.map(
    (feature: { properties?: Record<string, unknown> }) =>
      feature.properties?.[GEOJSON_DISTRICT_PROPERTY] as string,
  )
}

export function buildGeoJsonToDistrictMap(districts: District[]): Map<string, District> {
  const map = new Map<string, District>()
  for (const district of districts) {
    const geoName = resolveGeoJsonDistrictName(district.name)
    if (geoName) map.set(geoName, district)
  }
  return map
}

export function auditDistrictBoundaryCoverage(districts: District[]): {
  matched: number
  total: number
  entries: DistrictBoundaryAuditEntry[]
  unmatchedGeoJson: string[]
} {
  const geoNames = new Set(getGeoJsonDistrictNames())

  const entries: DistrictBoundaryAuditEntry[] = districts.map((district) => {
    const geoJsonName = resolveGeoJsonDistrictName(district.name)

    if (!geoJsonName) {
      return {
        appName: district.name,
        geoJsonName: null,
        matched: false,
        reason: 'District created after 2011 census boundaries (split from Ballari in 2021)',
      }
    }

    if (geoNames.has(geoJsonName)) {
      const aliased = APP_DISTRICT_TO_GEOJSON[district.name]
      return {
        appName: district.name,
        geoJsonName,
        matched: true,
        reason: aliased
          ? `Spelling alias (${district.name} → ${geoJsonName})`
          : 'Exact name match',
      }
    }

    return {
      appName: district.name,
      geoJsonName,
      matched: false,
      reason: 'Expected polygon name not found in GeoJSON',
    }
  })

  const matchedGeoNames = new Set(
    entries.filter((entry) => entry.matched).map((entry) => entry.geoJsonName!),
  )
  const unmatchedGeoJson = [...geoNames].filter((name) => !matchedGeoNames.has(name))

  return {
    matched: entries.filter((entry) => entry.matched).length,
    total: districts.length,
    entries,
    unmatchedGeoJson,
  }
}
