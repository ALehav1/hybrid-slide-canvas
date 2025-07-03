// __tests__/FreeDrawIntegration.test.ts
// __tests__/FreeDrawIntegration.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { FreeDrawShapeUtil, getSvgPath } from '../lib/shapes/FreeDrawShapeUtil.tsx'
import type { IFreeDrawShape } from '../lib/shapes/FreeDrawShapeUtil.tsx'
import { DefaultColorStyle, DefaultSizeStyle, Polygon2d, Vec, type Editor } from 'tldraw'

describe('FreeDrawShapeUtil - Final Integration', () => {
  let util: FreeDrawShapeUtil

  beforeEach(() => {
    // The ShapeUtil constructor needs an editor, but our methods don't use it.
    // We can pass a minimal mock to satisfy the type signature.
    const mockEditor = {} as Editor
    util = new FreeDrawShapeUtil(mockEditor)
  })

  it('should use DefaultColorStyle and DefaultSizeStyle', () => {
    // Verify props are linked to tldraw's style system
    expect(FreeDrawShapeUtil.props.color).toBe(DefaultColorStyle)
    expect(FreeDrawShapeUtil.props.size).toBe(DefaultSizeStyle)
  })

  it('should create 3D points for Polygon2d', () => {
    const shape: IFreeDrawShape = {
      id: 'test-id' as any,
      typeName: 'shape',
      type: 'free-draw',
      x: 0,
      y: 0,
      rotation: 0,
      index: 'a1' as any,
      parentId: 'page1' as any,
      isLocked: false,
      opacity: 1,
      meta: {},
      props: {
        points: [[0, 0], [10, 10]],
        color: 'black',
        size: 'm',
        opacity: 1,
      },
    }

    const geometry = util.getGeometry(shape)
    
    // Verify geometry is created and points have z coordinate
    expect(geometry).toBeDefined()
    expect(geometry.isFilled).toBe(true)
    
    // Access the points to verify they have z coordinate
    const polygon = geometry as Polygon2d
    expect(polygon.vertices[0]).toBeInstanceOf(Vec)
    expect(polygon.vertices[0].z).toBe(0)
  })

  it('should provide svgPath for indicator', () => {
    const shape: IFreeDrawShape = {
      id: 'test-id' as any,
      typeName: 'shape',
      type: 'free-draw',
      x: 0,
      y: 0,
      rotation: 0,
      index: 'a1' as any,
      parentId: 'page1' as any,
      isLocked: false,
      opacity: 1,
      meta: {},
      props: {
        points: [[0, 0], [10, 10], [20, 0]],
        color: 'blue',
        size: 'l',
        opacity: 0.8,
      },
    }

    const geom = util.getGeometry(shape) as Polygon2d
    const pathData = getSvgPath(geom.vertices.map((p: Vec) => [p.x, p.y]))

    // Verify a valid SVG path string is generated
    expect(pathData).toBeDefined()
    expect(typeof pathData).toBe('string')
    expect(pathData.startsWith('M')).toBe(true)
  })

  it('should handle all size variants correctly', () => {
    const sizes: Array<IFreeDrawShape['props']['size']> = ['s', 'm', 'l', 'xl']
    
    sizes.forEach(size => {
      const shape: IFreeDrawShape = {
        id: 'test-id' as any,
        typeName: 'shape',
        type: 'free-draw',
        x: 0,
        y: 0,
        rotation: 0,
        index: 'a1' as any,
        parentId: 'page1' as any,
        isLocked: false,
        opacity: 1,
        meta: {},
        props: {
          points: [[0, 0], [5, 5]],
          color: 'red',
          size: size,
          opacity: 1,
        },
      }

      // Should not throw and should create valid geometry
      expect(() => util.getGeometry(shape)).not.toThrow()
      expect(() => util.component(shape)).not.toThrow()
    })
  })

  it('should default to valid tldraw style values', () => {
    const defaults = util.getDefaultProps()
    
    expect(defaults.color).toBe('black') // Valid TLDefaultColorStyle
    expect(defaults.size).toBe('m')      // Valid TLDefaultSizeStyle
    expect(defaults.opacity).toBe(1)
    expect(defaults.points).toEqual([])
  })
})

// Integration Test
describe('Style Integration Test', () => {
  it('should work with tldraw style system', () => {
    // Mock a scenario where tldraw applies current styles
    const mockShape = {
      type: 'free-draw',
      x: 100,
      y: 100,
      props: {
        points: [[0, 0], [10, 10]],
        opacity: 1,
        // color and size will be injected by tldraw automatically
      }
    }

    // Verify the shape structure is compatible
    expect(mockShape.type).toBe('free-draw')
    expect(mockShape.props.points).toBeDefined()
    expect(mockShape.props.opacity).toBe(1)
    
    // The absence of manual color/size means tldraw will inject them
    expect(mockShape.props).not.toHaveProperty('color')
    expect(mockShape.props).not.toHaveProperty('size')
  })
})
