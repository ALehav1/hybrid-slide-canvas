import { StateNode, Vec } from 'tldraw'
import type { TLPointerEventInfo, TLShapeId } from 'tldraw'
import { simplifyStroke, type IFreeDrawShape } from '@/lib/shapes/FreeDrawShapeUtil.tsx'

const SIMPLIFY_TOLERANCE = 1

export class FreeDrawTool extends StateNode {
  static override id = 'free-draw'
  static override initial = 'idle'
  
  static override children() {
    return [Idle, Drawing]
  }
}

class Idle extends StateNode {
  static override id = 'idle'

  override onEnter() {
    this.editor.setCursor({ type: 'cross', rotation: 0 })
  }

  override onPointerDown = (info: TLPointerEventInfo) => {
    const { currentPagePoint } = this.editor.inputs

    const shape = this.editor.createShape<IFreeDrawShape>({
      type: 'free-draw',
      x: currentPagePoint.x,
      y: currentPagePoint.y,
      props: { points: [[0, 0]], opacity: 1 }, // editor fills color & size
      meta: { createdBy: 'user' },
    })

    return this.parent.transition('drawing', { ...info, shapeId: shape.id })
  }
}

type DrawingInfo = TLPointerEventInfo & {
  shapeId: TLShapeId
}

class Drawing extends StateNode {
  static override id = 'drawing'
  
  shapeId!: TLShapeId
  points: number[][] = []

  override onEnter = (info: DrawingInfo) => {
    this.shapeId = info.shapeId
    this.points = [[0, 0]]
  }

  override onPointerMove = () => {
    const { currentPagePoint } = this.editor.inputs
    const shape = this.editor.getShape<IFreeDrawShape>(this.shapeId)
    
    if (!shape) return

    // ✅ Correct coordinate transformation (no "new Vec")
    const localPoint = Vec.Sub(currentPagePoint, { x: shape.x, y: shape.y })
    this.points.push([localPoint.x, localPoint.y])

    this.editor.updateShape<IFreeDrawShape>({
      id: this.shapeId,
      type: 'free-draw',
      props: {
        points: this.points,
      },
    })
  }

  override onPointerUp = () => {
    const simplified = simplifyStroke(this.points, SIMPLIFY_TOLERANCE)
    
    this.editor.updateShape<IFreeDrawShape>({
      id: this.shapeId,
      type: 'free-draw',
      props: {
        points: simplified,
      },
    })

    return this.parent.transition('idle')
  }

  override onCancel = () => {
    this.editor.deleteShapes([this.shapeId])
    return this.parent.transition('idle')
  }
}
