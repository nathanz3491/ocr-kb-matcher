'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Loader2, CheckCircle, XCircle, ArrowLeft, Trophy, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { Navigation } from '@/components/navigation/Navigation';
import { useConfetti } from '@/components/ui/Confetti';
import { RelativeTime, getRelativeTime } from '@/components/ui/RelativeTime';

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
}

interface QuizResult {
  score: number;
  totalQuestions: number;
  percentage: number;
  answers: Array<{
    questionId: string;
    selectedAnswer: number;
    correct: boolean;
  }>;
  questions: Array<{
    id: string;
    question: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
  }>;
}

export default function QuizPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;
  const { triggerConfetti } = useConfetti();

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    generateQuiz();
  }, [jobId]);

  const generateQuiz = async () => {
    setGenerating(true);
    try {
      const res = await api.post(`/api/quiz/generate/${jobId}`, {});
      const json = await res.json();
      if (json.success) {
        setSessionId(json.data.sessionId);
        setQuestions(json.data.questions);
      }
    } catch (err) {
      console.error('Error generating quiz:', err);
      setError('Failed to generate quiz. Please try again.');
    } finally {
      setGenerating(false);
      setLoading(false);
    }
  };

  const handleSelectAnswer = (questionId: string, optionIndex: number) => {
    if (submitted) return;
    setSelectedAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
  };

  const handleSubmit = async () => {
    if (!sessionId) return;
    const answers = Object.entries(selectedAnswers).map(([questionId, selectedAnswer]) => ({
      questionId,
      selectedAnswer
    }));
    try {
      const res = await api.post('/api/quiz/submit', { sessionId, answers });
      const json = await res.json();
      if (json.success) {
        setResult(json.data);
        setSubmitted(true);
        // Trigger confetti on quiz completion
        triggerConfetti();
      }
    } catch (err) {
      console.error('Error submitting quiz:', err);
      setError('Failed to submit quiz. Please try again.');
    }
  };

  const allQuestionsAnswered = questions.length > 0 && questions.every(q => selectedAnswers[q.id] !== undefined);

  if (loading || generating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-blue-600 dark:text-blue-400" />
          <p className="text-slate-600 dark:text-slate-400">Generating your quiz...</p>
          <p className="text-sm text-slate-500 dark:text-slate-500">AI is creating personalized questions</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="mx-auto mb-4 h-10 w-10 text-red-500" />
          <p className="text-slate-700 dark:text-slate-300 mb-4">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="rounded-lg bg-blue-600 dark:bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 dark:hover:bg-blue-500"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (submitted && result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4 md:p-8">
        <div className="mx-auto max-w-2xl">
          <Link href="/" className="mb-6 inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>

          <div className="mb-8 rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-8 text-center shadow-lg dark:shadow-slate-900/30 backdrop-blur-sm">
            <Trophy className={`mx-auto mb-4 h-16 w-16 ${result.score >= 4 ? 'text-yellow-500' : result.score >= 3 ? 'text-blue-500' : 'text-slate-400'}`} />
            <h1 className="mb-2 text-3xl font-bold text-slate-800 dark:text-white">Quiz Complete!</h1>
            <p className="mb-4 text-slate-600 dark:text-slate-400">Here's how you performed</p>
            
            <div className="mb-6">
              <span className="text-5xl font-bold text-blue-600 dark:text-blue-400">{result.score}</span>
              <span className="text-2xl text-slate-400 dark:text-slate-500">/{result.totalQuestions}</span>
            </div>

            <div className="mb-6 inline-block rounded-full bg-slate-100 dark:bg-slate-700 px-4 py-2">
              <span className="font-medium text-slate-700 dark:text-slate-300">{result.percentage}%</span>
              <span className="ml-2 text-slate-500 dark:text-slate-400">
                {result.percentage >= 80 ? 'Excellent!' : result.percentage >= 60 ? 'Good job!' : 'Keep practicing!'}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Review</h2>
            {result.questions.map((q, idx) => {
              const userAnswer = result.answers.find(a => a.questionId === q.id);
              const isCorrect = userAnswer?.correct;
              return (
                <div key={q.id} className={`rounded-xl border p-4 ${isCorrect ? 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/20' : 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/20'}`}>
                  <div className="mb-3 flex items-start gap-3">
                    {isCorrect ? (
                      <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500" />
                    ) : (
                      <XCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
                    )}
                    <div>
                      <p className="font-medium text-slate-800 dark:text-white">{idx + 1}. {q.question}</p>
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                        Your answer: <span className={isCorrect ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>{q.options[userAnswer?.selectedAnswer || 0]}</span>
                      </p>
                      {!isCorrect && (
                        <p className="text-sm text-green-600 dark:text-green-400">
                          Correct answer: {q.options[q.correctAnswer]}
                        </p>
                      )}
                      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                        <strong>Explanation:</strong> {q.explanation}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 flex gap-4">
            <button
              onClick={() => router.push('/')}
              className="flex-1 rounded-lg bg-blue-600 dark:bg-blue-600 px-4 py-3 font-medium text-white transition-colors hover:bg-blue-700 dark:hover:bg-blue-500"
            >
              Back to Home
            </button>
            <button
              onClick={() => window.location.reload()}
              className="flex-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3 font-medium text-slate-700 dark:text-slate-300 transition-colors hover:bg-slate-50 dark:hover:bg-slate-600"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const question = questions[currentQuestion];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4 md:p-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200">
            <ArrowLeft className="h-4 w-4" />
            Exit Quiz
          </Link>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            Question {currentQuestion + 1} of {questions.length}
          </span>
        </div>

        <div className="mb-6 rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-6 shadow-lg dark:shadow-slate-900/30 backdrop-blur-sm">
          <div className="mb-4 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Question {currentQuestion + 1}</span>
          </div>
          
          <h2 className="mb-6 text-xl font-bold text-slate-800 dark:text-white">{question?.question}</h2>

          <div className="space-y-3">
            {question?.options.map((option, idx) => (
              <button
                key={idx}
                onClick={() => handleSelectAnswer(question.id, idx)}
                className={`w-full rounded-xl border p-4 text-left transition-all ${
                  selectedAnswers[question.id] === idx
                    ? 'border-blue-500 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/30 ring-2 ring-blue-200 dark:ring-blue-700'
                    : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700/50 hover:border-blue-300 dark:hover:border-blue-500 hover:bg-blue-50/30 dark:hover:bg-blue-900/20'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-medium ${
                    selectedAnswers[question.id] === idx
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-300'
                  }`}>
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className="text-slate-700 dark:text-slate-300">{option}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-4">
          {currentQuestion > 0 && (
            <button
              onClick={() => setCurrentQuestion(prev => prev - 1)}
              className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-6 py-3 font-medium text-slate-700 dark:text-slate-300 transition-colors hover:bg-slate-50 dark:hover:bg-slate-600"
            >
              Previous
            </button>
          )}
          
          {currentQuestion < questions.length - 1 ? (
            <button
              onClick={() => setCurrentQuestion(prev => prev + 1)}
              disabled={selectedAnswers[question?.id] === undefined}
              className="flex-1 rounded-lg bg-blue-600 dark:bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700 dark:hover:bg-blue-500 disabled:opacity-50"
            >
              Next Question
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!allQuestionsAnswered}
              className="flex-1 rounded-lg bg-green-600 dark:bg-green-600 px-6 py-3 font-medium text-white transition-colors hover:bg-green-700 dark:hover:bg-green-500 disabled:opacity-50"
            >
              Submit Quiz
            </button>
          )}
        </div>

        <div className="mt-6 flex justify-center gap-2">
          {questions.map((q, idx) => (
            <button
              key={q.id}
              onClick={() => setCurrentQuestion(idx)}
              className={`h-2 w-2 rounded-full transition-all ${
                idx === currentQuestion
                  ? 'w-6 bg-blue-600 dark:bg-blue-400'
                  : selectedAnswers[q.id] !== undefined
                    ? 'bg-green-400 dark:bg-green-500'
                    : 'bg-slate-300 dark:bg-slate-600'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
