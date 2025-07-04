import dagre from '@dagrejs/dagre'
import type { DiagramJSON } from './AIService'

export interface PositionedNode {
  id: string
  x: number
  y: number
  width: number
  height: number
  label: string
  type: string
}
export interface PositionedEdge { from: string; to: string }

export interface PositionedDiagram {
  nodes: PositionedNode[]
  edges: PositionedEdge[]
}

/**
 * Uses dagre.js to calculate node positions for a diagram.
 * @param diagram The raw diagram data from the AI service.
 * @returns A diagram with calculated x/y coordinates for each node.
 */
export function layoutDiagram(diagram: DiagramJSON): PositionedDiagram {
  const g = new dagre.graphlib.Graph()
    .setGraph({ rankdir: 'TB', nodesep: 60, ranksep: 70 })
    .setDefaultEdgeLabel(() => ({}))

  /* add nodes with rough size estimates */
  diagram.nodes.forEach((n) => {
    const width = Math.max(80, n.label.length * 7)
    const height = 40
    g.setNode(n.id, { width, height, label: n.label })
  })
  diagram.edges.forEach((e) => g.setEdge(e.from, e.to))

  dagre.layout(g)

  const nodes: PositionedNode[] = g.nodes().map((id) => {
    const dagreNode = g.node(id)
    const originalNode = diagram.nodes.find((n) => n.id === id)

    if (!originalNode) {
      throw new Error(`Node with id "${id}" not found in original diagram data.`)
    }

    return {
      id,
      x: dagreNode.x,
      y: dagreNode.y,
      width: dagreNode.width,
      height: dagreNode.height,
      label: originalNode.label,
      type: originalNode.type,
    }
  })

  return { nodes, edges: diagram.edges }
}
