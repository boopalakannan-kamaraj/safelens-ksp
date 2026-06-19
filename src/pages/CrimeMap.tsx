import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import L from 'leaflet'
import { ChevronDown, ChevronUp, PanelRightClose, PanelRightOpen } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import NativeSelect from '../components/ui/NativeSelect'
import CrimeMapIncidentSidebar from '../components/crime/CrimeMapIncidentSidebar'
import CrimeMapIncidentCard from '../components/crime/CrimeMapIncidentCard'
import {
  btnSegment,
  btnSegmentActive,
  btnSegmentGroup,
  btnSecondary,
  formCheckLabel,
  formCheckbox,
  formToolbar,
} from '../components/ui/formClasses'
import { ErrorState } from '../components/ui/DataState'
import { fetchDistrictIncidents, fetchDistricts, fetchIncidents, fetchNetworkData, fetchRiskPredictions } from '../services/crimeApi'
import type { CrimeIncident, District, NetworkNode } from '../types/crime'
import type { InvestigationContext } from '../types/navigation'
import { getHeatmapTier, getHeatmapTierLabel } from '../utils/crimeAnalytics'
import {
  buildSocioEconomicProfile,
  densityToRadius,
  getCorrelationZone,
  urbanizationColor,
} from '../utils/socioEconomic'
import { severityColor } from '../utils/helpers'
import { renderCrimeCategoryIconMarkup } from '../utils/crimeCategoryIcons'

const KARNATAKA_CENTER: L.LatLngExpression = [15.3173, 75.7139]

const HEATMAP_COLORS = {
  high: '#e74c3c',
  medium: '#f39c12',
  low: '#4a90d9',
  none: '#2a4570',
}

const HEATMAP_RADIUS = 32000

function createDistrictIcon(count: number) {
  const tier = getHeatmapTier(count)
  const color = tier === 'none' ? HEATMAP_COLORS.low : HEATMAP_COLORS[tier]
  const size = Math.min(44, 24 + count * 3)

  return L.divIcon({
    className: '',
    html: `<div style="
      width:${size}px;height:${size}px;
      background:${color}50;
      border:2px solid ${color};
      border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      font-size:11px;font-weight:600;color:#fff;
      box-shadow:0 0 12px ${color}80;
    ">${count}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

function createRedZonePulseIcon() {
  return L.divIcon({
    className: 'red-zone-marker',
    html: `<div class="red-zone-pulse"><span class="red-zone-pulse-ring"></span><span class="red-zone-pulse-ring red-zone-pulse-ring--delay"></span></div>`,
    iconSize: [80, 80],
    iconAnchor: [40, 40],
  })
}

function createPriorityZonePulseIcon() {
  return L.divIcon({
    className: 'priority-zone-marker',
    html: `<div class="priority-zone-pulse">
      <span class="priority-zone-pulse-ring"></span>
      <span class="priority-zone-pulse-ring priority-zone-pulse-ring--delay"></span>
      <span class="priority-zone-badge" aria-hidden="true">!</span>
    </div>`,
    iconSize: [72, 72],
    iconAnchor: [36, 36],
  })
}

function createIncidentIcon(severity: CrimeIncident['severity'], highlighted = false) {
  const color = severityColor(severity)
  const size = highlighted ? 18 : 10
  const anchor = size / 2
  return L.divIcon({
    className: highlighted ? 'highlighted-incident-marker' : '',
    html: highlighted
      ? `<div style="
          width:${size}px;height:${size}px;
          background:${color};
          border:3px solid #fff;
          border-radius:50%;
          box-shadow:0 0 14px ${color}, 0 0 24px ${color}80;
        "></div>`
      : `<div style="
          width:${size}px;height:${size}px;
          background:${color};
          border:2px solid #fff;
          border-radius:50%;
          box-shadow:0 0 6px ${color};
        "></div>`,
    iconSize: [size, size],
    iconAnchor: [anchor, anchor],
  })
}

