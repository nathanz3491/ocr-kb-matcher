'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { 
  Loader2, CheckCircle, XCircle, ArrowLeft, Trophy, ArrowRight, Sparkles,
  Target, Zap, BookOpen, TrendingUp, AlertCircle, Brain, Lightbulb,
  ChevronRight, RotateCcw, Check, X
} from 'lucide-react';
import Link from 'next/link';
import { Navigation } from '@/components/navigation/Navigation';
import { useConfetti } from '@/components/ui/Confetti';
import { motion, AnimatePresence } from 'framer-motion';

type QuestionType = 'multiple_choice' | 'fill_in_blank' | 'true_false' | 'matching';

interface QuizQuestion {
  id: string;
  type: QuestionType;
  question: string;
  options?: string[];
  correctAnswer?: number;
  explanation: string;
  items?: string[];
  matches?: string[];
  correctMatches?: string[];
}

interface TargetedNode {
  nodeId: string;
  mastery: number;
}

interface AdaptiveResponse {
  sessionId: string;
  targetedNodes: TargetedNode[];
  questions: QuizQuestion[];
}

interface QuizResult {
  score: number;
  totalQuestions: number;
  percentage: number;
  answers: Array<{
    questionId: string;
    selectedAnswer: number | string;
    correct: boolean;
    userMatches?: Record<string, string>;
  }>;
  questions: QuizQuestion[];
}

