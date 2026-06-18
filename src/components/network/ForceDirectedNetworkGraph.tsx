import { useEffect, useMemo, useRef, useState } from 'react'
import { drag } from 'd3-drag'
import { select } from 'd3-selection'
import { scaleLinear, scaleSqrt } from 'd3-scale'
import { zoom, zoomIdentity, zoomTransform, type ZoomBehavior } from 'd3-zoom'
import type { NetworkEdge, NetworkNode } from '../../types/crime'

const NODE_COLORS = {
  suspect: '#e74c3c',
  victim: '#4a90d9',
  location: '#27ae60',
} as const

type LayoutNode = NetworkNode & {
  x: number
  y: number
  angle?: number
}

type LayoutLink = {
  source: LayoutNode
  target: LayoutNode
  label: string
  weight: number
}

interface ForceDirectedNetworkGraphProps {
  nodes: NetworkNode[]
  edges: NetworkEdge[]
  selectedNode: string | null
  hoveredNode: string | null
  searchHighlightId: string | null
  onSelectNode: (id: string) => void
  onHoverNode: (id: string | null) => void
}

function truncateLabel(label: string, max = 14): string {
  return label.length > max ? `${label.slice(0, max - 1)}…` : label
}

function getNodeRadius(node: NetworkNode, radiusScale: (score: number) => number): number {
  if (node.type === 'suspect' && node.riskScore != null) {
    return radiusScale(node.riskScore)
  }
  if (node.type === 'victim') return 14
  return 16
}

function normalizeAngle(angle: number): number {
  let a = angle
  while (a > Math.PI) a -= 2 * Math.PI
  while (a < -Math.PI) a += 2 * Math.PI
  return a
}

function getAllLinkPartnerIds(nodeId: string, edges: NetworkEdge[]): string[] {
  const partners: string[] = []
  for (const edge of edges) {
    if (edge.source === nodeId) partners.push(edge.target)
    if (edge.target === nodeId) partners.push(edge.source)
  }
  return partners
}

function countSharedLinkTargets(suspectA: string, suspectB: string, edges: NetworkEdge[]): number {
  const targetsA = new Set(getAllLinkPartnerIds(suspectA, edges))
  return getAllLinkPartnerIds(suspectB, edges).filter((id) => targetsA.has(id)).length
}

function orderSuspectsGreedy(suspects: NetworkNode[], edges: NetworkEdge[]): NetworkNode[] {
  if (suspects.length <= 1) return suspects

  const remaining = new Set(suspects.map((s) => s.id))
  const ordered: NetworkNode[] = []

  const first = suspects[0]
  ordered.push(first)
  remaining.delete(first.id)

  while (remaining.size > 0) {
    const lastId = ordered[ordered.length - 1].id
    let bestId: string | null = null
    let bestScore = -1

    for (const id of remaining) {
      const score = countSharedLinkTargets(lastId, id, edges)
      if (score > bestScore) {
        bestScore = score
        bestId = id
      }
    }

    const next = suspects.find((s) => s.id === bestId)!
    ordered.push(next)
    remaining.delete(next.id)
  }

  return ordered
}

function nudgeAngle(angle: number, usedAngles: number[], minSeparation = 0.35): number {
  let candidate = angle
  let attempts = 0
  while (
    usedAngles.some((used) => Math.abs(normalizeAngle(used - candidate)) < minSeparation) &&
    attempts < 24
  ) {
    candidate += minSeparation
    attempts++
  }
  return candidate
}