function createDrilledIncidentIcon(
  category: CrimeIncident['category'],
  severity: CrimeIncident['severity'],
  highlighted = false,
) {
  const color = severityColor(severity)
  const size = highlighted ? 38 : 32
  const iconSize = highlighted ? 18 : 16
  const border = highlighted ? 3 : 2
  const iconMarkup = renderCrimeCategoryIconMarkup(category, {
    size: iconSize,
    color: '#ffffff',
    strokeWidth: 2.25,
  })

  return L.divIcon({
    className: highlighted ? 'highlighted-incident-marker' : '',
    html: `<div style="
      width:${size}px;height:${size}px;
      background:${color};
      border:${border}px solid #fff;
      border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 0 ${highlighted ? 14 : 6}px ${color}${highlighted ? ', 0 0 24px ' + color + '80' : ''};
    ">${iconMarkup}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

export default function CrimeMap() {
  const location = useLocation()
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<L.Map | null>(null)
  const pendingFocusIncidentRef = useRef<CrimeIncident | null>(null)
  const processedNavigationKeyRef = useRef<string | null>(null)
  const markersLayer = useRef<L.LayerGroup | null>(null)
  const heatmapLayer = useRef<L.LayerGroup | null>(null)
  const pulseLayer = useRef<L.LayerGroup | null>(null)
  const socioLayer = useRef<L.LayerGroup | null>(null)

  const [districts, setDistricts] = useState<District[]>([])
  const [incidents, setIncidents] = useState<CrimeIncident[]>([])
  const [viewMode, setViewMode] = useState<'districts' | 'incidents'>('districts')
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [showHeatmap, setShowHeatmap] = useState(true)
  const [showSocioEconomic, setShowSocioEconomic] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [investigationContext, setInvestigationContext] = useState<InvestigationContext | null>(null)
  const [highlightedIncidentId, setHighlightedIncidentId] = useState<string | null>(null)
  const [drilledDistrictId, setDrilledDistrictId] = useState<string | null>(null)
  const [selectedIncident, setSelectedIncident] = useState<CrimeIncident | null>(null)
  const [districtRiskScores, setDistrictRiskScores] = useState<Map<string, number>>(new Map())
  const [networkNodes, setNetworkNodes] = useState<NetworkNode[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [legendExpanded, setLegendExpanded] = useState(false)
  const [statsExpanded, setStatsExpanded] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const districtFilter = searchParams.get('district')

  const drilledDistrict = districts.find((d) => d.id === drilledDistrictId) ?? null

  const openIncidentDetail = useCallback((incident: CrimeIncident) => {
    setSelectedIncident(incident)
  }, [])

  const selectIncidentOnMap = useCallback(
    (incident: CrimeIncident) => {
      setHighlightedIncidentId(incident.id)
      openIncidentDetail(incident)
      mapInstance.current?.flyTo([incident.lat, incident.lng], 15, { duration: 0.8 })
    },
    [openIncidentDetail],
  )

  const closeIncidentDetail = useCallback(() => {
    setSelectedIncident(null)
  }, [])

  const drillIntoDistrict = useCallback((district: District) => {
    setSelectedIncident(null)
    setDrilledDistrictId(district.id)
  }, [])

  const exitDistrictDrill = useCallback(() => {
    pendingFocusIncidentRef.current = null
    setDrilledDistrictId(null)
    setSelectedIncident(null)
    mapInstance.current?.flyTo(KARNATAKA_CENTER, 7, { duration: 1 })
  }, [])

  const focusIncidentOnMap = useCallback(
    (incident: CrimeIncident) => {
      setHighlightedIncidentId(incident.id)

      if (drilledDistrictId === incident.districtId) {
        selectIncidentOnMap(incident)
        return
      }

      const district = districts.find((d) => d.id === incident.districtId)
      if (district) {
        pendingFocusIncidentRef.current = incident
        drillIntoDistrict(district)
        return
      }

      selectIncidentOnMap(incident)
    },
    [drilledDistrictId, districts, drillIntoDistrict, selectIncidentOnMap],
  )

  useEffect(() => {
    if (!mapInstance.current) return
    const map = mapInstance.current
    const timer = window.setTimeout(() => {
      map.invalidateSize()
    }, 200)
    return () => window.clearTimeout(timer)
  }, [sidebarOpen])

  useEffect(() => {
    const state = location.state as InvestigationContext | undefined
    if (!state?.category && !state?.district && !state?.incidentId) return

    setInvestigationContext(state)
    if (state.category) setSelectedCategory(state.category)
    if (state.district) {
      setSearchParams({ district: state.district })
      setViewMode('incidents')
    }
    if (state.incidentId) {
      setHighlightedIncidentId(state.incidentId)
      setViewMode('incidents')
    }
  }, [location.key, location.state, setSearchParams])

  useEffect(() => {
    if (loading || !incidents.length) return

    const state = location.state as InvestigationContext | undefined
    if (!state?.incidentId) return
    if (processedNavigationKeyRef.current === location.key) return
    if (state.district && districtFilter !== state.district) return

    const incident = incidents.find((i) => i.id === state.incidentId)
    if (!incident) return

    processedNavigationKeyRef.current = location.key
    setSidebarOpen(true)
    focusIncidentOnMap(incident)
  }, [loading, incidents, districtFilter, location.key, location.state, focusIncidentOnMap])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    const loadIncidents = districtFilter ? fetchDistrictIncidents(districtFilter) : fetchIncidents()

    Promise.all([fetchDistricts(), loadIncidents, fetchRiskPredictions(), fetchNetworkData()])
      .then(([d, i, predictions, { nodes }]) => {
        if (cancelled) return
        setDistricts(d)
        setIncidents(i)
        setDistrictRiskScores(new Map(predictions.map((p) => [p.districtId, p.riskScore])))
        setNetworkNodes(nodes)
      })
      .catch((err: Error) => {
        if (cancelled) return
        setError(err.message || 'Unable to load map data')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [districtFilter, reloadKey])

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return

    mapInstance.current = L.map(mapRef.current, {
      center: KARNATAKA_CENTER,
      zoom: 7,
      zoomControl: true,
    })

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      maxZoom: 18,
    }).addTo(mapInstance.current)

    heatmapLayer.current = L.layerGroup().addTo(mapInstance.current)
    pulseLayer.current = L.layerGroup().addTo(mapInstance.current)
    socioLayer.current = L.layerGroup().addTo(mapInstance.current)
    markersLayer.current = L.layerGroup().addTo(mapInstance.current)

    return () => {
      mapInstance.current?.remove()
      mapInstance.current = null
    }
  }, [])

  useEffect(() => {
    if (!heatmapLayer.current || !markersLayer.current || !pulseLayer.current || !socioLayer.current || loading) return

    heatmapLayer.current.clearLayers()
    pulseLayer.current.clearLayers()
    socioLayer.current.clearLayers()
    markersLayer.current.clearLayers()

    const filtered = incidents.filter((inc) => {
      if (selectedCategory !== 'All' && inc.category !== selectedCategory) return false
      if (districtFilter && inc.districtName !== districtFilter) return false
      return true
    })

    const incidentCounts = new Map<string, number>()
    for (const inc of filtered) {
      incidentCounts.set(inc.districtId, (incidentCounts.get(inc.districtId) ?? 0) + 1)
    }

    if (showHeatmap) {
      for (const district of districts) {
        const count = incidentCounts.get(district.id) ?? 0
        if (count === 0 && selectedCategory !== 'All') continue

        const tier = getHeatmapTier(count)
        if (tier === 'none') continue

        const color = HEATMAP_COLORS[tier]

        const circle = L.circle([district.lat, district.lng], {
          radius: HEATMAP_RADIUS,
          fillColor: color,
          fillOpacity: 0.42,
          color,
          weight: 2,
          opacity: 0.75,
          interactive: true,
        }).bindPopup(
          `<div style="min-width:180px">
            <strong>${district.name}</strong><br/>
            <span style="color:${color};font-weight:600">${getHeatmapTierLabel(tier)}</span><br/>
            <span style="color:#8ba4c4">Mapped incidents: ${count}</span>
          </div>`,
        )

        circle.addTo(heatmapLayer.current!)

        if (tier === 'high') {
          L.marker([district.lat, district.lng], {
            icon: createRedZonePulseIcon(),
            interactive: false,
            zIndexOffset: 500,
          }).addTo(pulseLayer.current!)
        }
      }
    }

    if (showSocioEconomic) {
      for (const district of districts) {
        const count = incidentCounts.get(district.id) ?? 0
        const profile = buildSocioEconomicProfile(district)
        const correlation = getCorrelationZone(count, profile)
        const color = urbanizationColor(profile.urbanizationLevel)
        const radius = densityToRadius(profile.populationDensity)
        const opacity = 0.12 + (profile.urbanizationLevel / 100) * 0.22
        const isPriorityZone = correlation.zone === 'priority'

        L.circle([district.lat, district.lng], {
          radius,
          fillColor: color,
          fillOpacity: isPriorityZone ? Math.min(0.38, opacity + 0.12) : opacity,
          color: isPriorityZone ? '#e74c3c' : color,
          weight: isPriorityZone ? 3 : 1.5,
          opacity: isPriorityZone ? 0.9 : 0.45,
          interactive: true,
        })
          .bindPopup(
            `<div style="min-width:200px">
              <strong>${district.name}</strong><br/>
              <span style="color:#8ba4c4">Population density: ${profile.populationDensity.toLocaleString('en-IN')}/km²</span><br/>
              <span style="color:#8ba4c4">Urbanization: ${profile.urbanizationLevel}%</span><br/>
              <span style="color:#8ba4c4">Incidents mapped: ${count}</span><br/>
              <span style="color:${correlation.zone === 'priority' ? '#e74c3c' : correlation.zone === 'elevated' ? '#f39c12' : '#4a90d9'};font-weight:600;margin-top:6px;display:inline-block">${correlation.label}</span>
            </div>`,
          )
          .addTo(socioLayer.current!)

        if (isPriorityZone) {
          L.marker([district.lat, district.lng], {
            icon: createPriorityZonePulseIcon(),
            interactive: false,
            zIndexOffset: 600,
          }).addTo(socioLayer.current!)
        }
      }
    }

    if (viewMode === 'districts' && !drilledDistrictId) {
      for (const district of districts) {
        const count = incidentCounts.get(district.id) ?? 0
        if (count === 0 && selectedCategory !== 'All') continue

        const marker = L.marker([district.lat, district.lng], {
          icon: createDistrictIcon(count),
          zIndexOffset: 1000,
        }).bindPopup(
          `<div style="min-width:160px">
              <strong>${district.name}</strong><br/>
              <span style="color:#8ba4c4">Mapped Incidents: ${count}</span><br/>
              <span style="color:#8ba4c4">Population: ${district.population.toLocaleString('en-IN')}</span>
            </div>`,
        )

        marker.on('click', () => {
          drillIntoDistrict(district)
        })

        marker.addTo(markersLayer.current)
      }
    }

    const showIncidentMarkers = viewMode === 'incidents' || drilledDistrictId != null
    if (showIncidentMarkers) {
      const incidentsToPlot = drilledDistrictId
        ? filtered.filter((inc) => inc.districtId === drilledDistrictId)
        : filtered

      for (const inc of incidentsToPlot) {
        const highlighted = highlightedIncidentId === inc.id
        const marker = L.marker([inc.lat, inc.lng], {
          icon: drilledDistrictId
            ? createDrilledIncidentIcon(inc.category, inc.severity, highlighted)
            : createIncidentIcon(inc.severity, highlighted),
          zIndexOffset: highlighted ? 2000 : 1000,
        })

        marker.on('click', () => {
          selectIncidentOnMap(inc)
        })

        if (drilledDistrictId) {
          marker.bindTooltip(
            `<div style="min-width:180px">
              <strong style="color:#e8edf4">${inc.id}</strong><br/>
              <span style="color:#4a90d9">${inc.category}</span>
              <span style="color:#8ba4c4"> · ${inc.severity}</span>
            </div>`,
            {
              direction: 'top',
              offset: [0, -18],
              opacity: 1,
              className: 'safelens-map-tooltip',
            },
          )
        }

        marker.addTo(markersLayer.current!)
      }
    }
  }, [
    districts,
    incidents,
    viewMode,
    selectedCategory,
    showHeatmap,
    showSocioEconomic,
    loading,
    districtFilter,
    highlightedIncidentId,
    drilledDistrictId,
    drillIntoDistrict,
    selectIncidentOnMap,
  ])

  useEffect(() => {
    if (!mapInstance.current || loading || !drilledDistrictId) return

    const district = districts.find((d) => d.id === drilledDistrictId)
    if (!district) return

    const pendingIncident = pendingFocusIncidentRef.current
    if (pendingIncident?.districtId === drilledDistrictId) {
      pendingFocusIncidentRef.current = null
      mapInstance.current.flyTo([pendingIncident.lat, pendingIncident.lng], 15, { duration: 1 })
      selectIncidentOnMap(pendingIncident)
      return
    }

    const districtIncidents = incidents.filter((inc) => {
      if (inc.districtId !== drilledDistrictId) return false
      if (selectedCategory !== 'All' && inc.category !== selectedCategory) return false
      if (districtFilter && inc.districtName !== districtFilter) return false
      return true
    })

    if (districtIncidents.length > 0) {
      const bounds = L.latLngBounds(
        districtIncidents.map((inc) => [inc.lat, inc.lng] as L.LatLngExpression),
      )
      mapInstance.current.flyToBounds(bounds, { padding: [60, 60], maxZoom: 13, duration: 1 })
      return
    }

    mapInstance.current.flyTo([district.lat, district.lng], 11, { duration: 1 })
  }, [drilledDistrictId, districts, incidents, selectedCategory, districtFilter, loading, selectIncidentOnMap])

  useEffect(() => {
    if (!mapInstance.current || loading) return

    const state = investigationContext
    if (state?.lat != null && state?.lng != null) {
      mapInstance.current.flyTo([state.lat, state.lng], 14, { duration: 1 })
      return
    }

    if (!districts.length) return

    const targetDistrict = districtFilter ?? state?.district
    if (!targetDistrict) return

    const district = districts.find((d) => d.name === targetDistrict)
    if (!district) return

    mapInstance.current.flyTo([district.lat, district.lng], 11, { duration: 1 })
  }, [districtFilter, investigationContext, districts, loading])

  const categories = ['All', ...new Set(incidents.map((i) => i.category))]

  const sidebarIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      if (selectedCategory !== 'All' && inc.category !== selectedCategory) return false
      return true
    })
  }, [incidents, selectedCategory])

  const cardIncidents = useMemo(() => {
    if (!selectedIncident) return []
    return sidebarIncidents.filter((inc) => inc.districtId === selectedIncident.districtId)
  }, [sidebarIncidents, selectedIncident])

  if (error) {
    return <ErrorState message={error} onRetry={() => setReloadKey((k) => k + 1)} />
  }

  const incidentListTabLabel = sidebarOpen ? 'Collapse incidents list' : 'Expand incidents list'

  const incidentListToggle = (positionClass: string) => (
    <button
      type="button"
      onClick={() => setSidebarOpen((open) => !open)}
      className={`pointer-events-auto absolute top-1/2 z-[1002] flex -translate-y-1/2 flex-col items-center gap-1.5 rounded-l-lg border border-r-0 border-border bg-surface/95 px-1.5 py-3 text-[10px] font-medium leading-snug text-text-muted shadow-lg backdrop-blur-sm transition-colors hover:bg-surface hover:text-white ${positionClass}`}
      aria-label={incidentListTabLabel}
      title={incidentListTabLabel}
    >
      {sidebarOpen ? (
        <PanelRightClose className="h-4 w-4 shrink-0" aria-hidden />
      ) : (
        <PanelRightOpen className="h-4 w-4 shrink-0" aria-hidden />
      )}
      <span className="rotate-180 [writing-mode:vertical-rl]">{incidentListTabLabel}</span>
    </button>
  )

  const mapToolbar = (
    <div className={formToolbar}>
      <label className={formCheckLabel}>
        <input
          type="checkbox"
          checked={showHeatmap}
          onChange={(e) => setShowHeatmap(e.target.checked)}
          className={formCheckbox}
        />
        <span className="text-text-muted">Heatmap</span>
      </label>
      <label className={formCheckLabel}>
        <input
          type="checkbox"
          checked={showSocioEconomic}
          onChange={(e) => setShowSocioEconomic(e.target.checked)}
          className={formCheckbox}
        />
        <span className="text-text-muted">Socio-Economic</span>
      </label>
      <NativeSelect
        selectWidth="fixed"
        value={selectedCategory}
        onChange={(e) => setSelectedCategory(e.target.value)}
      >
        {categories.map((cat) => (
          <option key={cat} value={cat}>
            {cat}
          </option>
        ))}
      </NativeSelect>
      <div className={`${btnSegmentGroup} shrink-0`}>
        {(['districts', 'incidents'] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`${btnSegment} capitalize ${viewMode === mode ? btnSegmentActive : ''}`}
          >
            {mode}
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <div className="flex h-full flex-col bg-navy-900">
      <PageHeader
        title="Crime Map"
        description="Interactive Karnataka district crime visualization"
        actions={mapToolbar}
      />

      <div className="flex min-h-0 flex-1">
        <div className="relative min-w-0 flex-1">
        {drilledDistrictId && drilledDistrict && (
          <button
            type="button"
            onClick={exitDistrictDrill}
            className={`pointer-events-auto absolute left-14 top-4 z-[1002] ${btnSecondary} text-sm shadow-lg`}
          >
            ← Back to all districts
          </button>
        )}
        {!sidebarOpen && incidentListToggle('right-0')}
        {loading && (
          <div className="absolute inset-0 z-[1001] flex items-center justify-center bg-navy-900/80">
            <div className="flex items-center gap-3 text-text-muted">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
              Loading map data...
            </div>
          </div>
        )}
        <div ref={mapRef} className="absolute inset-0 z-0 h-full w-full" />

        <div className="pointer-events-none absolute inset-0 z-[1000]">
          <div className="pointer-events-auto absolute bottom-6 left-6 max-w-[calc(100%-3rem)]">
            <div className="rounded-xl border border-border bg-surface/95 shadow-lg shadow-black/30 backdrop-blur-sm">
              <button
                type="button"
                onClick={() => setLegendExpanded((open) => !open)}
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition-colors hover:bg-white/5"
                aria-expanded={legendExpanded}
                aria-label={legendExpanded ? 'Collapse map legend' : 'Expand map legend'}
              >
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                    Map Legend
                  </p>
                  {!legendExpanded && (
                    <p className="mt-0.5 truncate text-[11px] text-text-muted">
                      {[
                        showHeatmap && 'Heatmap',
                        showSocioEconomic && 'Socio-Economic',
                      ]
                        .filter(Boolean)
                        .join(' · ') || 'No layers active'}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {showHeatmap && (
                    <span className="h-1.5 w-1.5 rounded-full bg-accent" title="Heatmap active" />
                  )}
                  {showSocioEconomic && (
                    <span className="h-1.5 w-1.5 rounded-full bg-[#9b59b6]" title="Socio-economic active" />
                  )}
                  {legendExpanded ? (
                    <ChevronUp className="h-4 w-4 text-text-muted" aria-hidden />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-text-muted" aria-hidden />
                  )}
                </div>
              </button>

              {legendExpanded && (
                <div className="space-y-3 border-t border-border px-3 pb-3 pt-2.5">
                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                      Crime Density Heatmap
                    </p>
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center gap-2.5">
                        <span className="relative flex h-4 w-4 items-center justify-center">
                          <span
                            className="h-4 w-4 rounded-full border-2 border-white/30"
                            style={{ background: `${HEATMAP_COLORS.high}99` }}
                          />
                          {showHeatmap && (
                            <span className="absolute inset-0 animate-ping rounded-full border border-[rgba(224,90,58,0.4)]" />
                          )}
                        </span>
                        <div>
                          <span className="font-medium text-white">High</span>
                          <span className="ml-1.5 text-text-muted">15+ incidents</span>
                          {showHeatmap && <span className="ml-1.5 text-danger">· pulsing</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span
                          className="h-4 w-4 rounded-full border-2 border-white/30"
                          style={{ background: `${HEATMAP_COLORS.medium}99` }}
                        />
                        <div>
                          <span className="font-medium text-white">Medium</span>
                          <span className="ml-1.5 text-text-muted">8–14 incidents</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span
                          className="h-4 w-4 rounded-full border-2 border-white/30"
                          style={{ background: `${HEATMAP_COLORS.low}99` }}
                        />
                        <div>
                          <span className="font-medium text-white">Low</span>
                          <span className="ml-1.5 text-text-muted">1–7 incidents</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {showSocioEconomic && (
                    <div className="border-t border-border pt-3">
                      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                        Socio-Economic Layer
                      </p>
                      <p className="mb-2 text-[11px] leading-relaxed text-text-muted">
                        Circle size = population density · Color intensity = urbanization level
                      </p>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="h-3.5 w-3.5 rounded-full bg-[#9b59b6]/60 ring-1 ring-[#9b59b6]" />
                          <span className="text-text-muted">High urbanization (75%+)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="h-3 w-3 rounded-full bg-[#4a90d9]/60 ring-1 ring-[#4a90d9]" />
                          <span className="text-text-muted">Moderate urbanization</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full bg-[#27ae60]/50 ring-1 ring-[#27ae60]" />
                          <span className="text-text-muted">Rural / low urbanization</span>
                        </div>
                      </div>
                      <div className="mt-2.5 flex items-start gap-2 rounded-lg bg-danger/10 px-2 py-1.5 ring-1 ring-danger/20">
                        <span className="relative mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
                          <span className="absolute inset-0 animate-ping rounded-full border border-danger/40" />
                          <span className="relative flex h-4 w-4 items-center justify-center rounded-full border border-danger bg-danger/20 text-[9px] font-bold text-danger">
                            !
                          </span>
                        </span>
                        <p className="text-[10px] font-medium leading-snug text-danger">
                          High crime + High density = Resource Priority Zone
                          <span className="mt-0.5 block font-normal text-danger/80">
                            Red border + pulsing badge on qualifying districts
                          </span>
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="pointer-events-auto absolute right-6 top-6 rounded-xl border border-border bg-surface/95 shadow-lg shadow-black/30 backdrop-blur-sm">
            <button
              type="button"
              onClick={() => setStatsExpanded((open) => !open)}
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition-colors hover:bg-white/5"
              aria-expanded={statsExpanded}
              aria-label={statsExpanded ? 'Collapse map stats' : 'Expand map stats'}
            >
              <div className="min-w-0">
                <p className="text-lg font-bold leading-none text-white">{incidents.length}</p>
                {!statsExpanded && (
                  <p className="mt-0.5 truncate text-[10px] text-text-muted">
                    incidents · {districts.length} districts
                  </p>
                )}
              </div>
              {statsExpanded ? (
                <ChevronUp className="h-4 w-4 shrink-0 text-text-muted" aria-hidden />
              ) : (
                <ChevronDown className="h-4 w-4 shrink-0 text-text-muted" aria-hidden />
              )}
            </button>

            {statsExpanded && (
              <div className="space-y-1.5 border-t border-border px-3 pb-2.5 pt-2 text-xs text-text-muted">
                <p>Active incidents mapped</p>
                <p>{districts.length} districts covered</p>
                {showHeatmap && (
                  <p className="flex items-center gap-1.5 text-accent-light">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
                    Heatmap active
                  </p>
                )}
                {showSocioEconomic && (
                  <p className="flex items-center gap-1.5 text-[#9b59b6]">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#9b59b6]" />
                    Socio-economic layer active
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <CrimeMapIncidentCard
          incident={selectedIncident}
          incidents={cardIncidents}
          networkNodes={networkNodes}
          districtRiskScore={
            selectedIncident ? districtRiskScores.get(selectedIncident.districtId) : undefined
          }
          onClose={closeIncidentDetail}
          onSelect={selectIncidentOnMap}
        />
        </div>

        {sidebarOpen && (
          <div className="relative shrink-0">
            {incidentListToggle('left-0 -translate-x-full')}
            <CrimeMapIncidentSidebar
              incidents={sidebarIncidents}
              selectedCategory={selectedCategory}
              selectedIncidentId={selectedIncident?.id}
              onIncidentSelect={focusIncidentOnMap}
            />
          </div>
        )}
      </div>
    </div>
  )
}
