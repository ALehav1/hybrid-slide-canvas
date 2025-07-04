import type { Editor, TLShapeId } from '@tldraw/tldraw'
import { layoutDiagram, type PositionedDiagram } from '@/lib/services/LayoutService'
import { createShapeId } from '@tldraw/tldraw'
import type { AIService } from '../services/AIService'

export class CanvasRenderer {
  constructor(private editor: Editor) {}

  /** High-level orchestration: prompt → AI → layout → shapes */
  async renderDiagram(prompt: string, ai: AIService) {
    const raw = await ai.createDiagram(prompt)
    const positioned = layoutDiagram(raw)
    this.draw(positioned)
  }

  draw(layout: PositionedDiagram) {
        this.editor.run(() => {
      const idMap = new Map<string, TLShapeId>()

      // Create nodes
      layout.nodes.forEach((n) => {
        const shapeId = createShapeId()
        idMap.set(n.id, shapeId)
        this.editor.createShapes([
          {
            id: shapeId,
            type: 'geo', // Use 'geo' shape as a container
            x: n.x,
            y: n.y,
            props: {
              geo: n.type,
              w: n.width,
              h: n.height,
              text: n.label,
              font: 'draw',
              align: 'middle',
              size: 'm',
            },
          },
        ])
      })

      // Create edges
      layout.edges.forEach((e) => {
        const fromId = idMap.get(e.from)
        const toId = idMap.get(e.to)

        if (!fromId || !toId) {
          console.warn(`Could not find nodes for edge: ${e.from} -> ${e.to}`)
          return
        }

        this.editor.createShapes([
          {
            id: createShapeId(),
            type: 'arrow',
            props: {
              start: { type: 'binding', boundShapeId: fromId, isExact: false },
              end: { type: 'binding', boundShapeId: toId, isExact: false },
              arrowheadStart: 'none',
              arrowheadEnd: 'arrow',
            },
          },
        ])
      })
    })
  }
}
