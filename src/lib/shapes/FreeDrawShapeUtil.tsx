import * as React from 'react'
import { getStroke } from 'perfect-freehand'
import simplify from 'simplify-js'
import {
	DefaultColorStyle,
	DefaultSizeStyle,
	Geometry2d,
	Polygon2d,
	ShapeUtil,
	T,
	Vec,
	getDefaultColorTheme,
} from 'tldraw'
import type {
	SvgExportContext,
	TLBaseShape,
	TLDefaultColorStyle,
	TLDefaultSizeStyle,
} from 'tldraw'

/* ---------- Types --------------------------------------------------------- */
export type IFreeDrawShape = TLBaseShape<
	'free-draw',
	{
		points: number[][]
		color: TLDefaultColorStyle
		size: TLDefaultSizeStyle
		opacity: number
	}
>

/* ---------- Constants ---------------------------------------------------- */
const SIZE_PX: Record<TLDefaultSizeStyle, number> = {
	s: 4,
	m: 8,
	l: 16,
	xl: 32,
}

/* ---------- Helpers ------------------------------------------------------- */
export function getSvgPath(stroke: number[][]): string {
	if (!stroke.length) return ''

	const d = stroke.reduce<string[]>((acc, [x, y], i) => {
		acc.push(`${i === 0 ? 'M' : 'L'}${x} ${y}`)
		return acc
	}, [])

	return d.join(' ') + ' Z'
}

// Corrected simplifyStroke to handle pressure
export function simplifyStroke(points: number[][], tolerance = 1): number[][] {
	// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
	const pts = points.map(([x, y, z]) => ({ x, y, z: z ?? 0.5 }))
	const simplified = simplify(pts, tolerance, true) as { x: number; y: number; z: number }[]
	return simplified.map(({ x, y, z }) => [x, y, z])
}

/* ---------- Shape Util --------------------------------------------------- */
export class FreeDrawShapeUtil extends ShapeUtil<IFreeDrawShape> {
	static override type = 'free-draw' as const

	static override props = {
		points: T.arrayOf(T.arrayOf(T.number)),
		color: DefaultColorStyle,
		size: DefaultSizeStyle,
		opacity: T.number,
	}

	getDefaultProps(): IFreeDrawShape['props'] {
		return {
			points: [],
			color: 'black',
			size: 'm',
			opacity: 1,
		}
	}

	getGeometry(shape: IFreeDrawShape): Geometry2d {
		const { points } = shape.props

		if (points.length === 0) {
			return new Polygon2d({
				points: [new Vec(0, 0)],
				isFilled: true,
			})
		}

		const stroke = getStroke(points, {
			size: SIZE_PX[shape.props.size],
			thinning: 0.6,
			smoothing: 0.5,
			streamline: 0.6,
		})

		return new Polygon2d({
			points: stroke.map(([x, y]) => new Vec(x, y)),
			isFilled: true,
		})
	}

	component(shape: IFreeDrawShape) {
		const { points, color, size, opacity } = shape.props

		if (points.length === 0) {
			return null
		}

		const stroke = getStroke(points, {
			size: SIZE_PX[size],
			thinning: 0.6,
			smoothing: 0.5,
			streamline: 0.6,
		})

		const theme = getDefaultColorTheme({ isDarkMode: this.editor.user.getIsDarkMode() })

		return (
			<path
				d={getSvgPath(stroke)}
				fill={theme[color].solid}
				fillOpacity={opacity}
				strokeWidth={0}
			/>
		)
	}

	indicator(shape: IFreeDrawShape) {
		const geom = this.getGeometry(shape) as Polygon2d
		const pathData = getSvgPath(geom.vertices.map(p => [p.x, p.y]))

		return (
			<path
				d={pathData}
				fill="none"
				stroke="var(--color-selection-stroke)"
				strokeWidth={1}
				strokeDasharray="2 2"
			/>
		)
	}

	override toSvg(shape: IFreeDrawShape, ctx: SvgExportContext): React.ReactElement {
		const { points, color, size, opacity } = shape.props
		const theme = getDefaultColorTheme({ isDarkMode: ctx.isDarkMode })

		if (points.length === 0) {
			return <g />
		}

		const stroke = getStroke(points, {
			size: SIZE_PX[size],
			thinning: 0.6,
			smoothing: 0.5,
			streamline: 0.6,
		})

		return (
			<path
				d={getSvgPath(stroke)}
				fill={theme[color].solid}
				fillOpacity={opacity}
				strokeWidth={0}
			/>
		)
	}
}