export function computeStaticLayout(
  nodes: NetworkNode[],
  edges: NetworkEdge[],
  width: number,
  height: number,
): { layoutNodes: LayoutNode[]; layoutLinks: LayoutLink[] } {
  const cx = width / 2
  const cy = height / 2
  const innerR = Math.min(width, height) * 0.16
  const outerR = Math.min(width, height) * 0.34

  const suspects = orderSuspectsGreedy(
    nodes.filter((n) => n.type === 'suspect'),
    edges,
  )
  const outerNodes = nodes.filter((n) => n.type !== 'suspect')
  const suspectIdSet = new Set(suspects.map((s) => s.id))

  const positionById = new Map<string, LayoutNode>()

  suspects.forEach((node, index) => {
    const angle = (2 * Math.PI * index) / Math.max(suspects.length, 1) - Math.PI / 2
    positionById.set(node.id, {
      ...node,
      x: cx + innerR * Math.cos(angle),
      y: cy + innerR * Math.sin(angle),
      angle,
    })
  })

  const usedOuterAngles: number[] = []
  let fallbackIndex = 0

  for (const node of outerNodes) {
    const connectedSuspectAngles = edges
      .flatMap((edge) => {
        if (edge.source === node.id && suspectIdSet.has(edge.target)) {
          return [positionById.get(edge.target)?.angle]
        }
        if (edge.target === node.id && suspectIdSet.has(edge.source)) {
          return [positionById.get(edge.source)?.angle]
        }
        return []
      })
      .filter((a): a is number => a != null)

    let angle: number
    if (connectedSuspectAngles.length > 0) {
      const sinSum = connectedSuspectAngles.reduce((sum, a) => sum + Math.sin(a), 0)
      const cosSum = connectedSuspectAngles.reduce((sum, a) => sum + Math.cos(a), 0)
      angle = Math.atan2(sinSum, cosSum)
    } else {
      angle = (2 * Math.PI * fallbackIndex) / Math.max(outerNodes.length, 1) - Math.PI / 2
      fallbackIndex++
    }

    angle = nudgeAngle(angle, usedOuterAngles)
    usedOuterAngles.push(angle)

    positionById.set(node.id, {
      ...node,
      x: cx + outerR * Math.cos(angle),
      y: cy + outerR * Math.sin(angle),
      angle,
    })
  }

  for (const node of nodes) {
    if (!positionById.has(node.id)) {
      const angle = (2 * Math.PI * fallbackIndex) / Math.max(nodes.length, 1)
      fallbackIndex++
      positionById.set(node.id, {
        ...node,
        x: cx + outerR * Math.cos(angle),
        y: cy + outerR * Math.sin(angle),
        angle,
      })
    }
  }

  const layoutNodes = nodes.map((node) => positionById.get(node.id)!)
  const nodeById = new Map(layoutNodes.map((n) => [n.id, n]))

  const layoutLinks: LayoutLink[] = edges
    .map((edge) => {
      const source = nodeById.get(edge.source)
      const target = nodeById.get(edge.target)
      if (!source || !target) return null
      return { source, target, label: edge.label, weight: edge.weight }
    })
    .filter((link): link is LayoutLink => link != null)

  return { layoutNodes, layoutLinks }
}

function getFocusNeighborhood(focusId: string | null, links: LayoutLink[]): Set<string> {
  if (!focusId) return new Set()

  const neighborhood = new Set<string>([focusId])
  for (const link of links) {
    if (link.source.id === focusId) neighborhood.add(link.target.id)
    if (link.target.id === focusId) neighborhood.add(link.source.id)
  }
  return neighborhood
}

