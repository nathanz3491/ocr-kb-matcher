'use client';

import { useState, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { GraphData, GraphNode, GraphEdge } from '@/types/graph';
import { useTheme } from '@/components/theme/ThemeProvider';

// Node colors by type
const nodeColors = {
  concept: '#0ea5e9',  // Sky blue
  entity: '#10b981',   // Emerald green
  process: '#f59e0b',  // Amber orange
};

interface ReactFlowGraphProps {
  graphData: GraphData;
}

export function ReactFlowGraph({ graphData }: ReactFlowGraphProps) {
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  
  const EXTRA_SPACING = 75;

  const scaledNodes = graphData.nodes.map((node) => ({ ...node }));
  if (scaledNodes.length > 1) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const node of scaledNodes) {
      if (node.position.x < minX) minX = node.position.x;
      if (node.position.x > maxX) maxX = node.position.x;
      if (node.position.y < minY) minY = node.position.y;
      if (node.position.y > maxY) maxY = node.position.y;
    }
    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;
    const scaleX = (rangeX + EXTRA_SPACING * (graphData.nodes.length - 1)) / rangeX;
    const scaleY = (rangeY + EXTRA_SPACING * (graphData.nodes.length - 1)) / rangeY;

    for (const node of scaledNodes) {
      node.position = {
        x: (node.position.x - minX) * scaleX + 50,
        y: (node.position.y - minY) * scaleY + 50,
      };
    }
  }

  const initialNodes: Node[] = scaledNodes.map((node) => ({
    id: node.id,
    type: 'default',
    position: node.position,
    data: { ...node.data },
    style: {
      background: nodeColors[node.type],
      color: '#fff',
      border: 'none',
      borderRadius: '8px',
      padding: '10px',
      fontSize: '14px',
      fontWeight: 500,
    },
  }));
  
  const initialEdges: Edge[] = graphData.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.label,
    animated: edge.animated ?? true,
    style: { stroke: '#64748b' },
  }));
  
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    const graphNode = graphData.nodes.find((n) => n.id === node.id);
    setSelectedNode(graphNode || null);
  }, [graphData.nodes]);
  
  const { theme } = useTheme();
  
  return (
    <div className="h-[600px] w-full border rounded-lg overflow-hidden bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        fitView
      >
        <Background color={theme === 'dark' ? '#334155' : '#e2e8f0'} />
        <Controls className="!bg-white dark:!bg-slate-800 !border-slate-200 dark:!border-slate-700" />
        <MiniMap nodeStrokeWidth={3} zoomable pannable className="!bg-white dark:!bg-slate-800" />
        
        {selectedNode && (
          <Panel position="top-right" className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-lg m-4 max-w-xs text-slate-800 dark:text-slate-200">
            <h3 className="font-semibold text-lg mb-2">{selectedNode.data.label}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{selectedNode.data.description}</p>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              <span className="inline-block px-2 py-1 bg-gray-100 dark:bg-slate-700 rounded">
                {selectedNode.type}
              </span>
              {selectedNode.data.category && (
                <span className="ml-2 inline-block px-2 py-1 bg-gray-100 dark:bg-slate-700 rounded">
                  {selectedNode.data.category}
                </span>
              )}
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="mt-3 text-xs text-blue-500 hover:underline"
            >
              Close
            </button>
          </Panel>
        )}
      </ReactFlow>
    </div>
  );
}
