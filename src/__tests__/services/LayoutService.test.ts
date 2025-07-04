import { describe, it, expect } from 'vitest';
import { layoutDiagram } from '@/lib/services/LayoutService';
import type { Diagram } from '@/lib/services/AIService';

describe('LayoutService', () => {
  it('should correctly calculate layout for a simple diagram', () => {
    const simpleDiagram: Diagram = {
      nodes: [
        { id: 'n1', label: 'Start', type: 'rect' },
        { id: 'n2', label: 'End', type: 'rect' },
      ],
      edges: [{ from: 'n1', to: 'n2' }],
    };

    const positionedDiagram = layoutDiagram(simpleDiagram);

    // Check that nodes have been positioned
    expect(positionedDiagram.nodes).toHaveLength(2);
    positionedDiagram.nodes.forEach(node => {
      expect(node.x).toBeTypeOf('number');
      expect(node.y).toBeTypeOf('number');
      expect(node.width).toBeGreaterThan(0);
      expect(node.height).toBeGreaterThan(0);
    });

    // Check that edges are preserved
    expect(positionedDiagram.edges).toHaveLength(1);
    expect(positionedDiagram.edges[0].from).toBe('n1');
    expect(positionedDiagram.edges[0].to).toBe('n2');

    // Check that positions are not all zero (i.e., layout has run)
    const firstNode = positionedDiagram.nodes[0];
    const secondNode = positionedDiagram.nodes[1];
    expect(firstNode.x !== secondNode.x || firstNode.y !== secondNode.y).toBe(true);
  });

  it('should handle an empty diagram without errors', () => {
    const emptyDiagram: Diagram = {
      nodes: [],
      edges: [],
    };

    const positionedDiagram = layoutDiagram(emptyDiagram);

    expect(positionedDiagram.nodes).toHaveLength(0);
    expect(positionedDiagram.edges).toHaveLength(0);
  });
});
