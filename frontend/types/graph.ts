export type NodeType = 'concept' | 'entity' | 'process';

export interface GraphNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: {
    label: string;
    description?: string;
    category?: string;
    confidence?: number;
    matchedText?: string;
    sources?: string[];  // Job IDs that contributed this node
  };
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type?: 'default' | 'smoothstep' | 'straight';
  animated?: boolean;
  label?: string;
  data?: { relationship?: string };
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}
