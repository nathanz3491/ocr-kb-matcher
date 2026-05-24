'use client';

import { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  Panel,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { toPng } from 'html-to-image';
import { useTheme } from '@/components/theme/ThemeProvider';
import Link from 'next/link';
import { Layers, FileText, BookOpen, HelpCircle, X, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';

const NODE_COLORS = {
  known: '#10b981',
  unknown: '#ef4444',
};

// Triangle layout: Three civilizations - China (top), Japan (bottom-left), India (bottom-right)
const CIVILIZATION_GROUPS: Record<string, { label: string; color: string; borderColor: string; x: number; y: number }> = {
  'CHINA': { label: 'China', color: 'rgba(239, 68, 68, 0.12)', borderColor: '#ef4444', x: 5000, y: 1500 },
  'JAPAN': { label: 'Japan', color: 'rgba(168, 85, 247, 0.12)', borderColor: '#a855f7', x: 2500, y: 5830 },
  'INDIA': { label: 'India', color: 'rgba(245, 158, 11, 0.12)', borderColor: '#f59e0b', x: 7500, y: 5830 },
};

// Map node IDs to civilizations based on cultural content
function getNodeCivilization(nodeId: string, domain?: string): string {
  const prefix = nodeId.split('-')[0] + '-' + nodeId.split('-')[1];
  
  switch (prefix) {
    case 'EA-CH': // China nodes
      return 'CHINA';
    case 'EA-JP': // Japan nodes
      return 'JAPAN';
    case 'SA-IN': // India nodes
      return 'INDIA';
    case 'EA-KR': // Korea → China (East Asian cultural sphere, heavy Chinese influence)
      return 'CHINA';
    case 'SEA': // Southeast Asia → India (Indian cultural influence via Hinduism/Buddhism, trade)
      return 'INDIA';
    case 'CA-ST': // Central Asia/Steppe → China (Xiongnu, Mongol interactions, Great Wall context)
      return 'CHINA';
    default:
      // Check domain as fallback
      if (domain?.includes('China')) return 'CHINA';
      if (domain?.includes('Japan')) return 'JAPAN';
      if (domain?.includes('India')) return 'INDIA';
      if (domain?.includes('Korea')) return 'CHINA';
      if (domain?.includes('Southeast')) return 'INDIA';
      if (domain?.includes('Central')) return 'CHINA';
      return 'CHINA'; // Default
  }
}

const GRAPH_BOUNDS = {
  width: 10000,
  height: 10000,
  cardWidth: 240,
  cardHeight: 140,
};

const ZOOM_CONFIG = {
  MIN_ZOOM: 0.06,
  MAX_ZOOM: 2.0,
  DEFAULT_ZOOM: 0.12,
};

/**
 * Get color based on mastery percentage
 * 0% = red, 50% = yellow, 100% = green
 */
function getMasteryGradient(mastery: number): { from: string; to: string; glow: string } {
  if (mastery >= 75) return { from: '#10b981', to: '#34d399', glow: '#10b981' };
  if (mastery >= 50) return { from: '#22c55e', to: '#86efac', glow: '#22c55e' };
  if (mastery >= 25) return { from: '#eab308', to: '#fde047', glow: '#eab308' };
  if (mastery > 0) return { from: '#f97316', to: '#fdba74', glow: '#f97316' };
  return { from: '#6b7280', to: '#9ca3af', glow: '#6b7280' };
}

const CIVILIZATION_BORDER_COLORS: Record<string, string> = {
  'CHINA': '#ef4444',
  'JAPAN': '#a855f7',
  'INDIA': '#f59e0b',
};

function CustomNode({ data, selected }: { data: { id: string; name: string; isKnown: boolean; mastery?: number; civilization?: string }; selected?: boolean }) {
  const mastery = data.mastery || 0;
  const civilization = data.civilization || 'CHINA';
  const masteryGrad = getMasteryGradient(mastery);
  const civBorder = CIVILIZATION_BORDER_COLORS[civilization] || CIVILIZATION_BORDER_COLORS['CHINA'];
  
  return (
    <>
      <Handle type="target" position={Position.Left} className="!bg-gray-400 !w-3 !h-3" />
      <div
        style={{
          background: `linear-gradient(135deg, ${masteryGrad.from} 0%, ${masteryGrad.to} 100%)`,
          color: '#fff',
          border: `3px solid ${selected ? '#fbbf24' : civBorder}`,
          borderRadius: '12px',
          padding: '10px 14px',
          minWidth: '180px',
          maxWidth: '240px',
          height: 'auto',
          whiteSpace: 'normal',
          wordBreak: 'break-word',
          overflowWrap: 'break-word',
          textAlign: 'center',
          boxShadow: mastery >= 25
            ? `0 0 20px ${masteryGrad.glow}60, 0 6px 16px rgba(0,0,0,0.15)`
            : `0 4px 12px rgba(0,0,0,0.15)`,
        }}
      >
        <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '2px', textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
          {data.id}
        </div>
        <div style={{ fontSize: '10px', opacity: 0.95, textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
          {data.name}
        </div>
        {/* Progress bar and percentage */}
        <div style={{ marginTop: '8px' }}>
          <div style={{ 
            width: '100%', 
            height: '6px', 
            background: 'rgba(0,0,0,0.3)', 
            borderRadius: '3px',
            overflow: 'hidden',
            marginBottom: '4px'
          }}>
            <div style={{ 
              width: `${mastery}%`, 
              height: '100%', 
              background: mastery >= 50 ? '#fff' : '#fff',
              borderRadius: '3px',
              transition: 'width 0.3s ease'
            }} />
          </div>
          <div style={{ fontSize: '9px', opacity: 0.9 }}>{mastery.toFixed(0)}%  mastery</div>
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!bg-gray-400 !w-3 !h-3" />
    </>
  );
}

const nodeTypes = {
  custom: CustomNode,
};

interface KnowledgeNode {
  id: string;
  name: string;
  domain: string;
  prerequisites: string[];
  nextSteps: string[];
  x?: number;
  y?: number;
}

interface KnowledgeEdge {
  source: string;
  target: string;
  label?: string;
}

interface GraphData {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  knownNodes: string[];
  nodeMasteries: Record<string, number>;
}

// Generate organic layout based on actual graph connections
function generateOrganicLayout(nodes: KnowledgeNode[], edges: KnowledgeEdge[]) {
  const NODE_WIDTH = 180;
  const NODE_HEIGHT = 60;
  const HORIZONTAL_GAP = 80;  // More horizontal space
  const VERTICAL_GAP = 105;  // Vertical space between nodes in same layer
  
  const nodePositions: Map<string, { x: number; y: number }> = new Map();
  const nodeMap: Map<string, KnowledgeNode> = new Map();
  nodes.forEach(n => nodeMap.set(n.id, n));
  
  // Build adjacency list - use the edges directly
  const outgoing: Map<string, string[]> = new Map();
  const incoming: Map<string, string[]> = new Map();
  nodes.forEach(n => {
    outgoing.set(n.id, []);
    incoming.set(n.id, []);
  });
  edges.forEach(e => {
    outgoing.get(e.source)?.push(e.target);
    incoming.get(e.target)?.push(e.source);
  });
  
  // Find root nodes (no incoming edges)
  const roots = nodes.filter(n => {
    const inc = incoming.get(n.id) || [];
    return inc.length === 0;
  });
  
  // Calculate layer for each node using BFS
  const nodeLayers: Map<string, number> = new Map();
  const visited = new Set<string>();
  const queue: Array<{ id: string; layer: number }> = [];
  
  // Start with roots at layer 0
  roots.forEach(root => {
    nodeLayers.set(root.id, 0);
    queue.push({ id: root.id, layer: 0 });
    visited.add(root.id);
  });
  
  // BFS to assign layers
  while (queue.length > 0) {
    const { id, layer } = queue.shift()!;
    const children = outgoing.get(id) || [];
    
    children.forEach(childId => {
      if (!visited.has(childId)) {
        visited.add(childId);
        nodeLayers.set(childId, layer + 1);
        queue.push({ id: childId, layer: layer + 1 });
      } else {
        // Update to max layer if already visited
        const existing = nodeLayers.get(childId) || 0;
        if (layer + 1 > existing) {
          nodeLayers.set(childId, layer + 1);
        }
      }
    });
  }
  
  // Handle any remaining unvisited nodes
  nodes.forEach(n => {
    if (!nodeLayers.has(n.id)) {
      nodeLayers.set(n.id, 0);
    }
  });
  
  // Group nodes by layer
  const layers: Map<number, string[]> = new Map();
  nodeLayers.forEach((layer, nodeId) => {
    if (!layers.has(layer)) layers.set(layer, []);
    layers.get(layer)!.push(nodeId);
  });
  
  // Sort nodes within each layer by their connections for better layout
  const sortedLayerNodes: number[] = Array.from(layers.keys()).sort((a, b) => a - b);
  
  // Position nodes
  const START_X = 50;
  const START_Y = 50;
  
  sortedLayerNodes.forEach(layer => {
    const layerNodes = layers.get(layer) || [];
    const layerHeight = layerNodes.length * (NODE_HEIGHT + VERTICAL_GAP);
    const startY = START_Y + (layer * 180) + Math.max(0, (layerHeight - NODE_HEIGHT) / 2);
    
    layerNodes.forEach((nodeId, index) => {
      const x = START_X + layer * (NODE_WIDTH + HORIZONTAL_GAP);
      const y = startY + index * (NODE_HEIGHT + VERTICAL_GAP);
      nodePositions.set(nodeId, { x, y });
    });
  });
  
  return nodePositions;
}

interface LocalKnowledgeGraphProps {
  searchQuery?: string;
  onLoadingChange?: (isLoading: boolean) => void;
}

export interface LocalKnowledgeGraphRef {
  exportToPng: () => Promise<string | null>;
}

export const LocalKnowledgeGraph = forwardRef<LocalKnowledgeGraphRef, LocalKnowledgeGraphProps>(function LocalKnowledgeGraph({ searchQuery = '', onLoadingChange }, ref) {
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLearnedOnly, setShowLearnedOnly] = useState(false);
  const [selectedNode, setSelectedNode] = useState<{ id: string; name: string; x: number; y: number; isKnown: boolean } | null>(null);
  
  const graphRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();

  const [nodes, setNodes, onNodesChange] = useNodesState([] as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([] as Edge[]);

  // Export function exposed via ref
  const exportToPng = useCallback(async (): Promise<string | null> => {
    if (!graphRef.current) {
      console.error('Graph ref not available');
      return null;
    }
    
    try {
      // Get the ReactFlow viewport element
      const flowElement = graphRef.current.querySelector('.react-flow') as HTMLElement;
      if (!flowElement) {
        console.error('ReactFlow element not found');
        return null;
      }
      
      const dataUrl = await toPng(flowElement, {
        backgroundColor: '#f8fafc',
        pixelRatio: 2,
        filter: (node) => {
          // Exclude controls and minimap from export
          if (node.classList?.contains('react-flow__controls')) return false;
          if (node.classList?.contains('react-flow__minimap')) return false;
          return true;
        },
      });
      
      return dataUrl;
    } catch (err) {
      console.error('Export failed:', err);
      return null;
    }
  }, []);

  // Expose export function via ref
  useImperativeHandle(ref, () => ({ exportToPng }), [exportToPng]);

  useEffect(() => {
    let cancelled = false;
    
    const fetchGraph = async () => {
      try {
        const res = await api.get('/api/local-graph');
        const data = await res.json();
        console.log('[LocalKnowledgeGraph] Response status:', res.status);
        if (!cancelled && data.success) {
          console.log('[LocalKnowledgeGraph] First node x:', data.data.nodes[0]?.x, 'y:', data.data.nodes[0]?.y);
          setGraphData(data.data);
          setLoading(false);
          onLoadingChange?.(false);
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error('[LocalKnowledgeGraph] Error:', err?.message);
          setError('Failed to load knowledge graph');
          setLoading(false);
        }
      }
    };

    fetchGraph();
    
    return () => {
      cancelled = true;
    };
  }, []);

    // Generate layout when graphData or filter changes
  useEffect(() => {
    if (!graphData) return;

    const { nodes, edges: graphEdges, knownNodes, nodeMasteries = {} } = graphData;
    
    // Filter nodes based on learned filter
    let filteredNodes = showLearnedOnly 
      ? nodes.filter(node => knownNodes.includes(node.id))
      : nodes;
    
    // Filter nodes based on search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filteredNodes = filteredNodes.filter(
        node => 
          node.id.toLowerCase().includes(query) || 
          (node.name && node.name.toLowerCase().includes(query))
      );
    }
    
    // Filter edges to only include those connecting visible nodes
    const visibleNodeIds = new Set(filteredNodes.map(n => n.id));
    const filteredEdges = graphEdges.filter(
      edge => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)
    );
     
    // Use stored x,y positions from the node data
    const nodePosMap = new Map(filteredNodes.map(n => [n.id, { x: n.x || 0, y: n.y || 0 }]));
     
    // Create nodes with absolute positions
    const flowNodes: Node[] = filteredNodes.map(node => {
      const pos = nodePosMap.get(node.id) || { x: 0, y: 0 };
      const isKnown = knownNodes.includes(node.id);
      const mastery = nodeMasteries[node.id] || 0;
      const civilization = getNodeCivilization(node.id, node.domain);
      
      return {
        id: node.id,
        type: 'custom',
        position: pos,
        data: {
          id: node.id,
          name: node.name || node.id,
          isKnown,
          mastery,
          civilization,
        },
      };
    });
    
    console.log(`[DEBUG] Created ${flowNodes.length} nodes, first: ${flowNodes[0]?.position.x}, ${flowNodes[0]?.position.y}`);

    // Create edges with bezier curves - offset them to avoid overlap
    const flowEdges: Edge[] = filteredEdges.map((edge, index) => {
      const sourcePos = nodePosMap.get(edge.source);
      const targetPos = nodePosMap.get(edge.target);
      
      // Calculate curvature based on vertical distance
      let curvature = 0.3;
      let sourceY = 30; // Center of node height
      let targetY = 30;
      
      if (sourcePos && targetPos) {
        const dy = targetPos.y - sourcePos.y;
        const dx = targetPos.x - sourcePos.x;
        
        // If nodes are at similar x but different y, add more curve
        if (Math.abs(dy) > 50 && dx > 0) {
          curvature = Math.min(0.5, Math.abs(dy) / 500);
        }
        
        // Add slight vertical offset to separate multiple edges from same source
        const edgesFromSource = graphEdges.filter(e => e.source === edge.source);
        const edgeIdx = edgesFromSource.indexOf(edge);
        if (edgesFromSource.length > 1) {
          const offset = (edgeIdx - (edgesFromSource.length - 1) / 2) * 15;
          sourceY += offset;
          targetY += offset;
        }
      }
      
      return {
        id: `e${index}`,
        source: edge.source,
        target: edge.target,
        label: edge.label,
        type: 'step',  // Step curves for distinct paths
        animated: true,
        style: { 
          stroke: '#94a3b8', 
          strokeWidth: 2,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#94a3b8',
        },
        zIndex: -1,
        labelBgStyle: { fill: '#fff', stroke: '#fff', strokeWidth: 1 },
        labelStyle: { fontSize: 9, fill: '#64748b' },
        labelBgPadding: [4, 2] as [number, number],
        labelBgBorderRadius: 2,
      };
    });

    setNodes(flowNodes);
    setEdges(flowEdges);
  }, [graphData, showLearnedOnly, searchQuery, setNodes, setEdges]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading knowledge tree...</div>
      </div>
    );
  }

  if (error || !graphData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">{error || 'No data'}</div>
      </div>
    );
  }

  const knownNodes: string[] = [];

  return (
    <div ref={graphRef} className="h-[85vh] w-full border rounded-lg overflow-hidden bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700" style={{ touchAction: 'none' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        nodeExtent={[[0, 0], [GRAPH_BOUNDS.width, GRAPH_BOUNDS.height]]}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={(_, node) => {
          setSelectedNode({
            id: node.id,
            name: (node.data?.name as string) || node.id,
            x: Math.max(0, Math.min(node.position.x + 160, 600)),
            y: node.position.y,
            isKnown: knownNodes.includes(node.id)
          });
        }}
        defaultViewport={{ x: 0, y: 0, zoom: ZOOM_CONFIG.DEFAULT_ZOOM }}
        minZoom={ZOOM_CONFIG.MIN_ZOOM}
        maxZoom={ZOOM_CONFIG.MAX_ZOOM}
        nodesDraggable={false}
        fitView
        fitViewOptions={{ padding: 0.1 }}
        proOptions={{ hideAttribution: true }}
        className={theme === 'dark' ? 'dark' : ''}
      >
        <Background gap={24} color={theme === 'dark' ? '#334155' : '#e2e8f0'} />
        <Controls className="!bg-white dark:!bg-slate-800 !border-slate-200 dark:!border-slate-700" />
        <MiniMap nodeStrokeWidth={3} className="!bg-white dark:!bg-slate-800" />
        
        {Object.entries(CIVILIZATION_GROUPS).map(([key, group]) => (
          <div
            key={key}
            className="absolute pointer-events-none"
            style={{
              left: group.x - 1200,
              top: group.y - 1200,
              width: 2400,
              height: 2400,
            }}
          >
            <div
              className="w-full h-full rounded-full opacity-25"
              style={{
                backgroundColor: group.color,
                border: `4px solid ${group.borderColor}`,
              }}
            />
            <div
              className="absolute"
              style={{
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                textShadow: '0 2px 8px rgba(255,255,255,1), 0 0 20px rgba(255,255,255,0.8)',
              }}
            >
              <span
                className="text-3xl font-bold px-5 py-2.5 rounded-xl backdrop-blur-sm"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.95)',
                  border: `3px solid ${group.borderColor}`,
                  color: group.borderColor,
                  boxShadow: `0 8px 32px ${group.color}`,
                }}
              >
                {group.label}
              </span>
            </div>
          </div>
        ))}
        
        <Panel position="top-left" className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-lg m-3 text-slate-800 dark:text-slate-200 max-w-xs">
          <h3 className="font-semibold mb-2 text-sm">Knowledge Tree</h3>
          <div className="space-y-1 text-xs mb-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ background: NODE_COLORS.known }}></div>
              <span>Learned ({knownNodes.length})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ background: NODE_COLORS.unknown }}></div>
              <span>Not Yet Learned ({graphData.nodes.length - knownNodes.length})</span>
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs cursor-pointer mb-3">
            <input
              type="checkbox"
              checked={showLearnedOnly}
              onChange={(e) => setShowLearnedOnly(e.target.checked)}
              className="rounded"
            />
            Show learned only
          </label>
          <div className="border-t border-slate-200 dark:border-slate-600 pt-2 mt-2">
            <h4 className="font-semibold text-xs mb-2">Civilizations</h4>
            <div className="space-y-1">
              {Object.entries(CIVILIZATION_GROUPS).map(([key, group]) => (
                <div key={key} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded border-2" 
                    style={{ borderColor: group.borderColor, backgroundColor: group.color }}
                  />
                  <span className="text-[10px]">{group.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="border-t border-slate-200 dark:border-slate-600 pt-2 mt-2">
            <h4 className="font-semibold text-xs mb-1">Triangle Layout</h4>
            <div className="grid grid-cols-2 gap-1 text-[10px]">
              <div className="text-slate-600 dark:text-slate-400">Top:</div>
              <div>China</div>
              <div className="text-slate-600 dark:text-slate-400">Bottom Left:</div>
              <div>Japan</div>
              <div className="text-slate-600 dark:text-slate-400">Bottom Right:</div>
              <div>India</div>
            </div>
            <div className="mt-2 text-[9px] text-slate-500 dark:text-slate-400 italic">
              Korea, SE Asia & Steppe nodes grouped by cultural affinity
            </div>
          </div>
        </Panel>

        {/* Click Popup for Learned Nodes - floats at node position */}
        {selectedNode && (
          <div 
            className="absolute z-50"
            style={{
              left: selectedNode.x,
              top: selectedNode.y,
              transform: 'translateY(-50%)',
            }}
          >
            <div 
              className="relative backdrop-blur-xl bg-white/70 dark:bg-slate-800/70 rounded-2xl shadow-2xl border border-white/20 dark:border-slate-600/30 p-3 min-w-[200px] animate-in fade-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Glossy shine effect */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/30 to-transparent pointer-events-none" />
              
              {/* Close button */}
              <button 
                onClick={() => setSelectedNode(null)}
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 flex items-center justify-center shadow-md transition-all group"
              >
                <X className="h-3 w-3 text-slate-600 dark:text-slate-300" />
              </button>
              
              {/* Node badge */}
              <div className="flex items-center gap-2 mb-2">
                {selectedNode.isKnown ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-medium flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    Learned
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-xs font-medium flex items-center gap-1">
                    Not Learnt
                  </span>
                )}
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{selectedNode.id}</span>
              </div>
              
              {/* Action buttons - only show for learned nodes */}
              {selectedNode.isKnown && (
                <div className="grid grid-cols-4 gap-1.5">
                  <Link 
                    href={`/flashcards/${selectedNode.id}`}
                    className="flex flex-col items-center gap-1 p-2 rounded-xl bg-gradient-to-b from-blue-50 to-blue-100 dark:from-blue-900/40 dark:to-blue-900/20 hover:from-blue-100 hover:to-blue-150 dark:hover:from-blue-900/60 dark:hover:to-blue-900/40 transition-all group border border-blue-200/50 dark:border-blue-700/30"
                  >
                    <Layers className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-[10px] font-semibold text-blue-700 dark:text-blue-300">Cards</span>
                  </Link>
                  <Link 
                    href={`/quiz/topic/${selectedNode.id}`}
                    className="flex flex-col items-center gap-1 p-2 rounded-xl bg-gradient-to-b from-violet-50 to-violet-100 dark:from-violet-900/40 dark:to-violet-900/20 hover:from-violet-100 hover:to-violet-150 dark:hover:from-violet-900/60 dark:hover:to-violet-900/40 transition-all group border border-violet-200/50 dark:border-violet-700/30"
                  >
                    <HelpCircle className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                    <span className="text-[10px] font-semibold text-violet-700 dark:text-violet-300">Quiz</span>
                  </Link>
                  <Link 
                    href={`/review/cheat-sheet/${selectedNode.id}`}
                    className="flex flex-col items-center gap-1 p-2 rounded-xl bg-gradient-to-b from-amber-50 to-amber-100 dark:from-amber-900/40 dark:to-amber-900/20 hover:from-amber-100 hover:to-amber-150 dark:hover:from-amber-900/60 dark:hover:to-amber-900/40 transition-all group border border-amber-200/50 dark:border-amber-700/30"
                  >
                    <FileText className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300">Cheat</span>
                  </Link>
                  <Link 
                    href={`/review/notes/${selectedNode.id}`}
                    className="flex flex-col items-center gap-1 p-2 rounded-xl bg-gradient-to-b from-emerald-50 to-emerald-100 dark:from-emerald-900/40 dark:to-emerald-900/20 hover:from-emerald-100 hover:to-emerald-150 dark:hover:from-emerald-900/60 dark:hover:to-emerald-900/40 transition-all group border border-emerald-200/50 dark:border-emerald-700/30"
                  >
                    <BookOpen className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">Notes</span>
                  </Link>
                </div>
              )}
            </div>
            
            {/* Floating triangle pointer */}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full">
              <div className="w-0 h-0 border-y-8 border-r-8 border-y-transparent border-r-white/70 dark:border-r-slate-800/70" />
            </div>
          </div>
        )}
      </ReactFlow>
    </div>
  );
});
