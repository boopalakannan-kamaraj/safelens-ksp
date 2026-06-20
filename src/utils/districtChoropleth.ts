import L from 'leaflet'
import type { District } from '../types/crime'
import {
  GEOJSON_DISTRICT_PROPERTY,
  buildGeoJsonToDistrictMap,
  getDistrictBoundaries,
  resolveGeoJsonDistrictName,
} from './districtBoundaries'

type DistrictLayerOptions = {
  filterDistrict?: (district: District) => boolean
  styleForDistrict: (district: District) => L.PathOptions
  popupForDistrict: (district: District) => string
  onDistrictClick: (district: District) => void
}

export function renderDistrictGeoJsonLayer(
  layerGroup: L.LayerGroup,
  districts: District[],
  options: DistrictLayerOptions,
) {
  layerGroup.clearLayers()
  const geoToDistrict = buildGeoJsonToDistrictMap(districts)
  const boundaries = getDistrictBoundaries()

  L.geoJSON(boundaries as GeoJSON.GeoJsonObject, {
    filter: (feature) => {
      const geoName = feature?.properties?.[GEOJSON_DISTRICT_PROPERTY] as string | undefined
      if (!geoName) return false
      const district = geoToDistrict.get(geoName)
      if (!district) return false
      return options.filterDistrict ? options.filterDistrict(district) : true
    },
    style: (feature) => {
      const geoName = feature!.properties![GEOJSON_DISTRICT_PROPERTY] as string
      return options.styleForDistrict(geoToDistrict.get(geoName)!)
    },
    onEachFeature: (feature, layer) => {
      const geoName = feature.properties![GEOJSON_DISTRICT_PROPERTY] as string
      const district = geoToDistrict.get(geoName)!
      layer.bindPopup(options.popupForDistrict(district))
      layer.on('click', () => options.onDistrictClick(district))
    },
  }).addTo(layerGroup)
}

export function getDistrictsWithoutBoundaries(districts: District[]): District[] {
  return districts.filter((district) => resolveGeoJsonDistrictName(district.name) === null)
}

/** Fallback circle for districts missing from the 2011 boundary dataset (e.g. Vijayanagara). */
export const BOUNDARY_FALLBACK_RADIUS = 18000

function truncateDistrictName(name: string, max = 16): string {
  return name.length > max ? `${name.slice(0, max - 1)}…` : name
}

export function createDistrictNameLabelIcon(name: string) {
  const label = truncateDistrictName(name)
  return L.divIcon({
    className: 'safelens-district-label-marker',
    html: `<span class="safelens-district-label">${label}</span>`,
    iconSize: [140, 22],
    iconAnchor: [70, -26],
  })
}

export function renderDistrictNameLabels(
  layerGroup: L.LayerGroup,
  districts: District[],
  filterDistrict?: (district: District) => boolean,
) {
  layerGroup.clearLayers()

  for (const district of districts) {
    if (filterDistrict && !filterDistrict(district)) continue

    L.marker([district.lat, district.lng], {
      icon: createDistrictNameLabelIcon(district.name),
      interactive: false,
      keyboard: false,
      zIndexOffset: 850,
    }).addTo(layerGroup)
  }
}

export function renderDistrictFallbackCircle(
  layerGroup: L.LayerGroup,
  district: District,
  style: L.PathOptions,
  popupHtml: string,
  onDistrictClick: (district: District) => void,
) {
  L.circle([district.lat, district.lng], {
    radius: BOUNDARY_FALLBACK_RADIUS,
    ...style,
  })
    .bindPopup(popupHtml)
    .on('click', () => onDistrictClick(district))
    .addTo(layerGroup)
}