export default function ForceDirectedNetworkGraph({
  nodes,
  edges,
  selectedNode,
  hoveredNode,
  searchHighlightId,
  onSelectNode,
  onHoverNode,
}: ForceDirectedNetworkGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const zoomLayerRef = useRef<SVGGElement>(null)
  const zoomBehaviorRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const layoutNodesRef = useRef<LayoutNode[]>([])
  const layoutLinksRef = useRef<LayoutLink[]>([])

  const [dimensions, setDimensions] = useState({ width: 800, height: 520 })

  const topRiskIds = useMemo(() => {
    return nodes
      .filter((n) => n.type === 'suspect' && n.riskScore != null)
      .sort((a, b) => (b.riskScore ?? 0) - (a.riskScore ?? 0))
      .slice(0, 2)
      .map((n) => n.id)
  }, [nodes])

  const focusId = hoveredNode ?? searchHighlightId ?? selectedNode

  const { layoutNodes, layoutLinks } = useMemo(
    () => computeStaticLayout(nodes, edges, dimensions.width, dimensions.height),
    [nodes, edges, dimensions.width, dimensions.height],
  )

  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    const updateSize = () => {
      const { width, height } = container.getBoundingClientRect()
      const newWidth = Math.max(width, 320)
      const newHeight = Math.max(height, 400)

      setDimensions((prev) => {
        if (
          Math.abs(newWidth - prev.width) < 2 &&
          Math.abs(newHeight - prev.height) < 2
        ) {
          return prev
        }
        return { width: newWidth, height: newHeight }
      })
    }

    updateSize()
    const resizeObserver = new ResizeObserver(updateSize)
    resizeObserver.observe(container)

    return () => resizeObserver.disconnect()
  }, [])

  const redrawPositions = () => {
    if (!zoomLayerRef.current) return
    const zoomLayer = select(zoomLayerRef.current)

    zoomLayer
      .selectAll<SVGLineElement, LayoutLink>('line')
      .attr('x1', (d) => d.source.x)
      .attr('y1', (d) => d.source.y)
      .attr('x2', (d) => d.target.x)
      .attr('y2', (d) => d.target.y)

    zoomLayer
      .selectAll<SVGGElement, LayoutNode>('g.node')
      .attr('transform', (d) => `translate(${d.x},${d.y})`)
  }

  useEffect(() => {
    if (!svgRef.current || !zoomLayerRef.current || layoutNodes.length === 0) return

    layoutNodesRef.current = layoutNodes.map((node) => ({ ...node }))
    layoutLinksRef.current = layoutLinks.map((link) => ({
      ...link,
      source: layoutNodesRef.current.find((n) => n.id === link.source.id)!,
      target: layoutNodesRef.current.find((n) => n.id === link.target.id)!,
    }))

    const svg = select(svgRef.current)
    const zoomLayer = select(zoomLayerRef.current)
    const { width, height } = dimensions

    svg.attr('width', width).attr('height', height).attr('viewBox', `0 0 ${width} ${height}`)

    zoomLayer.selectAll('*').remove()

    const radiusScale = scaleSqrt().domain([70, 95]).range([14, 28])
    const edgeWidthScale = scaleLinear().domain([1, 4]).range([1, 3.5])

    const linkGroup = zoomLayer.append('g').attr('class', 'links')
    const nodeGroup = zoomLayer.append('g').attr('class', 'nodes')

    const linkSelection = linkGroup
      .selectAll<SVGLineElement, LayoutLink>('line')
      .data(layoutLinksRef.current)
      .join('line')
      .attr('stroke', '#4a90d9')
      .attr('stroke-opacity', 0.55)
      .attr('stroke-width', (d) => edgeWidthScale(d.weight))

    linkSelection
      .attr('x1', (d) => d.source.x)
      .attr('y1', (d) => d.source.y)
      .attr('x2', (d) => d.target.x)
      .attr('y2', (d) => d.target.y)

    const nodeSelection = nodeGroup
      .selectAll<SVGGElement, LayoutNode>('g')
      .data(layoutNodesRef.current, (d) => d.id)
      .join('g')
      .attr('class', 'node')
      .style('cursor', 'pointer')
      .attr('transform', (d) => `translate(${d.x},${d.y})`)
      .call(
        drag<SVGGElement, LayoutNode>().on('drag', (event, d) => {
          const transform = zoomTransform(svgRef.current!)
          d.x = (event.x - transform.x) / transform.k
          d.y = (event.y - transform.y) / transform.k
          redrawPositions()
        }),
      )

    nodeSelection.each(function (d) {
      const group = select(this)
      const radius = getNodeRadius(d, radiusScale)
      const color = NODE_COLORS[d.type]
      const isTopRisk = topRiskIds.includes(d.id)

      group.selectAll('*').remove()

      if (isTopRisk) {
        group
          .append('circle')
          .attr('class', 'network-risk-halo')
          .attr('r', radius + 10)
          .attr('fill', 'none')
          .attr('stroke', color)
          .attr('stroke-width', 1.5)
          .attr('stroke-opacity', 0.35)
      }

      group
        .append('circle')
        .attr('class', 'node-body')
        .attr('r', radius)
        .attr('fill', `${color}30`)
        .attr('stroke', color)
        .attr('stroke-width', 2)

      const showLabelAlways = d.type === 'suspect'
      group
        .append('text')
        .attr('class', 'node-label')
        .attr('y', radius + 14)
        .attr('text-anchor', 'middle')
        .attr('fill', '#8ba4c4')
        .attr('font-size', 9)
        .attr('font-weight', 500)
        .attr('opacity', showLabelAlways ? 1 : 0)
        .text(truncateLabel(d.label))

      group.append('title').text(d.label)
    })

    nodeSelection
      .on('click', (_, d) => {
        onSelectNode(d.id)
      })
      .on('mouseenter', (_, d) => {
        onHoverNode(d.id)
      })
      .on('mouseleave', () => {
        onHoverNode(null)
      })

    redrawPositions()

    const zoomBehavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.4, 2.5])
      .on('zoom', (event) => {
        zoomLayer.attr('transform', event.transform)
      })

    zoomBehaviorRef.current = zoomBehavior
    svg.call(zoomBehavior)

    return () => {
      svg.on('.zoom', null)
    }
  }, [layoutNodes, layoutLinks, dimensions, onHoverNode, onSelectNode, topRiskIds])

  useEffect(() => {
    if (!zoomLayerRef.current) return

    const neighborhood = getFocusNeighborhood(focusId, layoutLinksRef.current)
    const hasFocus = neighborhood.size > 0

    const linkSelection = select(zoomLayerRef.current).selectAll<SVGLineElement, LayoutLink>('line')
    linkSelection
      .attr('stroke-opacity', (d) => {
        if (!hasFocus) return 0.55
        return neighborhood.has(d.source.id) && neighborhood.has(d.target.id) ? 0.85 : 0.12
      })
      .attr('stroke-width', (d) => {
        const base = scaleLinear().domain([1, 4]).range([1, 3.5])(d.weight)
        if (!hasFocus) return base
        return neighborhood.has(d.source.id) && neighborhood.has(d.target.id) ? base + 0.5 : base
      })

    const nodeSelection = select(zoomLayerRef.current).selectAll<SVGGElement, LayoutNode>('g.node')
    nodeSelection.attr('opacity', (d) => {
      if (!hasFocus) return 1
      return neighborhood.has(d.id) ? 1 : 0.18
    })

    nodeSelection.each(function (d) {
      const group = select(this)
      const isFocused = focusId === d.id
      const inNeighborhood = neighborhood.has(d.id)

      group.select('.node-body').attr('stroke-width', isFocused ? 3 : inNeighborhood && hasFocus ? 2.5 : 2)

      const label = group.select('.node-label')
      const showLabel = d.type === 'suspect' || inNeighborhood
      label
        .attr('opacity', showLabel ? 1 : 0)
        .attr('fill', isFocused ? '#e8edf4' : '#8ba4c4')
        .attr('font-weight', isFocused ? 600 : 500)
        .text(truncateLabel(d.label, isFocused ? 20 : 14))
    })
  }, [focusId])

  useEffect(() => {
    if (!searchHighlightId || !svgRef.current || !zoomBehaviorRef.current) return

    const node = layoutNodesRef.current.find((n) => n.id === searchHighlightId)
    if (!node) return

    const { width, height } = dimensions
    const transform = zoomIdentity.translate(width / 2 - node.x, height / 2 - node.y).scale(1.15)
    select(svgRef.current).call(zoomBehaviorRef.current.transform, transform)
  }, [searchHighlightId, dimensions])

  return (
    <div ref={containerRef} className="h-full min-h-[480px] w-full">
      <svg ref={svgRef} className="h-full w-full">
        <g ref={zoomLayerRef} />
      </svg>
    </div>
  )
}

export { NODE_COLORS }
