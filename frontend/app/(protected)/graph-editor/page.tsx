'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Navigation } from '@/components/navigation/Navigation';
import { LocalKnowledgeGraph } from '@/components/results/LocalKnowledgeGraph';
import { 
  ArrowLeft, Search, Plus, Edit2, Trash2, X, GitBranch, 
  ChevronRight, Loader2, AlertTriangle, GitMerge
} from 'lucide-react';

interface EditorNode {
  id: string;
  name: string;
  description?: string;
  domain?: string;
  prerequisites: string[];
  nextSteps: string[];
  x?: number;
  y?: number;
}

interface RelationshipForm {
  source: string;
  target: string;
  label: string;
}

export default function GraphEditorPage() {
  const [nodes, setNodes] = useState<EditorNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingNode, setEditingNode] = useState<EditorNode | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showRelationshipModal, setShowRelationshipModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDomain, setFormDomain] = useState('');
  const [formPrerequisites, setFormPrerequisites] = useState<string[]>([]);
  const [formX, setFormX] = useState<number | undefined>(undefined);
  const [formY, setFormY] = useState<number | undefined>(undefined);
  const [positionPickerMode, setPositionPickerMode] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [relForm, setRelForm] = useState<RelationshipForm>({ source: '', target: '', label: '' });
  const [relError, setRelError] = useState<string | null>(null);

  const fetchNodes = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/graph-editor/nodes');
      const data = await res.json();
      if (data.success) {
        setNodes(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch nodes:', err);
      setError('Failed to load nodes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNodes();
  }, [fetchNodes]);

  const filteredNodes = nodes.filter(node => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      node.name.toLowerCase().includes(q) ||
      (node.description?.toLowerCase().includes(q)) ||
      (node.domain?.toLowerCase().includes(q)) ||
      node.id.toLowerCase().includes(q)
    );
  });

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formName.trim()) {
      errors.name = 'Name is required';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const resetForm = () => {
    setFormName('');
    setFormDescription('');
    setFormDomain('');
    setFormPrerequisites([]);
    setFormX(undefined);
    setFormY(undefined);
    setFormErrors({});
  };

  const handleAddNode = async () => {
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      const res = await api.post('/api/graph-editor/nodes', {
        name: formName.trim(),
        description: formDescription.trim() || undefined,
        domain: formDomain.trim() || undefined,
        prerequisites: formPrerequisites,
        x: formX,
        y: formY,
      });
      const data = await res.json();
      if (data.success) {
        resetForm();
        setShowAddForm(false);
        await fetchNodes();
      }
    } catch (err) {
      console.error('Failed to add node:', err);
      setFormErrors({ submit: 'Failed to create node' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateNode = async () => {
    if (!validateForm() || !editingNode) return;
    setSubmitting(true);
    try {
      const res = await api.put(`/api/graph-editor/nodes/${editingNode.id}`, {
        name: formName.trim(),
        description: formDescription.trim() || undefined,
        domain: formDomain.trim() || undefined,
        prerequisites: formPrerequisites,
        x: formX,
        y: formY,
      });
      const data = await res.json();
      if (data.success) {
        resetForm();
        setEditingNode(null);
        await fetchNodes();
      }
    } catch (err) {
      console.error('Failed to update node:', err);
      setFormErrors({ submit: 'Failed to update node' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteNode = async (id: string) => {
    try {
      await api.delete(`/api/graph-editor/nodes/${id}`);
      setShowDeleteConfirm(null);
      await fetchNodes();
    } catch (err) {
      console.error('Failed to delete node:', err);
      setShowDeleteConfirm(null);
    }
  };

  const handleAddRelationship = async () => {
    if (!relForm.source || !relForm.target) {
      setRelError('Please select both source and target nodes');
      return;
    }
    if (relForm.source === relForm.target) {
      setRelError('Source and target must be different');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post('/api/graph-editor/relationships', {
        source: relForm.source,
        target: relForm.target,
        label: relForm.label.trim() || undefined,
      });
      const data = await res.json();
      if (data.success) {
        setShowRelationshipModal(false);
        setRelForm({ source: '', target: '', label: '' });
        setRelError(null);
      }
    } catch {
      setRelError('Failed to create relationship');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditForm = (node: EditorNode) => {
    setFormName(node.name);
    setFormDescription(node.description || '');
    setFormDomain(node.domain || '');
    setFormPrerequisites(node.prerequisites || []);
    setFormX(node.x);
    setFormY(node.y);
    setFormErrors({});
    setEditingNode(node);
    setShowAddForm(false);
  };

  const closeEditForm = () => {
    setEditingNode(null);
    resetForm();
  };

  const closeAddForm = () => {
    setShowAddForm(false);
    resetForm();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <Navigation />
      
      <main className="mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/knowledge-graph">
              <Button variant="outline" size="sm" className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Graph Editor</h1>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => { setShowRelationshipModal(true); setRelError(null); }}
              className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm"
            >
              <GitMerge className="w-4 h-4 mr-2" />
              Add Relationship
            </Button>
            <Button 
              variant="default" 
              size="sm"
              onClick={() => { setShowAddForm(true); setEditingNode(null); resetForm(); }}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white border-transparent"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Node
            </Button>
          </div>
        </div>

        <div className="flex gap-6 h-[calc(100vh-12rem)]">
          <div className="w-[58%] flex flex-col gap-4 min-h-0">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex-1 overflow-hidden flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search nodes by name, description, or domain..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-700"
                  />
                </div>
                <span className="text-sm text-slate-500 dark:text-slate-400 shrink-0">
                  {filteredNodes.length} of {nodes.length}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {loading ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                  </div>
                ) : filteredNodes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-slate-400 dark:text-slate-500">
                    <GitBranch className="h-8 w-8 mb-2 opacity-50" />
                    <p className="text-sm">No nodes found</p>
                  </div>
                ) : (
                  filteredNodes.map((node) => (
                    <div
                      key={node.id}
                      className="group rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700/50 p-4 transition-all hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-slate-800 dark:text-white truncate">{node.name}</h3>
                            {node.domain && (
                              <span className="shrink-0 rounded-full bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                                {node.domain}
                              </span>
                            )}
                          </div>
                          {node.description && (
                            <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-2">
                              {node.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
                            <span className="font-mono bg-slate-100 dark:bg-slate-600 px-1.5 py-0.5 rounded">
                              {node.id}
                            </span>
                            {node.prerequisites.length > 0 && (
                              <span className="flex items-center gap-1">
                                <ChevronRight className="h-3 w-3" />
                                {node.prerequisites.length} prerequisite{node.prerequisites.length !== 1 ? 's' : ''}
                              </span>
                            )}
                            {node.nextSteps.length > 0 && (
                              <span>
                                {node.nextSteps.length} next step{node.nextSteps.length !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <button
                            onClick={() => openEditForm(node)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:text-blue-400 dark:hover:bg-blue-900/30 transition-colors"
                            title="Edit node"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(node.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-900/30 transition-colors"
                            title="Delete node"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="w-[42%] shrink-0">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden h-full">
              <LocalKnowledgeGraph
                searchQuery={searchQuery}
                positionPickerMode={positionPickerMode}
                onPositionPick={(x, y) => {
                  setFormX(Math.round(x));
                  setFormY(Math.round(y));
                  setPositionPickerMode(false);
                }}
                onNodeDragStop={async (nodeId, x, y) => {
                  try {
                    await api.patch(`/api/graph-editor/nodes/${nodeId}/position`, { x, y });
                  } catch {
                    console.error('Failed to save node position');
                  }
                }}
              />
            </div>
          </div>
        </div>
      </main>

      {(showAddForm || editingNode) && (
        <div className="fixed inset-0 z-50 flex items-start justify-start pointer-events-none pl-6 pt-6">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md max-h-[calc(100vh-3rem)] overflow-y-auto pointer-events-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                {editingNode ? 'Edit Node' : 'Add New Node'}
              </h2>
              <button
                onClick={editingNode ? closeEditForm : closeAddForm}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Node name"
                  className="w-full rounded-xl border px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-700"
                />
                {formErrors.name && (
                  <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {formErrors.name}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Domain
                </label>
                <input
                  type="text"
                  value={formDomain}
                  onChange={(e) => setFormDomain(e.target.value)}
                  placeholder="e.g., History, Science, Mathematics"
                  className="w-full rounded-xl border px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-700"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Description
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Brief description of this node..."
                  rows={3}
                  className="w-full rounded-xl border px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-700 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Prerequisites
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {formPrerequisites.map((pre, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 rounded-full bg-blue-100 dark:bg-blue-900/40 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300"
                    >
                      {pre}
                      <button
                        onClick={() => setFormPrerequisites(prev => prev.filter((_, i) => i !== idx))}
                        className="ml-0.5 hover:text-blue-900 dark:hover:text-blue-200"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value && !formPrerequisites.includes(e.target.value)) {
                      setFormPrerequisites(prev => [...prev, e.target.value]);
                    }
                  }}
                  className="w-full rounded-xl border px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-700"
                >
                  <option value="">Add prerequisite...</option>
                  {nodes
                    .filter(n => n.id !== editingNode?.id && !formPrerequisites.includes(n.id))
                    .map(n => (
                      <option key={n.id} value={n.id}>{n.name} ({n.id})</option>
                    ))
                  }
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Position
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <input
                      type="number"
                      value={formX ?? ''}
                      onChange={(e) => setFormX(e.target.value ? Number(e.target.value) : undefined)}
                      placeholder="X"
                      className="w-full rounded-xl border px-3 py-2 text-sm bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-700"
                    />
                  </div>
                  <div className="flex-1">
                    <input
                      type="number"
                      value={formY ?? ''}
                      onChange={(e) => setFormY(e.target.value ? Number(e.target.value) : undefined)}
                      placeholder="Y"
                      className="w-full rounded-xl border px-3 py-2 text-sm bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-700"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setPositionPickerMode(prev => !prev)}
                    className={cn(
                      'shrink-0 px-3 py-2 rounded-xl text-xs font-medium border transition-all',
                      positionPickerMode
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-blue-400 dark:hover:border-blue-500'
                    )}
                  >
                    {positionPickerMode ? 'Pick on graph...' : 'Pick'}
                  </button>
                </div>
                {positionPickerMode && (
                  <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">
                    Click anywhere on the graph to set position
                  </p>
                )}
              </div>

              {formErrors.submit && (
                <div className="flex items-center gap-2 rounded-xl bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600 dark:text-red-400">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {formErrors.submit}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 p-5 border-t border-slate-200 dark:border-slate-700">
              <Button
                variant="outline"
                size="sm"
                onClick={editingNode ? closeEditForm : closeAddForm}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={editingNode ? handleUpdateNode : handleAddNode}
                disabled={submitting}
                className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white border-transparent"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {editingNode ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  editingNode ? 'Update Node' : 'Create Node'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/30">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-sm mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Delete Node</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">
              Are you sure you want to delete this node? All associated relationships will also be removed.
            </p>
            <div className="flex items-center justify-end gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteConfirm(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDeleteNode(showDeleteConfirm)}
                className="bg-red-500 hover:bg-red-600 text-white border-transparent"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {showRelationshipModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/30">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">Add Relationship</h2>
              <button
                onClick={() => { setShowRelationshipModal(false); setRelError(null); }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Source Node
                </label>
                <select
                  value={relForm.source}
                  onChange={(e) => setRelForm(prev => ({ ...prev, source: e.target.value }))}
                  className="w-full rounded-xl border px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-700"
                >
                  <option value="">Select source node...</option>
                  {nodes.map(n => (
                    <option key={n.id} value={n.id}>{n.name} ({n.id})</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-center">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700">
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Target Node
                </label>
                <select
                  value={relForm.target}
                  onChange={(e) => setRelForm(prev => ({ ...prev, target: e.target.value }))}
                  className="w-full rounded-xl border px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-700"
                >
                  <option value="">Select target node...</option>
                  {nodes.map(n => (
                    <option key={n.id} value={n.id}>{n.name} ({n.id})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Label (optional)
                </label>
                <input
                  type="text"
                  value={relForm.label}
                  onChange={(e) => setRelForm(prev => ({ ...prev, label: e.target.value }))}
                  placeholder="e.g., requires, leads_to"
                  className="w-full rounded-xl border px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-700"
                />
              </div>

              {relError && (
                <div className="flex items-center gap-2 rounded-xl bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600 dark:text-red-400">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {relError}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 p-5 border-t border-slate-200 dark:border-slate-700">
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setShowRelationshipModal(false); setRelError(null); }}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleAddRelationship}
                disabled={submitting}
                className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white border-transparent"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Relationship'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
