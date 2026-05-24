'use client';

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Jobs" };

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

const ReactFlowGraph = dynamic(() => import('@/components/results/ReactFlowGraph').then(mod => ({ default: mod.ReactFlowGraph })), { ssr: false });

// Processing steps with labels and icons
const PROCESSING_STEPS = [
  { key: 'claim', label: 'Initializing', description: 'Job claimed and starting' },
  { key: 'validate', label: 'Validating', description: 'Validating file' },
  { key: 'ocr', label: 'OCR Processing', description: 'Extracting text from image' },
  { key: 'save_ocr_checkpoint', label: 'Saving OCR', description: 'Saving OCR results' },
  { key: 'query_kb', label: 'Loading Knowledge Base', description: 'Fetching knowledge graph' },
  { key: 'match', label: 'AI Matching', description: 'Matching content to knowledge' },
  { key: 'analyze_knowledge', label: 'Analyzing Difficulty', description: 'AI analyzing question difficulty' },
  { key: 'generate_graph', label: 'Generating Graph', description: 'Creating knowledge graph' },
  { key: 'generate_cards', label: 'Generating Cards', description: 'Creating flashcards' },
  { key: 'generate_cheatsheet', label: 'Generating Cheat Sheet', description: 'Creating cheat sheet' },
  { key: 'generate_review', label: 'Generating Review', description: 'Creating study notes' },
  { key: 'extract_wrong_questions', label: 'Extracting Questions', description: 'AI extracting wrong questions' },
  { key: 'generate_explanation', label: 'Generating Explanation', description: 'AI explaining wrong answers' },
  { key: 'generate_practice', label: 'Generating Practice', description: 'AI creating practice questions' },
  { key: 'save_results', label: 'Saving Results', description: 'Saving processed data' },
  { key: 'complete', label: 'Complete', description: 'Processing finished' },
];

interface Job {
  id: string;
  status: string;
  currentStep?: string;
  fileName: string;
  ocrText?: string;
  jobType?: 'SINGLE' | 'MULTIPLE' | 'WRONG_SINGLE' | 'WRONG_MULTIPLE';
  questions?: Array<{
    id: string;
    text: string;
    index: number;
  }>;
  questionResults?: Array<{
    questionId: string;
    questionText: string;
    matchedNodes: Array<{
      kbEntryId: string;
      confidence: number;
      reasoning: string;
      title?: string;
      category?: string;
      description?: string;
      ocrTextSpan: { excerpt: string };
    }>;
    status: 'pending' | 'matched' | 'failed';
    error?: string;
  }>;
  wrongResults?: Array<{
    questionId: string;
    questionIndex: number;
    questionText: string;
    explanation: string;
    practiceQuestions: Array<{
      id: string;
      type: 'multiple_choice';
      question: string;
      options: string[];
      correctAnswer: number;
      explanation: string;
    }>;
    status: 'pending' | 'explained' | 'failed';
    error?: string;
  }>;
  wrongQuestionIndices?: string;
  results?: Array<{
    kbEntryId: string;
    confidence: number;
    title?: string;
    category?: string;
    description?: string;
    ocrTextSpan: { excerpt: string };
    reasoning: string;
  }>;
  relationships?: Array<{ from: string; to: string; type: string }>;
  graphData?: GraphData;
  createdAt: string;
  error?: string;
}