export default function AdaptiveQuizPage() {
  const router = useRouter();
  const { triggerConfetti } = useConfetti();

  const [step, setStep] = useState<'loading' | 'targets' | 'generating' | 'quiz' | 'results'>('loading');
  const [targetedNodes, setTargetedNodes] = useState<TargetedNode[]>([]);
  const [weakNodes, setWeakNodes] = useState<Array<{ nodeId: string; mastery: number }>>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number | string>>({});
  const [fillInBlankAnswers, setFillInBlankAnswers] = useState<Record<string, string>>({});
  const [matchingAnswers, setMatchingAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTargets();
  }, []);

  const fetchTargets = async () => {
    setStep('loading');
    try {
      const res = await api.get('/api/user-progress');
      const json = await res.json();
      if (json.success) {
        const masteries = json.data.nodeMastery || {};
        const sorted: Array<{ nodeId: string; mastery: number }> = Object.entries(masteries)
          .map(([nodeId, mastery]) => ({ nodeId, mastery }))
          .sort((a, b) => a.mastery - b.mastery);

        const weak = sorted.filter(n => n.mastery < 50);
        setWeakNodes(weak.length > 0 ? weak.slice(0, 10) : sorted.slice(0, 10));
        setTargetedNodes(weak.length > 0 ? weak.slice(0, 5) : sorted.slice(0, 5));
        setStep('targets');
      }
    } catch {
      setWeakNodes([]);
      setTargetedNodes([]);
      setStep('targets');
    }
  };

  const startAdaptiveQuiz = async (count: number = 5) => {
    setStep('generating');
    try {
      const res = await api.get(`/api/quiz/adaptive?count=${count}`);
      const json = await res.json();
      if (json.success) {
        setSessionId(json.data.sessionId);
        setTargetedNodes(json.data.targetedNodes || []);
        setQuestions(json.data.questions || []);
        setStep('quiz');
      } else {
        setError('Failed to generate adaptive quiz');
      }
    } catch {
      setError('Failed to generate adaptive quiz. Please try again.');
    }
  };

  const handleSelectAnswer = (questionId: string, optionIndex: number) => {
    if (submitted) return;
    setSelectedAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
  };

  const handleFillInBlank = (questionId: string, answer: string) => {
    if (submitted) return;
    setFillInBlankAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleMatchingSelect = (item: string, match: string) => {
    if (submitted) return;
    setMatchingAnswers(prev => ({ ...prev, [item]: match }));
  };

  const handleSubmit = async () => {
    const totalQuestions = questions.length;
    let correctCount = 0;

    const answers = questions.map(q => {
      let isCorrect = false;
      let selectedAnswer: number | string = '';

      if (q.type === 'multiple_choice' || q.type === 'true_false') {
        selectedAnswer = selectedAnswers[q.id] ?? '';
        isCorrect = selectedAnswer === q.correctAnswer;
      } else if (q.type === 'fill_in_blank') {
        const userAnswer = fillInBlankAnswers[q.id]?.trim().toLowerCase() || '';
        const correctAnswer = q.options?.[0]?.toLowerCase() || '';
        selectedAnswer = fillInBlankAnswers[q.id] || '';
        isCorrect = userAnswer === correctAnswer;
      } else if (q.type === 'matching') {
        const userMatches = matchingAnswers;
        const userMatchIndex = (item: string) => {
          const matchId = userMatches[item];
          if (!matchId) return -1;
          return parseInt(matchId.replace('match-', ''));
        };
        const allCorrect = q.items?.every((item, idx) => {
          const userIdx = userMatchIndex(item);
          const correctIdx = q.correctMatches?.[idx] ? q.matches?.indexOf(q.correctMatches[idx]) ?? -1 : idx;
          return userIdx === correctIdx || userMatches[item] === q.matches?.[idx];
        }) ?? false;
        isCorrect = allCorrect;
        selectedAnswer = JSON.stringify(userMatches);
      }

      if (isCorrect) correctCount++;

      return {
        questionId: q.id,
        selectedAnswer,
        correct: isCorrect,
        userMatches: q.type === 'matching' ? matchingAnswers : undefined
      };
    });

    try {
      const res = await api.post('/api/quiz/submit', {
        sessionId,
        answers,
        topicId: 'adaptive'
      });
      const json = await res.json();

      if (json.success) {
        const questionsWithAnswers = json.data.questions || questions;
        const quizResult: QuizResult = {
          score: correctCount,
          totalQuestions,
          percentage: Math.round((correctCount / totalQuestions) * 100),
          answers,
          questions: questionsWithAnswers
        };

        setResult(quizResult);
        setSubmitted(true);
        setStep('results');
        triggerConfetti();
      }
    } catch {
      const quizResult: QuizResult = {
        score: correctCount,
        totalQuestions,
        percentage: Math.round((correctCount / totalQuestions) * 100),
        answers,
        questions
      };

      setResult(quizResult);
      setSubmitted(true);
      setStep('results');
      triggerConfetti();
    }
  };

  const allQuestionsAnswered = (): boolean => {
    if (questions.length === 0) return false;
    return questions.every(q => {
      if (q.type === 'multiple_choice' || q.type === 'true_false') {
        return selectedAnswers[q.id] !== undefined;
      } else if (q.type === 'fill_in_blank') {
        return fillInBlankAnswers[q.id]?.trim().length > 0;
      } else if (q.type === 'matching') {
        return q.items?.every(item => matchingAnswers[item]) ?? false;
      }
      return false;
    });
  };

  const getMasteryColor = (mastery: number): string => {
    if (mastery < 20) return 'text-rose-600 dark:text-rose-400';
    if (mastery < 40) return 'text-orange-600 dark:text-orange-400';
    return 'text-amber-600 dark:text-amber-400';
  };

  const getMasteryBg = (mastery: number): string => {
    if (mastery < 20) return 'bg-rose-100 dark:bg-rose-900/50';
    if (mastery < 40) return 'bg-orange-100 dark:bg-orange-900/50';
    return 'bg-amber-100 dark:bg-amber-900/50';
  };

  const getMasteryBorder = (mastery: number): string => {
    if (mastery < 20) return 'border-rose-200 dark:border-rose-800/50';
    if (mastery < 40) return 'border-orange-200 dark:border-orange-800/50';
    return 'border-amber-200 dark:border-amber-800/50';
  };

  // Loading State
  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <Navigation />
        <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="relative mb-6">
              <div className="absolute inset-0 rounded-full bg-blue-400/20 blur-xl animate-pulse" />
              <Loader2 className="relative mx-auto h-12 w-12 animate-spin text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-lg font-semibold text-slate-800 dark:text-white">Analyzing your progress...</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Finding your weakest areas</p>
          </motion.div>
        </div>
      </div>
    );
  }

  // Generating State
  if (step === 'generating') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <Navigation />
        <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="relative mb-6">
              <div className="absolute inset-0 rounded-full bg-violet-400/20 blur-xl animate-pulse" />
              <Loader2 className="relative mx-auto h-12 w-12 animate-spin text-violet-600 dark:text-violet-400" />
            </div>
            <p className="text-lg font-semibold text-slate-800 dark:text-white">Generating adaptive quiz...</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Targeting your weakest knowledge areas</p>
          </motion.div>
        </div>
      </div>
    );
  }

  // Target Selection State
  if (step === 'targets') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <Navigation />
        <div className="mx-auto max-w-5xl px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            
            <Link 
              href="/learn" 
              className="group mb-8 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 transition-all hover:bg-white/70 dark:hover:bg-slate-800/70 hover:text-slate-800 dark:hover:text-slate-200"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              Back to Learning Hub
            </Link>

            
            <div className="mb-8 text-center">
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/25"
              >
                <Target className="h-8 w-8 text-white" />
              </motion.div>
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 dark:text-white">Adaptive Quiz</h1>
              <p className="mt-3 text-slate-600 dark:text-slate-400 max-w-lg mx-auto">
                We've analyzed your knowledge graph and identified areas where you need the most practice.
              </p>
            </div>

            
            <div className="grid lg:grid-cols-2 gap-6 mb-8">
              
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-6 shadow-lg dark:shadow-slate-900/30 backdrop-blur-sm"
              >
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/30">
                    <Lightbulb className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white">Targeted Areas</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Focus on these weak spots</p>
                  </div>
                </div>
                
                {weakNodes.length === 0 ? (
                  <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 p-6 text-center border border-emerald-200 dark:border-emerald-800/50">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                      <CheckCircle className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <p className="font-semibold text-emerald-700 dark:text-emerald-300">No weak areas found!</p>
                    <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-1">
                      All your topics have mastery above 50%. Keep practicing!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {weakNodes.slice(0, 5).map((node, index) => (
                      <motion.div 
                        key={node.nodeId}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`flex items-center justify-between rounded-xl border ${getMasteryBorder(node.mastery)} ${getMasteryBg(node.mastery)} px-4 py-3 transition-all hover:shadow-md`}
                      >
                        <span className="text-slate-700 dark:text-slate-200 font-medium truncate flex-1 mr-3">{node.nodeId}</span>
                        <span className={`rounded-full px-3 py-1 text-sm font-bold bg-white/80 dark:bg-slate-800/80 ${getMasteryColor(node.mastery)} shadow-sm`}>
                          {node.mastery.toFixed(0)}%
                        </span>
                      </motion.div>
                    ))}
                    {weakNodes.length > 5 && (
                      <p className="text-xs text-center text-slate-400 dark:text-slate-500 pt-2">
                        +{weakNodes.length - 5} more areas below 50% mastery
                      </p>
                    )}
                  </div>
                )}
              </motion.div>

              
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-6 shadow-lg dark:shadow-slate-900/30 backdrop-blur-sm"
              >
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30">
                    <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white">Quiz Stats</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">What to expect</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <BookOpen className="h-4 w-4" />
                      <span className="text-sm">Questions</span>
                    </div>
                    <span className="font-bold text-slate-800 dark:text-white">5</span>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <Target className="h-4 w-4" />
                      <span className="text-sm">Targeted Nodes</span>
                    </div>
                    <span className="font-bold text-slate-800 dark:text-white">{Math.min(5, weakNodes.length)}</span>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <Zap className="h-4 w-4" />
                      <span className="text-sm">Difficulty</span>
                    </div>
                    <span className="font-bold text-amber-600 dark:text-amber-400">Adaptive</span>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <Brain className="h-4 w-4" />
                      <span className="text-sm">AI-Generated</span>
                    </div>
                    <span className="rounded-full bg-violet-100 dark:bg-violet-900/50 px-2 py-0.5 text-xs font-medium text-violet-700 dark:text-violet-300">
                      Enabled
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => startAdaptiveQuiz(5)}
                  className="mt-6 w-full rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-3.5 font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:from-blue-600 hover:to-indigo-600 hover:shadow-xl hover:shadow-blue-500/30 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <Sparkles className="h-5 w-5" />
                  Start Adaptive Quiz
                  <ChevronRight className="h-4 w-4" />
                </button>
              </motion.div>
            </div>

            
            {weakNodes.length > 5 && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-6 shadow-lg dark:shadow-slate-900/30 backdrop-blur-sm"
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100 dark:bg-rose-900/30">
                    <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                  </div>
                  <h2 className="text-lg font-bold text-slate-800 dark:text-white">All Weak Areas</h2>
                  <span className="rounded-full bg-rose-100 dark:bg-rose-900/50 px-2.5 py-0.5 text-xs font-medium text-rose-700 dark:text-rose-300">
                    {weakNodes.length} total
                  </span>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {weakNodes.map((node) => (
                    <div 
                      key={node.nodeId} 
                      className={`flex items-center justify-between rounded-xl border ${getMasteryBorder(node.mastery)} ${getMasteryBg(node.mastery)} px-4 py-2.5 transition-all hover:shadow-sm`}
                    >
                      <span className="text-sm text-slate-700 dark:text-slate-300 truncate flex-1 mr-2">{node.nodeId}</span>
                      <span className={`text-sm font-bold ${getMasteryColor(node.mastery)}`}>
                        {node.mastery.toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    );
  }

  // Results State
  if (step === 'results' && result) {
    const isExcellent = result.percentage >= 80;
    const isGood = result.percentage >= 60 && result.percentage < 80;
    const resultMessage = isExcellent ? 'Excellent work!' : isGood ? 'Good job!' : 'Keep practicing!';
    const resultColor = isExcellent ? 'text-emerald-600 dark:text-emerald-400' : isGood ? 'text-blue-600 dark:text-blue-400' : 'text-amber-600 dark:text-amber-400';
    const resultBg = isExcellent ? 'bg-emerald-100 dark:bg-emerald-900/30' : isGood ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-amber-100 dark:bg-amber-900/30';

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <Navigation />
        <div className="mx-auto max-w-4xl px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            
            <Link 
              href="/learn" 
              className="group mb-8 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 transition-all hover:bg-white/70 dark:hover:bg-slate-800/70 hover:text-slate-800 dark:hover:text-slate-200"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              Back to Learning Hub
            </Link>

            
            <div className="mb-8 rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-8 text-center shadow-lg dark:shadow-slate-900/30 backdrop-blur-sm">
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 shadow-lg shadow-orange-500/25"
              >
                <Trophy className="h-10 w-10 text-white" />
              </motion.div>
              
              <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Quiz Complete!</h1>
              <p className="mt-2 text-slate-600 dark:text-slate-400">You targeted your weakest areas</p>

              <div className="mt-6 flex items-center justify-center gap-2">
                <span className="text-5xl font-bold text-blue-600 dark:text-blue-400">{result.score}</span>
                <span className="text-2xl text-slate-400 dark:text-slate-500">/</span>
                <span className="text-3xl text-slate-600 dark:text-slate-400">{result.totalQuestions}</span>
              </div>

              <div className={`mt-4 inline-flex items-center gap-2 rounded-full ${resultBg} px-6 py-3`}>
                <span className={`text-2xl font-bold ${resultColor}`}>{result.percentage}%</span>
                <span className="text-slate-600 dark:text-slate-400">{resultMessage}</span>
              </div>

              <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
                <button
                  onClick={() => router.push('/learn')}
                  className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-3 font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:from-blue-600 hover:to-indigo-600 hover:scale-105"
                >
                  <BookOpen className="h-5 w-5" />
                  Back to Learning
                </button>
                <button
                  onClick={() => {
                    setSubmitted(false);
                    setResult(null);
                    setSelectedAnswers({});
                    setFillInBlankAnswers({});
                    setMatchingAnswers({});
                    setCurrentQuestion(0);
                    startAdaptiveQuiz(5);
                  }}
                  className="flex items-center justify-center gap-2 rounded-xl border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-6 py-3 font-semibold text-slate-700 dark:text-slate-300 transition-all hover:bg-slate-50 dark:hover:bg-slate-600 hover:border-slate-400 dark:hover:border-slate-500"
                >
                  <RotateCcw className="h-5 w-5" />
                  Try Again
                </button>
              </div>
            </div>

            
            <h2 className="mb-4 text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              Review Answers
            </h2>
            <div className="space-y-4">
              {result.questions.map((q, idx) => {
                const userAnswer = result.answers.find(a => a.questionId === q.id);
                const isCorrect = userAnswer?.correct;

                return (
                  <motion.div 
                    key={q.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className={`rounded-2xl border p-6 ${isCorrect ? 'border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-900/20' : 'border-rose-200 dark:border-rose-800/50 bg-rose-50/50 dark:bg-rose-900/20'} backdrop-blur-sm`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${isCorrect ? 'bg-emerald-100 dark:bg-emerald-900/50' : 'bg-rose-100 dark:bg-rose-900/50'}`}>
                        {isCorrect ? (
                          <Check className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <X className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="mb-2 flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Question {idx + 1}</span>
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${isCorrect ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300' : 'bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300'}`}>
                            {isCorrect ? 'Correct' : 'Incorrect'}
                          </span>
                        </div>
                        <p className="font-semibold text-slate-800 dark:text-white mb-3">{q.question}</p>

                        {(q.type === 'multiple_choice' || q.type === 'true_false') && (
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            Your answer: <span className={isCorrect ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-rose-600 dark:text-rose-400 font-semibold'}>
                              {q.options?.[userAnswer?.selectedAnswer as number] || 'Not answered'}
                            </span>
                          </p>
                        )}
                        {q.type === 'fill_in_blank' && (
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            Your answer: <span className={isCorrect ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-rose-600 dark:text-rose-400 font-semibold'}>
                              {userAnswer?.selectedAnswer || 'Not answered'}
                            </span>
                          </p>
                        )}

                        {!isCorrect && q.type !== 'matching' && (
                          <p className="mt-2 text-sm text-emerald-600 dark:text-emerald-400">
                            Correct: <span className="font-semibold">{q.type === 'fill_in_blank' ? q.options?.[0] : q.options?.[q.correctAnswer ?? 0]}</span>
                          </p>
                        )}
                        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-700 pt-3">
                          <span className="font-medium text-slate-700 dark:text-slate-300">Explanation:</span> {q.explanation}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // Quiz State
  const question = questions[currentQuestion];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <Navigation />
      <div className="mx-auto max-w-3xl px-4 py-8">
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex items-center justify-between"
        >
          <Link 
            href="/learn" 
            className="group inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 transition-all hover:bg-white/70 dark:hover:bg-slate-800/70 hover:text-slate-800 dark:hover:text-slate-200"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Exit Quiz
          </Link>
          <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/25">
            <Sparkles className="h-4 w-4" />
            Adaptive Mode
          </span>
        </motion.div>

        
        <div className="mb-6 rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-4 shadow-lg backdrop-blur-sm">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium text-slate-600 dark:text-slate-400">
              Question {currentQuestion + 1} of {questions.length}
            </span>
            <span className="font-bold text-blue-600 dark:text-blue-400">
              {Math.round(((currentQuestion + 1) / questions.length) * 100)}%
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
            <motion.div 
              className="h-full rounded-full bg-gradient-to-r from-blue-500 via-violet-500 to-indigo-500 shadow-lg shadow-indigo-500/25"
              initial={{ width: 0 }}
              animate={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        </div>

        
        {targetedNodes.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2">
            {targetedNodes.slice(0, 3).map((node) => (
              <span 
                key={node.nodeId} 
                className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 dark:bg-amber-900/40 px-3 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50"
              >
                <Target className="h-3 w-3" />
                {node.nodeId}: {node.mastery.toFixed(0)}%
              </span>
            ))}
          </div>
        )}

        
        <AnimatePresence mode="wait">
          <motion.div 
            key={currentQuestion}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="mb-6 rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-6 md:p-8 shadow-lg dark:shadow-slate-900/30 backdrop-blur-sm"
          >
            <h2 className="mb-6 text-xl md:text-2xl font-bold text-slate-800 dark:text-white leading-relaxed">
              {question?.question}
            </h2>

            
            {question?.type === 'multiple_choice' && (
              <div className="space-y-3">
                {question.options?.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectAnswer(question.id, idx)}
                    disabled={submitted}
                    className={`group w-full rounded-xl border-2 p-4 text-left transition-all duration-200 ${
                      selectedAnswers[question.id] === idx
                        ? 'border-blue-500 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/30 shadow-md'
                        : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700/50 hover:border-blue-300 dark:hover:border-blue-500 hover:bg-blue-50/30 dark:hover:bg-blue-900/20'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-sm font-bold transition-all ${
                        selectedAnswers[question.id] === idx
                          ? 'bg-blue-500 text-white shadow-md'
                          : 'bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-300 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30'
                      }`}>
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="text-slate-700 dark:text-slate-200 font-medium">{option}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            
            {question?.type === 'true_false' && (
              <div className="grid grid-cols-2 gap-4">
                {['True', 'False'].map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectAnswer(question.id, idx)}
                    disabled={submitted}
                    className={`rounded-xl border-2 p-6 text-center text-lg font-semibold transition-all ${
                      selectedAnswers[question.id] === idx
                        ? 'border-emerald-500 dark:border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 shadow-md'
                        : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 hover:border-emerald-300 dark:hover:border-emerald-500 hover:bg-emerald-50/30 dark:hover:bg-emerald-900/20'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}

            
            {question?.type === 'fill_in_blank' && (
              <div className="space-y-3">
                <input
                  type="text"
                  value={fillInBlankAnswers[question.id] || ''}
                  onChange={(e) => handleFillInBlank(question.id, e.target.value)}
                  disabled={submitted}
                  placeholder="Type your answer..."
                  className="w-full rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700/50 p-4 text-lg text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Type your answer to fill in the blank.
                </p>
              </div>
            )}

            
            {question?.type === 'matching' && (
              <div className="space-y-6">
                <div className="mb-6 p-4 rounded-xl bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-3 flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Drag to match:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {question.matches?.map((match, mIdx) => {
                      const matchId = `match-${mIdx}`;
                      const isUsed = Object.values(matchingAnswers).includes(matchId);
                      return (
                        <div
                          key={matchId}
                          draggable={!submitted && !isUsed}
                          onDragStart={(e) => {
                            if (submitted || isUsed) return;
                            e.dataTransfer.setData('matchId', matchId);
                            e.dataTransfer.setData('matchText', match);
                          }}
                          className={`px-4 py-2 rounded-lg border-2 cursor-grab active:cursor-grabbing transition-all ${
                            submitted || isUsed
                              ? 'border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-700 opacity-50 cursor-not-allowed'
                              : 'border-violet-300 dark:border-violet-600 bg-violet-50 dark:bg-violet-900/30 hover:bg-violet-100 dark:hover:bg-violet-900/50'
                          }`}
                        >
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{match}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3">
                  {question.items?.map((item) => (
                    <div key={item} className="flex items-center gap-4">
                      <div className="flex-1 rounded-xl border-2 border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-700/50 p-4 text-center font-semibold text-slate-700 dark:text-slate-200">
                        {item}
                      </div>
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.currentTarget.classList.add('bg-violet-50', 'dark:bg-violet-900/30', 'border-violet-400');
                        }}
                        onDragLeave={(e) => {
                          e.currentTarget.classList.remove('bg-violet-50', 'dark:bg-violet-900/30', 'border-violet-400');
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.currentTarget.classList.remove('bg-violet-50', 'dark:bg-violet-900/30', 'border-violet-400');
                          const matchId = e.dataTransfer.getData('matchId');
                          const matchText = e.dataTransfer.getData('matchText');
                          if (matchId && matchText) {
                            handleMatchingSelect(item, matchId);
                          }
                        }}
                        className={`flex-1 min-h-[56px] rounded-xl border-2 border-dashed transition-all flex items-center justify-center ${
                          matchingAnswers[item]
                            ? 'border-emerald-400 dark:border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                            : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700/50'
                        }`}
                      >
                        {matchingAnswers[item] ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                              {question.matches?.[parseInt(matchingAnswers[item].replace('match-', ''))] || 'Matched'}
                            </span>
                            {!submitted && (
                              <button
                                onClick={() => handleMatchingSelect(item, '')}
                                className="ml-2 text-slate-400 hover:text-rose-500 transition-colors"
                              >
                                <XCircle className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400 dark:text-slate-500">Drop here</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {Object.keys(matchingAnswers).length > 0 && !submitted && (
                  <button
                    onClick={() => setMatchingAnswers({})}
                    className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors flex items-center gap-1"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Clear all matches
                  </button>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        
        <div className="flex gap-4">
          {currentQuestion > 0 && (
            <button
              onClick={() => setCurrentQuestion(prev => prev - 1)}
              className="flex items-center gap-2 rounded-xl border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-6 py-3 font-semibold text-slate-700 dark:text-slate-300 transition-all hover:bg-slate-50 dark:hover:bg-slate-600 hover:border-slate-400 dark:hover:border-slate-500"
            >
              <ArrowLeft className="h-4 w-4" />
              Previous
            </button>
          )}

          {currentQuestion < questions.length - 1 ? (
            <button
              onClick={() => setCurrentQuestion(prev => prev + 1)}
              disabled={
                (question?.type === 'multiple_choice' || question?.type === 'true_false') && selectedAnswers[question?.id] === undefined ||
                question?.type === 'fill_in_blank' && !fillInBlankAnswers[question?.id]?.trim() ||
                question?.type === 'matching' && !question?.items?.every(item => matchingAnswers[item])
              }
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-3 font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:from-blue-600 hover:to-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl"
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!allQuestionsAnswered()}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-3 font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl"
            >
              <CheckCircle className="h-5 w-5" />
              Submit Quiz
            </button>
          )}
        </div>

        
        <div className="mt-8 flex justify-center gap-2">
          {questions.map((q, idx) => {
            let isAnswered = false;
            if (q.type === 'multiple_choice' || q.type === 'true_false') {
              isAnswered = selectedAnswers[q.id] !== undefined;
            } else if (q.type === 'fill_in_blank') {
              isAnswered = !!fillInBlankAnswers[q.id]?.trim();
            } else if (q.type === 'matching') {
              isAnswered = q.items?.every(item => matchingAnswers[item]) ?? false;
            }

            return (
              <button
                key={q.id}
                onClick={() => setCurrentQuestion(idx)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  idx === currentQuestion
                    ? 'w-8 bg-blue-600 dark:bg-blue-400'
                    : isAnswered
                      ? 'w-2 bg-emerald-400 dark:bg-emerald-500'
                      : 'w-2 bg-slate-300 dark:bg-slate-600'
                }`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
