'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Navigation } from '@/components/navigation/Navigation';
import { useToast } from '@/components/notification/Toast';
import {
  Loader2, Sparkles, Flame, CheckCircle, ChevronRight,
  BookOpen, AlertCircle, Brain, Calendar
} from 'lucide-react';
import Link from 'next/link';

interface StudyTask {
  nodeId: string;
  nodeName: string;
  currentMastery: number;
  method: 'flashcard' | 'wrong-question' | 'notes' | 'quiz';
  reason: string;
  priority: number;
}

interface DailyPlan {
  day: string;
  date: string;
  tasks: StudyTask[];
  focusTopic?: string;
}

interface WeeklyStudyPlan {
  weekStartDate: string;
  weekEndDate: string;
  days: DailyPlan[];
  summary: string;
  weakNodes: Array<{ nodeId: string; name: string; mastery: number }>;
  streak: number;
  totalDueReviews: number;
}

function getMethodConfig(method: StudyTask['method']): { label: string; color: string; icon: string } {
  const configs = {
    flashcard: { label: 'Flashcard', color: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300', icon: 'blue' },
    'wrong-question': { label: 'Wrong Question', color: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300', icon: 'amber' },
    notes: { label: 'Notes', color: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300', icon: 'purple' },
    quiz: { label: 'Quiz', color: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300', icon: 'emerald' },
  };
  return configs[method];
}

function getMasteryConfig(mastery: number): { color: string; bg: string } {
  if (mastery < 30) return { color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/40' };
  if (mastery < 50) return { color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/40' };
  return { color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/40' };
}

function getPriorityConfig(priority: number): { label: string; color: string } {
  if (priority === 1) return { label: 'P1', color: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300' };
  if (priority === 2) return { label: 'P2', color: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300' };
  return { label: 'P3', color: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400' };
}

function getTaskHref(task: StudyTask): string {
  switch (task.method) {
    case 'flashcard': return `/flashcards/${task.nodeId}`;
    case 'wrong-question': return `/review?tab=wrong-questions`;
    case 'notes': return `/review/notes/${task.nodeId}`;
    case 'quiz': return `/quiz/topic/${task.nodeId}`;
    default: return `/learn`;
  }
}

function getWeekDays(startDate: Date): DailyPlan[] {
  const days: DailyPlan[] = [];
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    days.push({
      day: dayNames[d.getDay()],
      date: d.toISOString().split('T')[0],
      tasks: [],
    });
  }
  return days;
}

function isToday(dateStr: string): boolean {
  const today = new Date().toISOString().split('T')[0];
  return dateStr === today;
}

export default function StudyPlanPage() {
  const router = useRouter();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [studyPlan, setStudyPlan] = useState<WeeklyStudyPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const today = useMemo(() => new Date().toISOString().split('T')[0], []);
  const todayFormatted = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }, []);

  const weekDays = useMemo(() => {
    if (studyPlan?.days && studyPlan.days.length > 0) {
      return studyPlan.days;
    }
    const start = new Date();
    start.setDate(start.getDate() - start.getDay());
    return getWeekDays(start);
  }, [studyPlan]);

  const selectedDayPlan = useMemo(() => {
    if (selectedDay) {
      return weekDays.find(d => d.date === selectedDay);
    }
    const todayPlan = weekDays.find(d => isToday(d.date));
    return todayPlan || weekDays[0];
  }, [selectedDay, weekDays]);

  const stats = useMemo(() => {
    if (!studyPlan) {
      return { todayTasks: 0, weakNodes: 0, dueReviews: 0, streak: 0 };
    }
    const todayPlan = studyPlan.days.find(d => isToday(d.date));
    return {
      todayTasks: todayPlan?.tasks.length ?? 0,
      weakNodes: studyPlan.weakNodes.length,
      dueReviews: studyPlan.totalDueReviews,
      streak: studyPlan.streak,
    };
  }, [studyPlan]);

  useEffect(() => {
    fetchStudyPlan();
  }, []);

  const fetchStudyPlan = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/api/study-plan');
      const json = await res.json();
      if (json.success) {
        setStudyPlan(json.data);
        const todayPlan = json.data.days.find((d: DailyPlan) => isToday(d.date));
        setSelectedDay(todayPlan?.date ?? null);
      }
    } catch {
      setError('Failed to load study plan. Please try generating one.');
    } finally {
      setLoading(false);
    }
  };

  const generatePlan = async () => {
    setGenerating(true);
    setError(null);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);
    try {
      const res = await api.post('/api/study-plan/generate', {});
      clearTimeout(timeout);
      const json = await res.json();
      if (json.success) {
        setStudyPlan(json.data);
        const todayPlan = json.data.days.find((d: DailyPlan) => isToday(d.date));
        setSelectedDay(todayPlan?.date ?? json.data.days[0]?.date ?? null);
        addToast('Study plan generated!', 'success');
      } else {
        addToast('Failed to generate plan', 'error');
      }
    } catch (err: any) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        addToast('Request timed out. Please try again.', 'error');
        setError('Generation timed out. Please try again.');
      } else {
        addToast('Failed to generate plan', 'error');
        setError('Failed to generate study plan. Please try again.');
      }
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <Navigation />
        <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
          <div className="text-center">
            <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-blue-600 dark:text-blue-400" />
            <p className="text-slate-600 dark:text-slate-400">Loading your study plan...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <Navigation />

      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Weekly Study Plan</h1>
            <p className="mt-1 text-slate-600 dark:text-slate-400">Your personalized learning roadmap</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-500">{todayFormatted}</p>
          </div>
          {studyPlan && (
            <div className="flex items-center gap-2 rounded-full bg-amber-100 dark:bg-amber-900/40 px-4 py-2">
              <Flame className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              <span className="text-sm font-bold text-amber-700 dark:text-amber-300">
                {studyPlan.streak} day streak
              </span>
            </div>
          )}
        </div>

        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-4 text-center backdrop-blur-sm shadow-lg">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.todayTasks}</div>
            <div className="text-sm text-slate-500 dark:text-slate-400">Today&apos;s Tasks</div>
          </div>
          <div className="rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-4 text-center backdrop-blur-sm shadow-lg">
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.weakNodes}</div>
            <div className="text-sm text-slate-500 dark:text-slate-400">Weak Nodes</div>
          </div>
          <div className="rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-4 text-center backdrop-blur-sm shadow-lg">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.dueReviews}</div>
            <div className="text-sm text-slate-500 dark:text-slate-400">Due Reviews</div>
          </div>
          <div className="rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-4 text-center backdrop-blur-sm shadow-lg">
            <div className="flex items-center justify-center gap-1 text-2xl font-bold text-amber-600 dark:text-amber-400">
              <Flame className="h-5 w-5" />
              {stats.streak}
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">Day Streak</div>
          </div>
        </div>

        <div className="mb-6 overflow-x-auto">
          <div className="flex gap-3 pb-2">
            {weekDays.map((day) => {
              const dayIsToday = isToday(day.date);
              const isSelected = selectedDayPlan?.date === day.date;
              const dateObj = new Date(day.date + 'T00:00:00');
              const dayShort = day.day.slice(0, 3);
              const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

              return (
                <button
                  key={day.date}
                  onClick={() => setSelectedDay(day.date)}
                  className={`flex flex-col items-center gap-1 rounded-2xl border p-4 transition-all min-w-[100px] backdrop-blur-sm shadow-lg ${
                    isSelected
                      ? 'border-amber-400 dark:border-amber-500 bg-amber-50/70 dark:bg-amber-900/30 ring-2 ring-amber-300 dark:ring-amber-700'
                      : dayIsToday
                        ? 'border-amber-300 dark:border-amber-700 bg-amber-50/30 dark:bg-amber-900/10'
                        : 'border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 hover:scale-105'
                  }`}
                >
                  <span className={`text-xs font-medium ${dayIsToday ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'}`}>
                    {dayShort}
                  </span>
                  <span className={`text-lg font-bold ${isSelected ? 'text-amber-700 dark:text-amber-300' : dayIsToday ? 'text-amber-600 dark:text-amber-400' : 'text-slate-700 dark:text-slate-300'}`}>
                    {dateObj.getDate()}
                  </span>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                    day.tasks.length > 0
                      ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                  }`}>
                    {day.tasks.length} task{day.tasks.length !== 1 ? 's' : ''}
                  </span>
                  {dayIsToday && (
                    <span className="mt-1 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white">
                      Today
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 dark:border-red-800/50 bg-red-50/70 dark:bg-red-900/30 p-6 text-center backdrop-blur-sm">
            <AlertCircle className="mx-auto mb-3 h-10 w-10 text-red-500" />
            <p className="text-slate-700 dark:text-slate-300">{error}</p>
            <button
              onClick={generatePlan}
              className="mt-4 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-2.5 font-medium text-white shadow-md transition-all hover:from-blue-600 hover:to-indigo-600"
            >
              Try Again
            </button>
          </div>
        )}

        {selectedDayPlan && (
          <div className="rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-6 shadow-lg dark:shadow-slate-900/30 backdrop-blur-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                {selectedDayPlan.day}, {new Date(selectedDayPlan.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </h2>
              {selectedDayPlan.focusTopic && (
                <span className="rounded-full bg-violet-100 dark:bg-violet-900/40 px-3 py-1 text-sm font-medium text-violet-700 dark:text-violet-300">
                  Focus: {selectedDayPlan.focusTopic}
                </span>
              )}
            </div>

            {selectedDayPlan.tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CheckCircle className="mb-3 h-12 w-12 text-emerald-500" />
                <p className="text-lg font-medium text-slate-700 dark:text-slate-300">No tasks scheduled</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Enjoy your rest day or generate a new plan!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {selectedDayPlan.tasks
                  .sort((a, b) => a.priority - b.priority)
                  .map((task, idx) => {
                    const masteryConfig = getMasteryConfig(task.currentMastery);
                    const methodConfig = getMethodConfig(task.method);
                    const priorityConfig = getPriorityConfig(task.priority);
                    const taskHref = getTaskHref(task);

                    return (
                      <div
                        key={`${task.nodeId}-${task.method}-${idx}`}
                        className="group rounded-xl border border-slate-200/60 dark:border-slate-700/50 bg-white/80 dark:bg-slate-700/30 p-4 transition-all hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md"
                      >
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-slate-800 dark:text-slate-200">{task.nodeName}</h3>
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${masteryConfig.bg} ${masteryConfig.color}`}>
                              {task.currentMastery}% mastery
                            </span>
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${methodConfig.color}`}>
                              {methodConfig.label}
                            </span>
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${priorityConfig.color}`}>
                              {priorityConfig.label}
                            </span>
                          </div>
                          <Link
                            href={taskHref}
                            className="flex items-center gap-1 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:from-blue-600 hover:to-indigo-600 hover:shadow-md"
                          >
                            Start
                            <ChevronRight className="h-4 w-4" />
                          </Link>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">{task.reason}</p>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {!studyPlan && !error && !loading && (
          <div className="rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-12 text-center shadow-lg backdrop-blur-sm">
            <Calendar className="mx-auto mb-4 h-16 w-16 text-slate-300 dark:text-slate-500" />
            <h2 className="mb-2 text-xl font-semibold text-slate-800 dark:text-slate-200">No Study Plan Yet</h2>
            <p className="mb-6 text-slate-600 dark:text-slate-400">
              Generate a personalized weekly study plan based on your progress and weakest areas.
            </p>
            <button
              onClick={generatePlan}
              disabled={generating}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-8 py-3 font-semibold text-white shadow-md transition-all hover:from-amber-600 hover:to-orange-600 disabled:opacity-50"
            >
              {generating ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Sparkles className="h-5 w-5" />
              )}
              Generate Your Plan
            </button>
          </div>
        )}

        {studyPlan && (
          <div className="mt-6 flex justify-center">
            <button
              onClick={generatePlan}
              disabled={generating}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-8 py-3 font-semibold text-white shadow-lg transition-all hover:from-amber-600 hover:to-orange-600 hover:shadow-xl disabled:opacity-50"
            >
              {generating ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Sparkles className="h-5 w-5" />
              )}
              {loading ? 'Generating...' : 'Regenerate Plan'}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
