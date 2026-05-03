'use client';

import { useState, useEffect } from 'react';
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
import { useTheme } from '@/components/theme/ThemeProvider';
import Link from 'next/link';
import { Layers, FileText, BookOpen, HelpCircle, X, Sparkles } from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

// Colors for known/unknown status
const NODE_COLORS = {
  known: '#10b981',      // Green - mastered
  unknown: '#ef4444',    // Red - not learned
  current: '#f59e0b',    // Yellow - from current job
};

interface KnowledgePoint {
  id: string;
  name: string;
  domain: string;
  prerequisites: string[];
  nextSteps: string[];
}

interface KnowledgeTrackedGraphProps {
  highlightJobId?: string;
}

export function KnowledgeTrackedGraph({ highlightJobId }: KnowledgeTrackedGraphProps) {
  const [knowledgeTree, setKnowledgeTree] = useState<KnowledgePoint[]>([]);
  const [knownNodes, setKnownNodes] = useState<string[]>([]);
  const [currentJobNodes, setCurrentJobNodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<{ id: string; name: string; domain: string; x: number; y: number; isKnown: boolean } | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch knowledge tree, user progress, and job match result
        const [treeRes, progressRes, jobRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/knowledge-tree`),
          axios.get(`${API_BASE_URL}/api/user-progress`),
          highlightJobId ? axios.get(`${API_BASE_URL}/api/jobs/${highlightJobId}`) : Promise.resolve(null)
        ]);

        if (treeRes.data.success) {
          setKnowledgeTree(treeRes.data.data);
        }
        
        if (progressRes.data.success) {
          setKnownNodes(progressRes.data.data.knownNodes);
        }
        
        // Get nodes matched in current job
        if (jobRes?.data?.success && jobRes.data.data.knowledgeMatch) {
          setCurrentJobNodes(
            jobRes.data.data.knowledgeMatch.matchedNodes.map((m: any) => m.nodeId)
          );
        }
      } catch (err) {
        console.error('Failed to fetch knowledge data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [highlightJobId]);

  if (loading) return <div>Loading knowledge tree...</div>;
  if (!knowledgeTree.length) return <div>No knowledge tree data. Build Neo4j database first.</div>;

  // Create React Flow nodes with positions
  const nodes: Node[] = knowledgeTree.map((point, index) => {
    const isKnown = knownNodes.includes(point.id);
    const isCurrent = currentJobNodes.includes(point.id);
    
    return {
      id: point.id,
      type: 'default',
      position: { 
        x: (index % 4) * 250, 
        y: Math.floor(index / 4) * 150 
      },
      data: { 
        label: `${point.id}: ${point.name}`,
        domain: point.domain
      },
      style: {
        // Color coding: Green=known, Red=unknown, Yellow=current
        background: isCurrent ? NODE_COLORS.current : (isKnown ? NODE_COLORS.known : NODE_COLORS.unknown),
        color: '#fff',
        border: '2px solid #fff',
        borderRadius: '8px',
        padding: '10px',
        fontSize: '12px'
      },
    };
  });

  // Create edges from REQUIRES relationships
  const edges: Edge[] = [];
  knowledgeTree.forEach(point => {
    point.prerequisites.forEach(preId => {
      edges.push({
        id: `${preId}-${point.id}`,
        source: preId,
        target: point.id,
        label: 'requires',
        animated: true,
        style: { stroke: '#94a3b8' }
      });
    });
  });

  const onNodeClick = (event: React.MouseEvent, node: Node) => {
    const isKnown = knownNodes.includes(node.id);
    const point = knowledgeTree.find(p => p.id === node.id);
    setSelectedNode({
      id: node.id,
      name: point?.name || node.id,
      domain: point?.domain || '',
      x: Math.max(0, Math.min(node.position.x + 200, 600)),
      y: node.position.y,
      isKnown
    });
  };

  return (
    <div className="h-[600px] w-full border rounded-lg overflow-hidden bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 relative" style={{ touchAction: 'none' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        minZoom={0.1}
        maxZoom={2}
        nodesDraggable={false}
        onNodeClick={onNodeClick}
      >
        <Background color={theme === 'dark' ? '#334155' : '#e2e8f0'} />
        <Controls className="!bg-white dark:!bg-slate-800 !border-slate-200 dark:!border-slate-700" />
        <MiniMap nodeStrokeWidth={3} className="!bg-white dark:!bg-slate-800" />
        
        <Panel position="top-left" className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-lg m-4 text-slate-800 dark:text-slate-200">
          <h3 className="font-semibold mb-2">Learning Progress</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ background: NODE_COLORS.known }}></div>
              <span>Known ({knownNodes.length})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ background: NODE_COLORS.unknown }}></div>
              <span>Unknown ({knowledgeTree.length - knownNodes.length})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ background: NODE_COLORS.current }}></div>
              <span>Current Question</span>
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
}
