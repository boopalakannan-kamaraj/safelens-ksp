import type { NetworkNode } from '../types/crime'

export function resolveNavigationNodeId(
  nodes: Pick<NetworkNode, 'id'>[],
  suspectId?: string,
  victimId?: string,
): string | null {
  if (suspectId && nodes.some((n) => n.id === suspectId)) return suspectId
  if (victimId && nodes.some((n) => n.id === victimId)) return victimId
  return null
}

export function incidentHasNetworkLink(
  incident: { suspectId?: string; victimId?: string },
  nodes: Pick<NetworkNode, 'id'>[],
): boolean {
  return resolveNavigationNodeId(nodes, incident.suspectId, incident.victimId) != null
}
