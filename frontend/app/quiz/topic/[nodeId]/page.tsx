'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import { Loader2, CheckCircle, XCircle, ArrowLeft, Trophy, BookOpen, ArrowRight, GripVertical } from 'lucide-react';
import Link from 'next/link';
import { Navigation } from '@/components/navigation/Navigation';
import { useConfetti } from '@/components/ui/Confetti';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

type QuestionType = 'multiple_choice' | 'fill_in_blank' | 'true_false' | 'matching';

interface QuizQuestion {
  id: string;
  type: QuestionType;
  question: string;
  options?: string[];
  correctAnswer?: number; // Required for non-matching questions
  explanation: string;
  // For matching questions
  items?: string[];
  matches?: string[];
  correctMatches?: string[];
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

export default function TopicQuizPage() {
  const params = useParams();
  const router = useRouter();
  const nodeId = params.nodeId as string;
  const { triggerConfetti } = useConfetti();

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
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
    generateQuiz();
  }, [nodeId]);

  const generateQuiz = async () => {
    setGenerating(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/api/quiz/topic/${nodeId}`, {
        topicId: nodeId
      });

      if (res.data.success) {
        setSessionId(res.data.data.sessionId);
        setQuestions(res.data.data.questions);
      } else {
        setQuestions(getDefaultQuestions(nodeId));
        setSessionId(`topic-${nodeId}-${Date.now()}`);
      }
    } catch (err) {
      console.error('Error generating quiz:', err);
      setQuestions(getDefaultQuestions(nodeId));
      setSessionId(`topic-${nodeId}-${Date.now()}`);
    } finally {
      setGenerating(false);
      setLoading(false);
    }
  };

  const getDefaultQuestions = (topicId: string): QuizQuestion[] => {
    return [
      {
        id: 'q1',
        type: 'multiple_choice',
        question: `What is the main definition of "${topicId}"?`,
        options: ['The fundamental principle or concept', 'A historical anecdote', 'An optional sidebar topic', 'A disproven theory'],
        correctAnswer: 0,
        explanation: `This is the fundamental concept of ${topicId}.`
      },
      {
        id: 'q2',
        type: 'multiple_choice',
        question: `Which of the following best describes "${topicId}"?`,
        options: ['A core concept in the subject area', 'An obscure reference', 'A学习方法', 'A deprecated approach'],
        correctAnswer: 0,
        explanation: `${topicId} is a core concept in the subject area.`
      },
      {
        id: 'q3',
        type: 'fill_in_blank',
        question: `Fill in the blank: The key principle of __________ is essential for understanding this topic.`,
        options: [topicId],
        correctAnswer: 0,
        explanation: `Understanding ${topicId} is essential.`
      },
      {
        id: 'q4',
        type: 'true_false',
        question: `True or False: "${topicId}" is an important concept in this subject.`,
        options: ['True', 'False'],
        correctAnswer: 0,
        explanation: `${topicId} is indeed an important concept.`
      },
      {
        id: 'q5',
        type: 'matching',
        question: `Match the concepts related to "${topicId}":`,
        items: ['Definition', 'Application', 'Example'],
        matches: ['The formal meaning', 'Practical use', 'A specific instance'],
        correctMatches: ['The formal meaning', 'Practical use', 'A specific instance'],
        explanation: 'These are the key components of understanding any topic.'
      }
    ];
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
        const correctMatches = q.correctMatches || [];
        // Check if all matches are correct - need to check by index
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

    // Submit to backend to update mastery
    try {
      const res = await axios.post(`${API_BASE_URL}/api/quiz/submit`, { 
        sessionId, 
        answers,
        topicId: nodeId 
      });
      
      if (res.data.success) {
        // Use questions with correct answers and explanations from backend
        const questionsWithAnswers = res.data.data.questions || questions;
        const mockResult: QuizResult = {
          score: correctCount,
          totalQuestions,
          percentage: Math.round((correctCount / totalQuestions) * 100),
          answers,
          questions: questionsWithAnswers
        };
        
        setResult(mockResult);
        setSubmitted(true);
        // Trigger confetti on quiz completion
        triggerConfetti();
        
        // Show mastery increase notification if applicable
        if (res.data.data?.masteryIncrease > 0) {
          console.log(`Mastery increased by ${res.data.data.masteryIncrease}%`);
        }
      }
    } catch (err) {
      console.error('Error submitting quiz to backend:', err);
      // Fallback to local result if API fails
      const mockResult: QuizResult = {
        score: correctCount,
        totalQuestions,
        percentage: Math.round((correctCount / totalQuestions) * 100),
        answers,
        questions: questions
      };
      
      setResult(mockResult);
      setSubmitted(true);
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

  const renderQuestion = (question: QuizQuestion) => {
    switch (question.type) {
      case 'multiple_choice':
        return (
          <div className="space-y-3">
            {question.options?.map((option, idx) => (
              <button
                key={idx}
                onClick={() => handleSelectAnswer(question.id, idx)}
                disabled={submitted}
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
        );

      case 'true_false':
        return (
          <div className="flex gap-4">
            {['True', 'False'].map((option, idx) => (
              <button
                key={idx}
                onClick={() => handleSelectAnswer(question.id, idx)}
                disabled={submitted}
                className={`flex-1 rounded-xl border p-6 text-center text-lg font-medium transition-all ${
                  selectedAnswers[question.id] === idx
                    ? 'border-green-500 dark:border-green-500 bg-green-50 dark:bg-green-900/30 ring-2 ring-green-200 dark:ring-green-700 text-green-700 dark:text-green-400'
                    : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700/50 hover:border-green-300 dark:hover:border-green-500 text-slate-700 dark:text-slate-300'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        );

      case 'fill_in_blank':
        return (
          <div className="space-y-3">
            <input
              type="text"
              value={fillInBlankAnswers[question.id] || ''}
              onChange={(e) => handleFillInBlank(question.id, e.target.value)}
              disabled={submitted}
              placeholder="Type your answer here..."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700/50 p-4 text-slate-700 dark:text-slate-300 placeholder-slate-400 dark:placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-700"
            />
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Type the answer to fill in the blank in the question above.
            </p>
          </div>
        );

      case 'matching':
        return (
          <div className="space-y-6">
            <p className="text-slate-600 dark:text-slate-400">Drag the items from the left to their matching answers on the right:</p>
            
            {/* Available match cards (right side) - using unique IDs to track usage */}
            <div className="mb-6">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3">Available matches (drag these):</p>
              <div className="flex flex-wrap gap-2">
                {question.matches?.map((match, mIdx) => {
                  // Generate unique ID for this match
                  const matchId = `match-${mIdx}`;
                  // Check if this specific match ID is already used
                  const isUsed = Object.values(matchingAnswers).includes(matchId);
                  return (
                    <div
                      key={matchId}
                      draggable={!submitted && !isUsed}
                      onDragStart={(e) => {
                        if (submitted || isUsed) return;
                        // Store both the match ID and the display text
                        e.dataTransfer.setData('matchId', matchId);
                        e.dataTransfer.setData('matchText', match);
                      }}
                      className={`px-4 py-2 rounded-lg border-2 cursor-grab active:cursor-grabbing transition-all ${
                        submitted || isUsed
                          ? 'border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-700 opacity-50 cursor-not-allowed'
                          : 'border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 hover:border-blue-400'
                      }`}
                    >
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{match}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Drop zones (left side items) */}
            <div className="space-y-3">
              {question.items?.map((item, idx) => (
                <div key={idx} className="flex items-center gap-4">
                  {/* Item to match */}
                  <div className="flex-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-700/50 p-4 text-center font-medium text-slate-700 dark:text-slate-200">
                    {item}
                  </div>
                  
                  {/* Drop zone */}
                  <div 
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.add('bg-blue-50', 'dark:bg-blue-900/30', 'border-blue-400');
                    }}
                    onDragLeave={(e) => {
                      e.currentTarget.classList.remove('bg-blue-50', 'dark:bg-blue-900/30', 'border-blue-400');
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove('bg-blue-50', 'dark:bg-blue-900/30', 'border-blue-400');
                      const matchId = e.dataTransfer.getData('matchId');
                      const matchText = e.dataTransfer.getData('matchText');
                      if (matchId && matchText) {
                        handleMatchingSelect(item, matchId);
                      }
                    }}
                    className={`flex-1 min-h-[50px] rounded-lg border-2 border-dashed transition-all flex items-center justify-center ${
                      matchingAnswers[item]
                        ? 'border-green-400 dark:border-green-500 bg-green-50 dark:bg-green-900/20'
                        : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700/50'
                    }`}
                  >
                    {matchingAnswers[item] ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-green-700 dark:text-green-400">
                          {/* Get the display text from matches array using the stored ID */}
                          {question.matches?.[parseInt(matchingAnswers[item].replace('match-', ''))] || 'Matched'}
                        </span>
                        {!submitted && (
                          <button
                            onClick={() => handleMatchingSelect(item, '')}
                            className="ml-2 text-slate-400 hover:text-red-500"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-slate-400 dark:text-slate-500">Drop match here</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Reset button */}
            {Object.keys(matchingAnswers).length > 0 && !submitted && (
              <button
                onClick={() => setMatchingAnswers({})}
                className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                Clear all matches
              </button>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const getQuestionTypeLabel = (type: QuestionType): string => {
    switch (type) {
      case 'multiple_choice': return 'Multiple Choice';
      case 'fill_in_blank': return 'Fill in the Blank';
      case 'true_false': return 'True / False';
      case 'matching': return 'Matching';
      default: return 'Question';
    }
  };

  const getQuestionTypeColor = (type: QuestionType): string => {
    switch (type) {
      case 'multiple_choice': return 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300';
      case 'fill_in_blank': return 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300';
      case 'true_false': return 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300';
      case 'matching': return 'bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300';
      default: return 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300';
    }
  };

  if (loading || generating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <Navigation />
        <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
          <div className="text-center">
            <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-blue-600 dark:text-blue-400" />
            <p className="text-slate-600 dark:text-slate-400">Generating quiz for {nodeId}...</p>
            <p className="text-sm text-slate-500 dark:text-slate-500">AI is creating personalized questions</p>
          </div>
        </div>
      </div>
    );
  }

  if (submitted && result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <Navigation />
        <div className="mx-auto max-w-2xl px-4 py-8">
          <Link href="/learn" className="mb-6 inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200">
            <ArrowLeft className="h-4 w-4" />
            Back to Learning Hub
          </Link>

          <div className="mb-8 rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-8 text-center shadow-lg dark:shadow-slate-900/30 backdrop-blur-sm">
            <Trophy className={`mx-auto mb-4 h-16 w-16 ${result.score >= 4 ? 'text-yellow-500' : result.score >= 3 ? 'text-blue-500' : 'text-slate-400'}`} />
            <h1 className="mb-2 text-3xl font-bold text-slate-800 dark:text-white">Quiz Complete!</h1>
            <p className="mb-4 text-slate-600 dark:text-slate-400">Topic: {nodeId}</p>
            
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
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Q{idx + 1}</span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getQuestionTypeColor(q.type)}`}>
                          {getQuestionTypeLabel(q.type)}
                        </span>
                      </div>
                      <p className="font-medium text-slate-800 dark:text-white">{q.question}</p>
                      
                      {q.type === 'multiple_choice' || q.type === 'true_false' ? (
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                          Your answer: <span className={isCorrect ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                            {q.options?.[userAnswer?.selectedAnswer as number] || 'Not answered'}
                          </span>
                        </p>
                      ) : q.type === 'fill_in_blank' ? (
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                          Your answer: <span className={isCorrect ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                            {userAnswer?.selectedAnswer || 'Not answered'}
                          </span>
                          {!isCorrect && <span className="ml-2">→ Correct: {q.options?.[0]}</span>}
                        </p>
                      ) : q.type === 'matching' ? (
                        <div className="mt-2 text-sm">
                          {q.items?.map((item, itemIdx) => {
                            const userMatch = (userAnswer?.userMatches as Record<string, string>)?.[item];
                            const correctMatch = q.correctMatches?.[itemIdx];
                            const matchCorrect = userMatch === correctMatch;
                            return (
                              <div key={itemIdx} className="mb-1">
                                <span className="text-slate-600 dark:text-slate-400">{item}: </span>
                                <span className={matchCorrect ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                                  {userMatch || 'Not matched'}
                                </span>
                                {!matchCorrect && <span className="ml-1 text-slate-500 dark:text-slate-400">→ {correctMatch}</span>}
                              </div>
                            );
                          })}
                        </div>
                      ) : null}

                      {!isCorrect && q.type !== 'matching' && (
                        <p className="text-sm text-green-600 dark:text-green-400">
                          Correct answer: {q.type === 'fill_in_blank' ? q.options?.[0] : q.options?.[q.correctAnswer ?? 0]}
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
              onClick={() => router.push('/learn')}
              className="flex-1 rounded-lg bg-blue-600 dark:bg-blue-600 px-4 py-3 font-medium text-white transition-colors hover:bg-blue-700 dark:hover:bg-blue-500"
            >
              Back to Learning Hub
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <Navigation />
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/learn" className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200">
            <ArrowLeft className="h-4 w-4" />
            Exit Quiz
          </Link>
          <span className="rounded-full bg-blue-100 dark:bg-blue-900/50 px-3 py-1 text-sm font-medium text-blue-700 dark:text-blue-300">
            {nodeId}
          </span>
        </div>

        <div className="mb-4 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
          <span>Question {currentQuestion + 1} of {questions.length}</span>
          <span>{Math.round(((currentQuestion + 1) / questions.length) * 100)}% complete</span>
        </div>

        <div className="mb-6 rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-6 shadow-lg dark:shadow-slate-900/30 backdrop-blur-sm">
          <div className="mb-4 flex items-center justify-between">
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${getQuestionTypeColor(question?.type || 'multiple_choice')}`}>
              {getQuestionTypeLabel(question?.type || 'multiple_choice')}
            </span>
          </div>
          
          <h2 className="mb-6 text-xl font-bold text-slate-800 dark:text-white">{question?.question}</h2>

          {renderQuestion(question)}
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
              disabled={
                (question?.type === 'multiple_choice' || question?.type === 'true_false') && selectedAnswers[question?.id] === undefined ||
                question?.type === 'fill_in_blank' && !fillInBlankAnswers[question?.id]?.trim() ||
                question?.type === 'matching' && !question?.items?.every(item => matchingAnswers[item])
              }
              className="flex-1 rounded-lg bg-blue-600 dark:bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700 dark:hover:bg-blue-500 disabled:opacity-50"
            >
              Next Question
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!allQuestionsAnswered()}
              className="flex-1 rounded-lg bg-green-600 dark:bg-green-600 px-6 py-3 font-medium text-white transition-colors hover:bg-green-700 dark:hover:bg-green-500 disabled:opacity-50"
            >
              Submit Quiz
            </button>
          )}
        </div>

        <div className="mt-6 flex justify-center gap-2">
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
                className={`h-2 w-2 rounded-full transition-all ${
                  idx === currentQuestion
                    ? 'w-6 bg-blue-600 dark:bg-blue-400'
                    : isAnswered
                      ? 'bg-green-400 dark:bg-green-500'
                      : 'bg-slate-300 dark:bg-slate-600'
                }`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}