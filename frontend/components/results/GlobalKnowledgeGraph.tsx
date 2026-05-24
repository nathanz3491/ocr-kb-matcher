'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import axios from 'axios';
import { GraphData, GraphNode } from '@/types/graph';
import { renderMarkdown } from '@/lib/utils';
import { useTheme } from '@/components/theme/ThemeProvider';
import Link from 'next/link';
import { Layers, FileText, BookOpen, HelpCircle, X, Sparkles } from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

const nodeColors: Record<string, string> = {
  concept: '#0ea5e9',
  entity: '#10b981',
  process: '#f59e0b',
  known: '#10b981',
  unknown: '#ef4444',
  current: '#f59e0b',
};

interface GlobalKnowledgeGraphProps {
  highlightJobId?: string;
  showStatistics?: boolean;
}

interface GraphStatistics {
  totalJobs: number;
  totalNodes: number;
  totalEdges: number;
  nodeTypeDistribution: Record<string, number>;
}

export function GlobalKnowledgeGraph({ highlightJobId, showStatistics = true }: GlobalKnowledgeGraphProps) {
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [statistics, setStatistics] = useState<GraphStatistics | null>(null);
  const [knownNodes, setKnownNodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [clickedNode, setClickedNode] = useState<{ id: string; name: string; x: number; y: number; isKnown: boolean } | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [graphRes, statsRes, progressRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/knowledge-graph`),
          axios.get(`${API_BASE_URL}/api/knowledge-graph/statistics`),
          axios.get(`${API_BASE_URL}/api/user-progress`),
        ]);
        
        if (graphRes.data.success) {
          setGraphData(graphRes.data.data);
        }
        if (statsRes.data.success) {
          setStatistics(statsRes.data.data);
        }
        if (progressRes.data.success) {
          setKnownNodes(progressRes.data.data.knownNodes || []);
        }
      } catch (err) {
        setError('Failed to load knowledge graph');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Move callback before conditional returns
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    if (!graphData) return;
    const graphNode = graphData.nodes.find((n) => n.id === node.id);
    const isKnown = knownNodes.includes(node.id);
    
    // Show popup for all nodes - clamp x to keep popup within viewport on mobile
    const popupX = Math.max(0, Math.min(node.position.x + 200, 600));
    setClickedNode({
      id: node.id,
      name: graphNode?.data?.label || node.id,
      x: popupX,
      y: node.position.y,
      isKnown
    });
    // Clear info panel
    setSelectedNode(null);
  }, [graphData, knownNodes]);

  // Conditional returns after all hooks
  if (loading) {
    return (
      <div className="flex h-[600px] items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="text-slate-600">Loading knowledge graph...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex h-[600px] items-center justify-center">
        <div className="text-center text-red-600">
          <p>Error: {error}</p>
        </div>
      </div>
    );
  }
  
  if (!graphData) {
    return (
      <div className="flex h-[600px] items-center justify-center">
        <div className="text-center text-slate-500">
          <p>No knowledge graph data available</p>
        </div>
      </div>
    );
  }

  const nodes: Node[] = graphData.nodes.map((node) => ({
    id: node.id,
    type: 'default',
    position: node.position || { x: 0, y: 0 },
    data: node.data,
    style: {
      background: knownNodes.includes(node.id) ? nodeColors.known : (nodeColors[node.type] || '#64748b'),
      color: '#fff',
      border: highlightJobId && node.data?.sources?.includes(highlightJobId) ? '3px solid #fbbf24' : (knownNodes.includes(node.id) ? '3px solid #059669' : 'none'),
      borderRadius: '8px',
      padding: '10px',
      fontSize: '14px',
      fontWeight: 500,
    },
  }));

  const edges: Edge[] = graphData.edges.map((edge, index) => ({
    id: edge.id || `edge-${index}`,
    source: edge.source,
    target: edge.target,
    label: edge.label,
    animated: edge.animated ?? true,
    style: { stroke: '#64748b' },
  }));

  return (
    <div className="h-[600px] w-full border rounded-lg overflow-hidden relative bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700" style={{ touchAction: 'none' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodeClick={onNodeClick}
        fitView
        minZoom={0.1}
        maxZoom={2}
        nodesDraggable={false}
      >
        <Background color={theme === 'dark' ? '#334155' : '#e2e8f0'} />
        <Controls className="!bg-white dark:!bg-slate-800 !border-slate-200 dark:!border-slate-700" />
        <MiniMap nodeStrokeWidth={3} className="!bg-white dark:!bg-slate-800" />
        
        {showStatistics && statistics && (
          <Panel position="top-left" className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-lg m-4 text-slate-800 dark:text-slate-200">
            <h3 className="font-semibold text-lg mb-2">Knowledge Graph Statistics</h3>
            <div className="text-sm space-y-1">
              <p>Total Jobs: {statistics.totalJobs}</p>
              <p>Total Nodes: {statistics.totalNodes}</p>
              <p>Total Edges: {statistics.totalEdges}</p>
            </div>
          </Panel>
        )}
        
        {selectedNode && !clickedNode && (
          <Panel position="top-right" className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-lg m-4 max-w-xs text-slate-800 dark:text-slate-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-lg">{selectedNode.data?.label}</h3>
              <button onClick={() => setSelectedNode(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2" dangerouslySetInnerHTML={{ __html: renderMarkdown(selectedNode.data?.description || '') }} />
            <div className="text-xs text-slate-500 dark:text-slate-400">
              <span className="inline-block px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded">{selectedNode.type}</span>
              {selectedNode.data?.category && (
                <span className="ml-2 inline-block px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded">{selectedNode.data.category}</span>
              )}
            </div>
          </Panel>
        )}

        {/* Click Popup for Learned Nodes - floats at node position */}
        {clickedNode && (
          <div 
            className="absolute z-50"
            style={{
              left: clickedNode.x,
              top: clickedNode.y,
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
                onClick={() => setClickedNode(null)}
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 flex items-center justify-center shadow-md transition-all group"
              >
                <X className="h-3 w-3 text-slate-600 dark:text-slate-300" />
              </button>
              
              {/* Node badge */}
              <div className="flex items-center gap-2 mb-2">
                {clickedNode.isKnown ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-medium flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    Learned
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-xs font-medium flex items-center gap-1">
                    Not Learnt
                  </span>
                )}
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{clickedNode.id}</span>
              </div>
              
              {/* Action buttons - only show for learned nodes */}
              {clickedNode.isKnown && (
                <div className="grid grid-cols-4 gap-1.5">
                  <Link 
                    href={`/flashcards/${clickedNode.id}`}
                    className="flex flex-col items-center gap-1 p-2 rounded-xl bg-gradient-to-b from-blue-50 to-blue-100 dark:from-blue-900/40 dark:to-blue-900/20 hover:from-blue-100 hover:to-blue-150 dark:hover:from-blue-900/60 dark:hover:to-blue-900/40 transition-all group border border-blue-200/50 dark:border-blue-700/30"
                  >
                    <Layers className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-[10px] font-semibold text-blue-700 dark:text-blue-300">Cards</span>
                  </Link>
                  <Link 
                    href={`/quiz/topic/${clickedNode.id}`}
                    className="flex flex-col items-center gap-1 p-2 rounded-xl bg-gradient-to-b from-violet-50 to-violet-100 dark:from-violet-900/40 dark:to-violet-900/20 hover:from-violet-100 hover:to-violet-150 dark:hover:from-violet-900/60 dark:hover:to-violet-900/40 transition-all group border border-violet-200/50 dark:border-violet-700/30"
                  >
                    <HelpCircle className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                    <span className="text-[10px] font-semibold text-violet-700 dark:text-violet-300">Quiz</span>
                  </Link>
                  <Link 
                    href={`/review/cheat-sheet/${clickedNode.id}`}
                    className="flex flex-col items-center gap-1 p-2 rounded-xl bg-gradient-to-b from-amber-50 to-amber-100 dark:from-amber-900/40 dark:to-amber-900/20 hover:from-amber-100 hover:to-amber-150 dark:hover:from-amber-900/60 dark:hover:to-amber-900/40 transition-all group border border-amber-200/50 dark:border-amber-700/30"
                  >
                    <FileText className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300">Cheat</span>
                  </Link>
                  <Link 
                    href={`/review/notes/${clickedNode.id}`}
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
}
