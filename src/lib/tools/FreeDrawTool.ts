import {
	StateNode,
	Vec,
	createShapeId,
	type TLPointerEventInfo,
	type TLShapeId,
} from '@tldraw/tldraw'
import { simplifyStroke, type IFreeDrawShape } from '@/lib/shapes/FreeDrawShapeUtil'
import throttle from 'lodash.throttle'

const SIMPLIFY_TOLERANCE = 0.75

export class FreeDrawTool extends StateNode {
	static override id = 'free-draw'
	static override initial = 'idle'

	static override children() {
		return [Idle, Drawing]
	}
}

class Idle extends StateNode {
	static override id = 'idle'

	override onEnter = () => {
		this.editor.setCursor({ type: 'cross', rotation: 0 })
	}

	override onPointerDown = (info: TLPointerEventInfo) => {
		const { currentPagePoint } = this.editor.inputs
		// A type assertion is used here to work around a type mismatch for `currentPressure`.
		const currentPressure = (this.editor.inputs as any).currentPressure ?? 0.5
		const shapeId = createShapeId()

		this.editor.createShape<IFreeDrawShape>({
			id: shapeId,
			type: 'free-draw',
			x: currentPagePoint.x,
			y: currentPagePoint.y,
			props: {
				points: [[0, 0, currentPressure]],
				opacity: 1,
				// These props will be overridden by the user's default styles
				color: 'black',
				size: 'm',
			},
			meta: {
				createdBy: 'user',
			},
		})

		this.parent.transition('drawing', { ...info, shapeId })
	}
}

type DrawingInfo = TLPointerEventInfo & {
	shapeId: TLShapeId
}

class Drawing extends StateNode {
	static override id = 'drawing'

	private shapeId!: TLShapeId
	private points: number[][] = []

	private updateShape = throttle(() => {
		if (!this.getIsActive()) return
		this.editor.updateShape<IFreeDrawShape>({
			id: this.shapeId,
			type: 'free-draw',
			props: {
				points: this.points,
			},
		})
	}, 16)

	override onEnter = (info: DrawingInfo) => {
		this.shapeId = info.shapeId
		const shape = this.editor.getShape<IFreeDrawShape>(this.shapeId)
		if (!shape) {
			this.parent.transition('idle')
			return
		}

		this.points = shape.props.points

		this.editor.setCursor({ type: 'cross', rotation: 0 })
		this.onPointerMove()
	}

	override onPointerMove = () => {
		const { currentPagePoint } = this.editor.inputs
		const currentPressure = (this.editor.inputs as any).currentPressure ?? 0.5
		const shape = this.editor.getShape<IFreeDrawShape>(this.shapeId)
		if (!shape) return

		const { x, y } = Vec.Sub(currentPagePoint, { x: shape.x, y: shape.y })
		this.points.push([x, y, currentPressure])

		this.updateShape()
	}

	private complete() {
		this.updateShape.flush()

		const shape = this.editor.getShape<IFreeDrawShape>(this.shapeId)
		if (!shape) {
			this.parent.transition('idle')
			return
		}

		const simplifiedPoints = simplifyStroke(this.points, SIMPLIFY_TOLERANCE)

		this.editor.updateShape<IFreeDrawShape>({
			id: this.shapeId,
			type: 'free-draw',
			props: {
				points: simplifiedPoints,
			},
		})

		this.parent.transition('idle')
	}

	override onPointerUp = () => {
		this.complete()
	}

	override onComplete = () => {
		this.complete()
	}

	override onCancel = () => {
		this.editor.deleteShapes([this.shapeId])
		this.parent.transition('idle')
	}

	override onExit = () => {
		this.updateShape.cancel()
	}
}
