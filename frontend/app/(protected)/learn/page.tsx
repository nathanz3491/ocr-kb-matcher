'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Navigation } from '@/components/navigation/Navigation';
import { BookOpen, CheckCircle, Circle, Play, Trophy, Target, Loader2, Brain, Sparkles, Layers } from 'lucide-react';
import Link from 'next/link';

interface KnowledgeNode {
  id: string;
  label: string;
  category: string;
  status: 'known' | 'unknown' | 'current';
}

interface Recommendation {
  nodeId: string;
  name: string;
  domain: string;
  reason: string;
  prerequisites: string[];
}

function LearningHubContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const highlightedRef = useRef<HTMLDivElement>(null);
  
  const [learnedNodes, setLearnedNodes] = useState<KnowledgeNode[]>([]);
  const [unknownNodes, setUnknownNodes] = useState<KnowledgeNode[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingQuiz, setGeneratingQuiz] = useState<string | null>(null);
  const [showAllTopics, setShowAllTopics] = useState(false);
  const [highlightedNode, setHighlightedNode] = useState<string | null>(null);

  const searchQuery = searchParams.get('search');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (searchQuery && !loading) {
      setHighlightedNode(searchQuery);
      setTimeout(() => {
        const element = document.getElementById(`node-${searchQuery}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 500);
      setTimeout(() => {
        setHighlightedNode(null);
      }, 5000);
    }
  }, [searchQuery, loading]);

  useEffect(() => {
    if (highlightedNode) {
      console.log(`🔍 Found: ${highlightedNode}`);
    }
  }, [highlightedNode]);

  const fetchData = async () => {
    try {
      const [graphRes, recsRes] = await Promise.all([
        api.get('/api/local-graph'),
        api.get('/api/recommendations')
      ]);

      const [graphJson, recsJson] = await Promise.all([graphRes.json(), recsRes.json()]);

      if (graphJson.success) {
        const knownNodes: string[] = graphJson.data.knownNodes || [];
        const nodes: KnowledgeNode[] = graphJson.data.nodes.map((n: any) => ({
          id: n.id,
          label: n.name || n.label || n.id,
          category: n.domain || n.category || 'General',
          status: knownNodes.includes(n.id) ? 'known' as const : 'unknown' as const,
        }));
        setLearnedNodes(nodes.filter(n => n.status === 'known'));
        setUnknownNodes(nodes.filter(n => n.status === 'unknown'));
      }

      if (recsJson.success) {
        setRecommendations(recsJson.data);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const startQuiz = async (nodeId: string) => {
    setGeneratingQuiz(nodeId);
    try {
      router.push(`/quiz/topic/${nodeId}`);
    } catch (err) {
      console.error('Error starting quiz:', err);
      setGeneratingQuiz(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <Navigation />
        <div className="flex h-[calc(100vh-56px)] items-center justify-center">
          <div className="text-center">
            <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-blue-600 dark:text-blue-400" />
            <p className="text-slate-600 dark:text-slate-400">Loading your learning hub...</p>
          </div>
        </div>
      </div>
    );
  }

  const topRecommendation = recommendations[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <Navigation />

      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Learning Hub</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Track your progress, practice what you've learned, and discover what to study next.
          </p>
        </div>

        {/* Top Recommendation Banner */}
        {topRecommendation && (
          <div className="mb-8 rounded-2xl border border-amber-200 dark:border-amber-700/50 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 p-6 shadow-lg dark:shadow-slate-900/30">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <Target className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  <span className="text-sm font-medium uppercase tracking-wide text-amber-700 dark:text-amber-300">
                    Recommended for You
                  </span>
                </div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                  {topRecommendation.nodeId}: {topRecommendation.name}
                </h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{topRecommendation.reason}</p>
                <span className="mt-2 inline-block rounded-full bg-amber-100 dark:bg-amber-800 px-3 py-1 text-xs font-medium text-amber-700 dark:text-amber-300">
                  {topRecommendation.domain}
                </span>
              </div>
              <button
                onClick={() => startQuiz(topRecommendation.nodeId)}
                disabled={generatingQuiz === topRecommendation.nodeId}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-3 font-medium text-white shadow-md transition-all hover:from-amber-600 hover:to-orange-600 disabled:opacity-50"
              >
                {generatingQuiz === topRecommendation.nodeId ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Play className="h-5 w-5" />
                )}
                Start Practice Quiz
              </button>
            </div>
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Learned Topics */}
          <div className="rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-6 shadow-lg dark:shadow-slate-900/30 backdrop-blur-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-xl font-bold text-slate-800 dark:text-white">
                <Sparkles className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                Topics Covered
              </h2>
              <span className="rounded-full bg-amber-100 dark:bg-amber-900/50 px-3 py-1 text-sm font-medium text-amber-700 dark:text-amber-300">
                {learnedNodes.length} topics
              </span>
            </div>

            {learnedNodes.length === 0 ? (
              <div className="rounded-xl bg-slate-50 dark:bg-slate-700/50 p-8 text-center">
                <BookOpen className="mx-auto mb-3 h-12 w-12 text-slate-300 dark:text-slate-500" />
                <p className="text-slate-600 dark:text-slate-400">You haven't marked any topics as learned yet.</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-500">
                  Upload documents and mark topics to see them here.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                {learnedNodes.map((node) => (
                  <div
                    id={`node-${node.id}`}
                    key={node.id}
                    ref={highlightedNode === node.id ? highlightedRef : null}
                    className={`flex items-center justify-between rounded-xl border p-4 transition-all duration-500 ${
                      highlightedNode === node.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 ring-2 ring-blue-500 ring-offset-2 shadow-lg shadow-blue-500/30'
                        : 'border-amber-100 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-900/20'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                        highlightedNode === node.id ? 'bg-blue-500' : 'bg-amber-100 dark:bg-amber-900/50'
                      }`}>
                        {highlightedNode === node.id ? (
                          <Sparkles className="h-5 w-5 text-white animate-pulse" />
                        ) : (
                          <CheckCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                        )}
                      </div>
                      <div>
                        <p className={`font-medium ${
                          highlightedNode === node.id ? 'text-blue-700 dark:text-blue-300' : 'text-slate-800 dark:text-slate-200'
                        }`}>{node.label}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{node.category}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => startQuiz(node.id)}
                        disabled={generatingQuiz === node.id}
                        className={`flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium shadow-sm transition-all hover:bg-amber-100 dark:hover:bg-amber-900/50 disabled:opacity-50 ${
                          highlightedNode === node.id ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-white dark:bg-slate-700 text-amber-700 dark:text-amber-300'
                        }`}
                      >
                        {generatingQuiz === node.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                        Quiz
                      </button>
                      <Link
                        href={`/flashcards/${node.id}`}
                        className={`flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium shadow-sm transition-all hover:bg-emerald-100 dark:hover:bg-emerald-900/50 ${
                          highlightedNode === node.id ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300'
                        }`}
                      >
                        <Layers className="h-4 w-4" />
                        Cards
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recommended Topics */}
          <div className="rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-6 shadow-lg dark:shadow-slate-900/30 backdrop-blur-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-xl font-bold text-slate-800 dark:text-white">
                <Brain className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                Recommended Next Steps
              </h2>
              <span className="rounded-full bg-violet-100 dark:bg-violet-900/50 px-3 py-1 text-sm font-medium text-violet-700 dark:text-violet-300">
                {recommendations.length} topics
              </span>
            </div>

            {recommendations.length === 0 ? (
              <div className="rounded-xl bg-slate-50 dark:bg-slate-700/50 p-8 text-center">
                <Trophy className="mx-auto mb-3 h-12 w-12 text-slate-300 dark:text-slate-500" />
                <p className="text-slate-600 dark:text-slate-400">You've learned all available topics!</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-500">
                  Great job! Check back later for new content.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                {recommendations.map((rec, index) => (
                  <div
                    key={rec.nodeId}
                    id={`node-${rec.nodeId}`}
                    className={`rounded-xl border p-4 transition-all duration-500 ${
                      highlightedNode === rec.nodeId
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 ring-2 ring-blue-500 ring-offset-2 shadow-lg'
                        : index === 0
                          ? 'border-amber-200 dark:border-amber-700/50 bg-amber-50/50 dark:bg-amber-900/20'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${
                          highlightedNode === rec.nodeId 
                            ? 'bg-blue-500' 
                            : index === 0 
                              ? 'bg-amber-100 dark:bg-amber-900/50' 
                              : 'bg-slate-100 dark:bg-slate-700'
                        }`}>
                          {highlightedNode === rec.nodeId ? (
                            <Sparkles className="h-5 w-5 text-white animate-pulse" />
                          ) : index === 0 ? (
                            <Target className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                          ) : (
                            <Circle className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                          )}
                        </div>
                        <div>
                          <p className={`font-medium ${
                            highlightedNode === rec.nodeId ? 'text-blue-700 dark:text-blue-300' : 'text-slate-800 dark:text-slate-200'
                          }`}>
                            {rec.nodeId}: {rec.name}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{rec.domain}</p>
                          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{rec.reason}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => startQuiz(rec.nodeId)}
                          disabled={generatingQuiz === rec.nodeId}
                          className={`flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium shadow-sm transition-all disabled:opacity-50 ${
                            highlightedNode === rec.nodeId
                              ? 'bg-blue-500 text-white hover:bg-blue-600'
                              : index === 0
                                ? 'bg-amber-500 text-white hover:bg-amber-600'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                          }`}
                        >
                          {generatingQuiz === rec.nodeId ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                          Practice
                        </button>
                        <Link
                          href={`/flashcards/${rec.nodeId}`}
                          className={`flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium shadow-sm transition-all ${
                            highlightedNode === rec.nodeId
                              ? 'bg-blue-500 text-white hover:bg-blue-600'
                              : index === 0
                                ? 'bg-amber-500 text-white hover:bg-amber-600'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                          }`}
                        >
                          <Layers className="h-4 w-4" />
                          Cards
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* All Topics Section */}
        <div className="mt-8 rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-6 shadow-lg dark:shadow-slate-900/30 backdrop-blur-sm">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-slate-800 dark:text-white">
            <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            All Available Topics
          </h2>
          
          {unknownNodes.length === 0 ? (
            <p className="text-center text-slate-500 dark:text-slate-400">All topics have been learned!</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {unknownNodes.slice(0, showAllTopics ? undefined : 12).map((node) => (
                <div
                  key={node.id}
                  id={`node-${node.id}`}
                  className={`flex items-center justify-between rounded-lg border p-3 transition-all duration-500 ${
                    highlightedNode === node.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 ring-2 ring-blue-500 ring-offset-2 shadow-lg'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {highlightedNode === node.id ? (
                      <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400 animate-pulse" />
                    ) : (
                      <Circle className="h-4 w-4 text-slate-300 dark:text-slate-600" />
                    )}
                    <span className={`text-sm ${
                      highlightedNode === node.id ? 'text-blue-700 dark:text-blue-300 font-medium' : 'text-slate-700 dark:text-slate-300'
                    }`}>{node.label}</span>
                  </div>
                  <button
                    onClick={() => startQuiz(node.id)}
                    disabled={generatingQuiz === node.id}
                    className={`rounded-md px-2 py-1 text-xs font-medium transition-all disabled:opacity-50 ${
                      highlightedNode === node.id 
                        ? 'bg-blue-500 text-white hover:bg-blue-600' 
                        : 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50'
                    }`}
                  >
                    {generatingQuiz === node.id ? '...' : 'Quiz'}
                  </button>
                </div>
              ))}
            </div>
          )}
          
          {unknownNodes.length > 12 && (
            <div className="mt-4 flex justify-center">
              <button
                onClick={() => setShowAllTopics(prev => !prev)}
                className="rounded-lg px-4 py-2 text-sm font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800 transition-all"
              >
                {showAllTopics ? `Show Less` : `Show All ${unknownNodes.length} Topics`}
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 dark:border-slate-100 mx-auto mb-4"></div>
        <p className="text-slate-500 dark:text-slate-400">Loading learning hub...</p>
      </div>
    </div>
  );
}

export default function LearningHubPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <LearningHubContent />
    </Suspense>
  );
}