export default function JobDetailPage() {
  const params = useParams();
  const jobId = params.id as string;
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'job-graph' | 'global-graph' | 'knowledge-tracked' | 'list'>('job-graph');
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());
  const [activeWrongIndex, setActiveWrongIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [revealedAnswers, setRevealedAnswers] = useState<Set<string>>(new Set());

  const handleAnswerSelect = (practiceId: string, optionIndex: number, isCorrect: boolean) => {
    setSelectedAnswers(prev => ({ ...prev, [practiceId]: optionIndex }));
    setRevealedAnswers(prev => new Set(prev).add(practiceId));
  };

  useEffect(() => {
    if (!(job?.jobType === 'WRONG_MULTIPLE' && (job.wrongResults?.length ?? 0) > 1)) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setActiveWrongIndex(i => Math.min((job.wrongResults?.length ?? 1) - 1, i + 1));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setActiveWrongIndex(i => Math.max(0, i - 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [job]);

  const toggleQuestion = (questionId: string) => {
    setExpandedQuestions(prev => {
      const next = new Set(prev);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  };

  useEffect(() => {
    let cancelled = false;
    let pollInterval: ReturnType<typeof setInterval> | null = null;

    const fetchFullJob = async () => {
      try {
        const response = await api.get(`/api/jobs/${jobId}`);
        if (cancelled) return;
        const json = await response.json();
        if (json.success) {
          setJob(json.data);
        } else {
          setError('Failed to fetch job');
        }
      } catch {
        if (!cancelled) setError('Error fetching job details');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const pollStatus = async () => {
      try {
        const response = await api.get(`/api/jobs/${jobId}/status`);
        if (cancelled) return;
        const json = await response.json();
        if (json.success) {
          const { status: newStatus, currentStep } = json.data;
          setJob(prev => prev ? { ...prev, status: newStatus, currentStep } : null);
          if (newStatus === 'completed' || newStatus === 'failed') {
            if (pollInterval) clearInterval(pollInterval);
            await fetchFullJob();
          }
        }
      } catch {
      }
    };

    fetchFullJob();
    pollInterval = setInterval(pollStatus, 2000);

    return () => {
      cancelled = true;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [jobId]);

  const getStepStatus = (stepKey: string, currentStep?: string) => {
    if (!currentStep) return 'pending';
    
    const currentIndex = PROCESSING_STEPS.findIndex(s => s.key === currentStep);
    const stepIndex = PROCESSING_STEPS.findIndex(s => s.key === stepKey);
    
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'pending';
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'completed':
        return { bg: 'bg-gradient-to-r from-emerald-500 to-teal-500', text: 'text-white', border: 'border-transparent', shadow: 'shadow-emerald-500/20' };
      case 'failed':
        return { bg: 'bg-gradient-to-r from-rose-500 to-pink-500', text: 'text-white', border: 'border-transparent', shadow: 'shadow-rose-500/20' };
      case 'processing':
        return { bg: 'bg-gradient-to-r from-blue-500 to-indigo-500', text: 'text-white', border: 'border-transparent', shadow: 'shadow-blue-500/20' };
      default:
        return { bg: 'bg-gradient-to-r from-slate-400 to-slate-500', text: 'text-white', border: 'border-transparent', shadow: 'shadow-slate-500/20' };
    }
  };

  const getConfidenceStyle = (confidence: number) => {
    if (confidence >= 0.8) return { bg: 'bg-gradient-to-r from-emerald-500 to-teal-500', text: 'text-white', label: 'High' };
    if (confidence >= 0.5) return { bg: 'bg-gradient-to-r from-amber-500 to-orange-500', text: 'text-white', label: 'Medium' };
    return { bg: 'bg-gradient-to-r from-rose-500 to-pink-500', text: 'text-white', label: 'Low' };
  };

  const getStepStyle = (stepStatus: string) => {
    switch (stepStatus) {
      case 'completed':
        return { bg: 'bg-gradient-to-br from-emerald-400 to-emerald-600', text: 'text-white', shadow: 'shadow-emerald-500/30' };
      case 'current':
        return { bg: 'bg-gradient-to-br from-blue-400 to-indigo-600', text: 'text-white', shadow: 'shadow-blue-500/30' };
      default:
        return { bg: 'bg-slate-200 dark:bg-slate-700', text: 'text-slate-400 dark:text-slate-500', shadow: '' };
    }
  };

  const viewModes = [
    { key: 'job-graph', label: 'Graph', icon: Network },
    { key: 'list', label: 'List', icon: List },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <Navigation />
        <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
          <div className="text-center">
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-blue-600 dark:text-blue-400" />
            <p className="mt-4 text-slate-600 dark:text-slate-400">Loading job details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <Navigation />
        <div className="mx-auto max-w-7xl px-4 py-8">
          <Link href="/">
            <Button variant="outline" className="mb-4 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div className="rounded-2xl border border-rose-200/50 dark:border-rose-800/50 bg-rose-50/70 dark:bg-rose-900/30 p-6 shadow-lg backdrop-blur-sm">
            <p className="text-rose-600 dark:text-rose-400">{error || 'Job not found'}</p>
          </div>
        </div>
      </div>
    );
  }

  const statusStyle = getStatusStyle(job.status);
  const isCompleted = job.status === 'completed';
  const isProcessing = job.status !== 'completed' && job.status !== 'failed';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <Navigation />

      <main className="mx-auto max-w-7xl px-4 py-8">
        <Link href="/" className="inline-block">
          <Button variant="outline" className="mb-6 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm hover:bg-white/90 dark:hover:bg-slate-700">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>

        {/* Completion Notification */}
        {isCompleted && (
          <div className="mb-6 rounded-2xl border border-emerald-300/50 dark:border-emerald-700/50 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30 p-6 shadow-lg backdrop-blur-sm animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-emerald-800 dark:text-emerald-200">Processing Complete!</h3>
                  <p className="text-sm text-emerald-600 dark:text-emerald-300">Your document has been successfully processed.</p>
                </div>
              </div>
              <Link href="/">
                <Button className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700">
                  Go to Home
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Job Info Card */}
        <div className="relative mb-6 overflow-hidden rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-6 shadow-blue-500/10 hover:shadow-blue-500/20 dark:shadow-slate-900/30 backdrop-blur-sm transition-all duration-300">
          {/* Decorative elements */}
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-gradient-to-br from-blue-400/20 to-indigo-500/20" />
          <div className="absolute -bottom-4 -left-4 h-16 w-16 rounded-full bg-gradient-to-br from-violet-400/20 to-purple-500/20" />
          <div className="absolute -right-8 top-1/2 h-8 w-8 rounded-full bg-gradient-to-br from-emerald-400/10 to-teal-500/10" />
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/50 dark:to-indigo-900/50 shadow-md">
                  <FileSearch className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">Job Details</h2>
              </div>
              <span className={`px-4 py-1.5 rounded-full text-sm font-medium border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border} ${statusStyle.shadow} shadow-lg`}>
                {job.status}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
            <div className="p-4 rounded-xl bg-white/60 dark:bg-slate-700/50 border border-white/30 dark:border-slate-600/50">
              <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">File</p>
              <p className="font-medium text-slate-800 dark:text-slate-200 mt-1 truncate">{job.fileName}</p>
            </div>
            <div className="p-4 rounded-xl bg-white/60 dark:bg-slate-700/50 border border-white/30 dark:border-slate-600/50">
              <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">Job ID</p>
              <p className="font-medium text-slate-800 dark:text-slate-200 mt-1 text-sm truncate">{job.id}</p>
            </div>
            <div className="p-4 rounded-xl bg-white/60 dark:bg-slate-700/50 border border-white/30 dark:border-slate-600/50">
              <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">Created</p>
              <p className="font-medium text-slate-800 dark:text-slate-200 mt-1 text-sm">{new Date(job.createdAt).toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Processing Progress */}
        {isProcessing && (
          <div className="relative mb-6 overflow-hidden rounded-2xl border border-blue-200/50 dark:border-blue-700/50 bg-blue-50/70 dark:bg-blue-900/30 p-6 shadow-blue-500/10 hover:shadow-blue-500/20 backdrop-blur-sm transition-all duration-300">
            <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-gradient-to-br from-blue-400/20 to-indigo-500/20" />
            <div className="absolute -bottom-4 -left-4 h-16 w-16 rounded-full bg-gradient-to-br from-violet-400/20 to-purple-500/20" />
            
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30">
                  <Loader2 className="h-5 w-5 animate-spin text-white" />
                </div>
                <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200">Processing Progress</h3>
              </div>
              
              <div className="space-y-3">
                {PROCESSING_STEPS.slice(0, -1).map((step, index) => {
                  const stepStatus = getStepStatus(step.key, job.currentStep);
                  const isLastCompleted = stepStatus === 'completed';
                  const isCurrent = stepStatus === 'current';
                  const stepStyle = getStepStyle(stepStatus);
                  const totalSteps = PROCESSING_STEPS.length - 1;
                  const stepProgress = Math.round((index / (totalSteps - 1)) * 100);
                  
                  return (
                    <div key={step.key} className="flex items-center gap-3">
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${stepStyle.bg} ${stepStyle.shadow} shadow-lg transition-all duration-300`}>
                        {isLastCompleted ? (
                          <CheckCircle className="h-5 w-5" />
                        ) : isCurrent ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Circle className="h-4 w-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className={`text-sm font-medium truncate ${
                            isCurrent 
                              ? 'text-blue-700 dark:text-blue-300' 
                              : isLastCompleted 
                                ? 'text-emerald-700 dark:text-emerald-300' 
                                : 'text-slate-500 dark:text-slate-400'
                          }`}>
                            {step.label}
                          </p>
                          <span className={`ml-2 text-xs font-medium flex-shrink-0 ${
                            isCurrent 
                              ? 'text-blue-600 dark:text-blue-400' 
                              : isLastCompleted 
                                ? 'text-emerald-600 dark:text-emerald-400' 
                                : 'text-slate-400 dark:text-slate-500'
                          }`}>
                            {isLastCompleted ? '100%' : isCurrent ? `${stepProgress}%` : '0%'}
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isCurrent
                                ? 'bg-gradient-to-r from-blue-500 to-indigo-500 animate-pulse'
                                : isLastCompleted
                                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                                  : 'bg-slate-300 dark:bg-slate-600'
                            }`}
                            style={{ width: isLastCompleted ? '100%' : isCurrent ? `${stepProgress}%` : '0%' }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* OCR Text Card */}
        {job.ocrText && (
          <div className="relative mb-6 overflow-hidden rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-6 shadow-indigo-500/10 hover:shadow-indigo-500/20 dark:shadow-slate-900/30 backdrop-blur-sm transition-all duration-300">
            <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-gradient-to-br from-indigo-400/20 to-violet-500/20" />
            <div className="absolute -bottom-4 -left-4 h-16 w-16 rounded-full bg-gradient-to-br from-purple-400/20 to-pink-500/20" />
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-lg font-semibold text-slate-800 dark:text-white">OCR Text</h2>
              </div>
              <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50/80 to-violet-50/80 dark:from-slate-700/50 dark:to-slate-600/50 border border-indigo-200/50 dark:border-slate-600/50 max-h-64 overflow-auto">
                <pre className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">{job.ocrText}</pre>
              </div>
            </div>
          </div>
        )}

        {job.jobType === 'MULTIPLE' && job.questionResults && job.questionResults.length > 0 && (
          <div className="relative mb-6 overflow-hidden rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-6 shadow-violet-500/10 hover:shadow-violet-500/20 dark:shadow-slate-900/30 backdrop-blur-sm transition-all duration-300">
            <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-gradient-to-br from-violet-400/20 to-purple-500/20" />
            <div className="absolute -bottom-4 -left-4 h-16 w-16 rounded-full bg-gradient-to-br from-purple-400/20 to-pink-500/20" />
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/30">
                  <FileSearch className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
                  Question Analysis ({job.questionResults.length} questions)
                </h2>
              </div>
              <div className="space-y-3">
                {job.questionResults.map((qr, qIndex) => {
                  const question = job.questions?.find(q => q.id === qr.questionId);
                  const isExpanded = expandedQuestions.has(qr.questionId);
                  const matchCount = qr.matchedNodes?.length || 0;
                  const isMatched = qr.status === 'matched';
                  const isFailed = qr.status === 'failed';
                  
                  return (
                    <div key={qr.questionId} className="relative overflow-hidden rounded-xl border border-violet-200/50 dark:border-violet-800/50 shadow-md shadow-violet-500/5 hover:shadow-violet-500/10 transition-all duration-300">
                      <button
                        onClick={() => toggleQuestion(qr.questionId)}
                        className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-violet-50/50 to-purple-50/50 dark:from-slate-700/50 dark:to-slate-600/50 hover:from-violet-100/50 hover:to-purple-100/50 dark:hover:from-slate-600/50 dark:hover:to-slate-500/50 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <span className="flex-shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xs font-bold shadow-md shadow-blue-500/30">
                            {qIndex + 1}
                          </span>
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-200 text-left truncate">
                            {question?.text || qr.questionText || 'Question ' + (qIndex + 1)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                          {isMatched && (
                            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/20">
                              {matchCount} match{matchCount !== 1 ? 'es' : ''}
                            </span>
                          )}
                          {isFailed && (
                            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md shadow-rose-500/20">
                              <span className="flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                Failed
                              </span>
                            </span>
                          )}
                          {qr.status === 'pending' && (
                            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/20">
                              Pending
                            </span>
                          )}
                          <ChevronRight className={`h-4 w-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="p-4 bg-white/60 dark:bg-slate-800/60 border-t border-violet-200/30 dark:border-violet-800/30">
                          {qr.matchedNodes && qr.matchedNodes.length > 0 ? (
                            <div className="space-y-3">
                              {qr.matchedNodes.map((node, nIndex) => {
                                const confidenceStyle = getConfidenceStyle(node.confidence || 0);
                                return (
                                  <div key={nIndex} className="relative overflow-hidden p-4 rounded-xl border border-slate-200/50 dark:border-slate-600/50 bg-white/80 dark:bg-slate-700/50 shadow-md hover:shadow-lg transition-all duration-300">
                                    <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-gradient-to-br from-slate-300/10 to-slate-400/10 dark:from-slate-600/10 dark:to-slate-500/10" />
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                                        {node.title || node.kbEntryId}
                                      </span>
                                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${confidenceStyle.bg} ${confidenceStyle.text} shadow-md`}>
                                        {confidenceStyle.label} {Math.round((node.confidence || 0) * 100)}%
                                      </span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm mb-2">
                                      <p className="text-slate-600 dark:text-slate-400">
                                        <span className="font-medium text-slate-700 dark:text-slate-300">Category: </span>
                                        {node.category || 'Unknown'}
                                      </p>
                                      <p className="text-slate-600 dark:text-slate-400">
                                        <span className="font-medium text-slate-700 dark:text-slate-300">Node ID: </span>
                                        {node.kbEntryId}
                                      </p>
                                    </div>
                                    <div className="p-3 rounded-lg bg-gradient-to-br from-slate-50/80 to-slate-100/80 dark:from-slate-600/50 dark:to-slate-500/50 border border-slate-200/30 dark:border-slate-500/30">
                                      <p className="text-xs text-slate-500 dark:text-slate-400">
                                        <span className="font-medium text-slate-700 dark:text-slate-300">Reasoning: </span>
                                        {node.reasoning}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
                              No matches found for this question
                            </p>
                          )}
                          {qr.error && (
                            <p className="mt-3 text-sm text-rose-600 dark:text-rose-400">
                              Error: {qr.error}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {(job.jobType === 'WRONG_SINGLE' || job.jobType === 'WRONG_MULTIPLE') && job.wrongResults && job.wrongResults.length > 0 && (
          <div className="relative mb-6 overflow-hidden rounded-2xl border border-amber-300/40 dark:border-amber-700/50 bg-gradient-to-br from-amber-50/80 to-orange-50/80 dark:from-slate-800/90 dark:to-slate-800/70 p-6 shadow-amber-500/10 hover:shadow-amber-500/20 dark:shadow-slate-900/30 backdrop-blur-md transition-all duration-300">
            <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-gradient-to-br from-amber-300/30 to-orange-400/20 dark:from-amber-600/10 dark:to-orange-600/5" />
            <div className="absolute -bottom-4 -left-4 h-16 w-16 rounded-full bg-gradient-to-br from-orange-300/20 to-amber-400/10 dark:from-orange-700/10 dark:to-amber-700/5" />

            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/30">
                  <HelpCircle className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800 dark:text-white">Wrong Question Review</h2>
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    {job.wrongResults.length === 1
                      ? '1 wrong question explained'
                      : `${job.wrongResults.length} wrong questions explained`}
                    {' · '}
                    5 practice questions per question
                  </p>
                </div>
              </div>

              {job.jobType === 'WRONG_MULTIPLE' && job.wrongResults.length > 1 && (
                <div className="flex items-center justify-between mb-4 gap-2">
                  <button
                    onClick={() => setActiveWrongIndex(i => Math.max(0, i - 1))}
                    disabled={activeWrongIndex === 0}
                    className="flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed bg-white/70 dark:bg-slate-700/70 border-amber-200/50 dark:border-amber-700/50 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/30"
                  >
                    �?Prev
                  </button>
                  <div className="flex items-center gap-1.5 flex-wrap justify-center">
                    {job.wrongResults.map((qr, idx) => (
                      <button
                        key={qr.questionId}
                        onClick={() => setActiveWrongIndex(idx)}
                        className={`flex items-center justify-center h-9 min-w-[2.25rem] px-3 rounded-xl text-sm font-bold shadow-md transition-all duration-200 ${
                          idx === activeWrongIndex
                            ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-amber-500/30 ring-2 ring-amber-400 dark:ring-amber-500'
                            : 'bg-white/70 dark:bg-slate-700/70 border border-amber-200/50 dark:border-amber-700/50 text-amber-700 dark:text-amber-300 hover:from-amber-400 hover:to-orange-500 hover:text-white'
                        }`}
                      >
                        {idx + 1}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setActiveWrongIndex(i => Math.min(job.wrongResults!.length - 1, i + 1))}
                    disabled={activeWrongIndex === job.wrongResults.length - 1}
                    className="flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed bg-white/70 dark:bg-slate-700/70 border-amber-200/50 dark:border-amber-700/50 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/30"
                  >
                    Next �?
                  </button>
                </div>
              )}

              {(() => {
                const qr = job.wrongResults[activeWrongIndex];
                if (!qr) return null;
                return (
                  <div key={activeWrongIndex} className="p-5 bg-white/80 dark:bg-slate-800/60 rounded-xl border border-amber-200/50 dark:border-amber-800/50 shadow-md shadow-amber-500/5 animate-in fade-in slide-in-from-right-4 duration-300">
                    {qr.questionText && (
                      <div className="mb-4 p-3 rounded-lg bg-amber-50/60 dark:bg-amber-900/20 border border-amber-200/40 dark:border-amber-800/40">
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-200">{qr.questionText}</p>
                      </div>
                    )}

                    <div className="mb-5">
                      <div className="flex items-center gap-2 mb-3">
                        <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        <h3 className="text-base font-semibold text-slate-800 dark:text-white">Explanation</h3>
                      </div>
                      <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50/70 to-orange-50/70 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800 border-l-4 border-l-amber-500">
                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: renderMarkdown(qr.explanation) }} />
                      </div>
                    </div>

                    {qr.practiceQuestions && qr.practiceQuestions.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md shadow-blue-500/20">
                            <span className="text-white text-xs font-bold">{qr.practiceQuestions.length}</span>
                          </div>
                          <h3 className="text-base font-semibold text-slate-800 dark:text-white">Practice Questions</h3>
                        </div>

                        <div className="space-y-4">
                          {qr.practiceQuestions.map((pq, pqIndex) => {
                            const selectedOption = selectedAnswers[pq.id];
                            const revealed = revealedAnswers.has(pq.id);
                            const isCorrect = selectedOption === pq.correctAnswer;

                            return (
                              <div key={pq.id} className="relative overflow-hidden rounded-xl border border-slate-200/50 dark:border-slate-600/50 bg-white/80 dark:bg-slate-700/50 shadow-sm hover:shadow-md transition-all duration-300">
                                <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-gradient-to-br from-blue-200/20 to-indigo-200/10 dark:from-blue-900/10 dark:to-indigo-900/5" />
                                <div className="relative z-10 p-4">
                                  <div className="flex items-start gap-3 mb-3">
                                    <span className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/40 dark:to-indigo-900/40 text-blue-600 dark:text-blue-400 text-xs font-bold">
                                      {pqIndex + 1}
                                    </span>
                                    <p className="text-sm font-medium text-slate-800 dark:text-white leading-relaxed flex-1">
                                      {pq.question}
                                    </p>
                                  </div>

                                  <div className="space-y-2">
                                    {pq.options.map((option, optIndex) => {
                                      const isSelected = selectedOption === optIndex;
                                      const isCorrectOption = optIndex === pq.correctAnswer;
                                      const showResult = revealed && isSelected;

                                      let optionClass = 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-700 dark:text-slate-200';
                                      if (showResult) {
                                        optionClass = isCorrect
                                          ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200'
                                          : 'border-rose-400 bg-rose-50 dark:bg-rose-900/30 text-rose-800 dark:text-rose-200';
                                      }

                                      return (
                                        <button
                                          key={optIndex}
                                          onClick={() => !revealed && handleAnswerSelect(pq.id, optIndex, isCorrectOption)}
                                          disabled={revealed}
                                          className={`w-full flex items-center gap-3 rounded-lg border p-3 text-left text-sm transition-all duration-200 cursor-pointer ${optionClass} ${!revealed ? 'cursor-pointer' : 'cursor-default'}`}
                                        >
                                          <span className={`flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                                            showResult
                                              ? isCorrect
                                                ? 'bg-emerald-500 text-white'
                                                : 'bg-rose-500 text-white'
                                              : isSelected
                                                ? 'bg-blue-500 text-white'
                                                : 'bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-400'
                                          }`}>
                                            {String.fromCharCode(65 + optIndex)}
                                          </span>
                                          <span className="flex-1">{option}</span>
                                          {showResult && (
                                            <span className="flex-shrink-0">
                                              {isCorrect ? (
                                                <CheckCircle className="h-5 w-5 text-emerald-500" />
                                              ) : (
                                                <span className="flex items-center gap-1 text-xs font-medium text-rose-600 dark:text-rose-400">
                                                  <span>Correct: {String.fromCharCode(65 + pq.correctAnswer)}</span>
                                                </span>
                                              )}
                                            </span>
                                          )}
                                        </button>
                                      );
                                    })}
                                  </div>

                                  {revealed && (
                                    <div className="mt-3 p-3 rounded-lg bg-gradient-to-br from-slate-50/80 to-slate-100/80 dark:from-slate-600/40 dark:to-slate-500/40 border border-slate-200/40 dark:border-slate-500/30">
                                      <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                                        <span className="font-medium text-slate-700 dark:text-slate-300 not-italic">Explanation: </span>
                                        <span dangerouslySetInnerHTML={{ __html: renderMarkdown(pq.explanation) }} />
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {qr.error && (
                      <p className="mt-3 text-sm text-rose-600 dark:text-rose-400">Error: {qr.error}</p>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* Knowledge Graph Card */}
        {job.results && job.results.length > 0 && !(job.jobType === 'WRONG_SINGLE' || job.jobType === 'WRONG_MULTIPLE') && (
          <div className="relative rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 shadow-indigo-500/10 hover:shadow-indigo-500/20 dark:shadow-slate-900/30 backdrop-blur-sm overflow-hidden transition-all duration-300">
            <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-gradient-to-br from-indigo-400/20 to-violet-500/20" />
            <div className="absolute -bottom-4 -left-4 h-16 w-16 rounded-full bg-gradient-to-br from-violet-400/20 to-purple-500/20" />
            
            <div className="relative z-10 px-6 py-4 border-b border-white/20 dark:border-slate-600/50 bg-white/40 dark:bg-slate-700/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30">
                    <Network className="h-5 w-5 text-white" />
                  </div>
                  <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Knowledge Graph</h2>
                </div>
                {!(job.jobType === ('WRONG_SINGLE' as Job['jobType']) || job.jobType === ('WRONG_MULTIPLE' as Job['jobType'])) && (
                <div className="flex gap-2">
                  {viewModes.map((mode) => {
                    const Icon = mode.icon;
                    const isActive = viewMode === mode.key;
                    return (
                      <button
                        key={mode.key}
                        onClick={() => setViewMode(mode.key as any)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                          isActive
                            ? 'bg-gradient-to-r from-blue-500 via-violet-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 hover:scale-105'
                            : 'bg-white/60 dark:bg-slate-600/50 text-slate-600 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-500/50 border border-white/40 dark:border-slate-500/50'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {mode.label}
                      </button>
                    );
                  })}
                </div>
                )}
              </div>
            </div>

            <div className="p-6">
              {viewMode === 'job-graph' && (
                job.graphData ? (
                  <div className="h-[500px] rounded-xl overflow-hidden border border-slate-200/50 dark:border-slate-600/50 bg-slate-50/50 dark:bg-slate-700/50">
                    <ReactFlowGraph graphData={job.graphData} />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[300px] rounded-xl bg-slate-50/50 dark:bg-slate-700/50 border border-slate-200/30 dark:border-slate-600/30">
                    <p className="text-slate-500 dark:text-slate-400">Graph data not available yet...</p>
                  </div>
                )
              )}
              {viewMode === 'list' && (
                <div className="grid gap-4">
                  {job.results.map((result, index) => {
                    const confidenceStyle = getConfidenceStyle(result.confidence);
                    return (
                      <div key={index} className="relative overflow-hidden p-5 rounded-xl border border-slate-200/50 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/50 hover:bg-white/80 dark:hover:bg-slate-600/50 shadow-md hover:shadow-lg transition-all duration-300">
                        <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-gradient-to-br from-slate-300/10 to-slate-400/10 dark:from-slate-600/10 dark:to-slate-500/10" />
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{result.title || result.kbEntryId}</span>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${confidenceStyle.bg} ${confidenceStyle.text} shadow-md`}>
                            {confidenceStyle.label} {Math.round(result.confidence * 100)}%
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                          <p className="text-slate-600 dark:text-slate-400">
                            <span className="font-medium text-slate-700 dark:text-slate-300">Category: </span>
                            {result.category || 'Unknown'}
                          </p>
                          <p className="text-slate-600 dark:text-slate-400">
                            <span className="font-medium text-slate-700 dark:text-slate-300">Matched Text: </span>
                            {result.ocrTextSpan.excerpt}
                          </p>
                        </div>
                        <div className="mt-3 p-3 rounded-lg bg-gradient-to-br from-slate-50/80 to-slate-100/80 dark:from-slate-600/50 dark:to-slate-500/50 border border-slate-200/30 dark:border-slate-500/30">
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            <span className="font-medium text-slate-700 dark:text-slate-300">Reasoning: </span>
                            {result.reasoning}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Error Card */}
        {job.error && (
          <div className="mt-6 rounded-2xl border border-rose-200/50 dark:border-rose-800/50 bg-rose-50/70 dark:bg-rose-900/30 p-6 shadow-lg backdrop-blur-sm">
            <h2 className="text-lg font-semibold text-rose-700 dark:text-rose-300 mb-2">Error</h2>
            <p className="text-rose-600 dark:text-rose-400">{job.error}</p>
          </div>
        )}
      </main>
    </div>
  );
}