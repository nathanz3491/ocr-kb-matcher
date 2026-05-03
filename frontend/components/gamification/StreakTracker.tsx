'use client';

import { useState, useEffect } from 'react';
import { Flame, Trophy, Target, Zap, Calendar } from 'lucide-react';

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  totalDays: number;
  lastActivityDate: string;
  todayCompleted: boolean;
}

interface DailyActivity {
  date: string;
  completed: boolean;
  activities: string[];
}

// Mock data for demonstration
const mockStreakData: StreakData = {
  currentStreak: 7,
  lastActivityDate: new Date().toISOString().split('T')[0],
  longestStreak: 21,
  totalDays: 45,
  todayCompleted: true,
};

const mockDailyActivity: DailyActivity[] = [
  { date: '2026-04-02', completed: true, activities: ['Flashcards', 'Quiz', 'Review'] },
  { date: '2026-04-01', completed: true, activities: ['Flashcards', 'Learning'] },
  { date: '2026-03-31', completed: true, activities: ['Quiz', 'Review'] },
  { date: '2026-03-30', completed: false, activities: [] },
  { date: '2026-03-29', completed: true, activities: ['Flashcards'] },
  { date: '2026-03-28', completed: true, activities: ['Learning', 'Quiz'] },
  { date: '2026-03-27', completed: true, activities: ['Review', 'Flashcards'] },
];

export function StreakTracker() {
  const [streakData, setStreakData] = useState<StreakData>(mockStreakData);
  const [dailyActivity, setDailyActivity] = useState<DailyActivity[]>(mockDailyActivity);

  // Calculate week days
  const today = new Date();
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today);
    date.setDate(date.getDate() - (6 - i));
    return date.toISOString().split('T')[0];
  });

  const getActivityForDate = (dateStr: string) => {
    return dailyActivity.find(d => d.date === dateStr);
  };

  const getDayName = (dateStr: string) => {
    const date = new Date(dateStr);
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
  };

  return (
    <div className="rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-6 shadow-lg dark:shadow-slate-900/30 backdrop-blur-sm">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-500">
            <Flame className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white">Learning Streak</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Keep it going!</p>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1">
            <span className="text-3xl font-bold text-orange-500">{streakData.currentStreak}</span>
            <span className="text-lg text-slate-500 dark:text-slate-400">days</span>
          </div>
          {streakData.todayCompleted && (
            <span className="text-xs font-medium text-green-500">Today completed!</span>
          )}
        </div>
      </div>

      {/* Weekly Activity Grid */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          {weekDays.map((dateStr, idx) => {
            const activity = getActivityForDate(dateStr);
            const isToday = dateStr === today.toISOString().split('T')[0];
            const dayName = getDayName(dateStr);
            
            return (
              <div key={idx} className="flex flex-col items-center gap-2">
                <span className={`text-xs font-medium ${isToday ? 'text-blue-500' : 'text-slate-400 dark:text-slate-500'}`}>
                  {dayName}
                </span>
                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                  activity?.completed 
                    ? 'bg-gradient-to-br from-green-400 to-green-500 text-white' 
                    : isToday
                      ? 'border-2 border-blue-500 bg-transparent'
                      : 'bg-slate-100 dark:bg-slate-700'
                }`}>
                  {activity?.completed && (
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl bg-slate-50 dark:bg-slate-700/50 p-4 text-center">
          <Trophy className="mx-auto mb-2 h-5 w-5 text-yellow-500" />
          <div className="text-lg font-bold text-slate-800 dark:text-white">{streakData.longestStreak}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">Best Streak</div>
        </div>
        <div className="rounded-xl bg-slate-50 dark:bg-slate-700/50 p-4 text-center">
          <Target className="mx-auto mb-2 h-5 w-5 text-blue-500" />
          <div className="text-lg font-bold text-slate-800 dark:text-white">{streakData.totalDays}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">Total Days</div>
        </div>
        <div className="rounded-xl bg-slate-50 dark:bg-slate-700/50 p-4 text-center">
          <Zap className="mx-auto mb-2 h-5 w-5 text-purple-500" />
          <div className="text-lg font-bold text-slate-800 dark:text-white">{dailyActivity.filter(d => d.completed).length}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">This Week</div>
        </div>
      </div>
    </div>
  );
}

// Badge Component
interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
  earnedDate?: string;
  progress?: number;
  target?: number;
}

const badges: Badge[] = [
  { id: 'first-day', name: 'First Step', description: 'Complete your first learning activity', icon: '🌟', earned: true, earnedDate: '2026-03-15' },
  { id: 'streak-7', name: 'Week Warrior', description: 'Maintain a 7-day learning streak', icon: '🔥', earned: true, earnedDate: '2026-03-22' },
  { id: 'streak-21', name: 'Month Master', description: 'Maintain a 21-day learning streak', icon: '🏆', earned: false, progress: 7, target: 21 },
  { id: 'quiz-10', name: 'Quiz Ace', description: 'Complete 10 quizzes with 80%+ score', icon: '📝', earned: true, earnedDate: '2026-03-25' },
  { id: 'quiz-50', name: 'Quiz Champion', description: 'Complete 50 quizzes', icon: '🎯', earned: false, progress: 23, target: 50 },
  { id: 'cards-100', name: 'Flashcard Pro', description: 'Review 100 flashcard sets', icon: '📚', earned: false, progress: 67, target: 100 },
  { id: 'perfect-score', name: 'Perfect Score', description: 'Get 100% on any quiz', icon: '💯', earned: true, earnedDate: '2026-03-28' },
  { id: 'graph-explorer', name: 'Knowledge Explorer', description: 'Explore 10 different knowledge nodes', icon: '🧠', earned: true, earnedDate: '2026-03-20' },
];

interface BadgeDisplayProps {
  limit?: number;
  showAll?: boolean;
}

export function BadgeDisplay({ limit, showAll = false }: BadgeDisplayProps) {
  const displayBadges = showAll ? badges : badges.slice(0, limit || badges.length);
  const earnedCount = badges.filter(b => b.earned).length;

  return (
    <div className="rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-6 shadow-lg dark:shadow-slate-900/30 backdrop-blur-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xl font-bold text-slate-800 dark:text-white">Achievements</h3>
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {earnedCount}/{badges.length} earned
        </span>
      </div>

      <div className="grid grid-cols-4 gap-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-4">
        {displayBadges.map((badge) => (
          <div
            key={badge.id}
            className={`group relative flex flex-col items-center rounded-xl p-3 transition-all ${
              badge.earned
                ? 'bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20'
                : 'bg-slate-50 dark:bg-slate-700/50 opacity-60'
            }`}
          >
            <div className={`text-3xl ${badge.earned ? '' : 'grayscale'}`}>
              {badge.icon}
            </div>
            <span className="mt-1 text-xs font-medium text-slate-700 dark:text-slate-300 text-center truncate w-full">
              {badge.name}
            </span>
            
            {/* Progress indicator for unearned badges */}
            {badge.progress !== undefined && badge.target && (
              <div className="mt-1 h-1 w-full rounded-full bg-slate-200 dark:bg-slate-600">
                <div 
                  className="h-1 rounded-full bg-blue-500"
                  style={{ width: `${(badge.progress / badge.target) * 100}%` }}
                />
              </div>
            )}

            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 z-10 mb-2 w-48 -translate-x-1/2 rounded-lg bg-slate-800 px-3 py-2 text-xs text-white opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
              <div className="font-medium">{badge.description}</div>
              {badge.earnedDate && (
                <div className="mt-1 text-slate-400">Earned: {badge.earnedDate}</div>
              )}
              {badge.progress !== undefined && badge.target && (
                <div className="mt-1 text-blue-400">{badge.progress}/{badge.target}</div>
              )}
              <div className="absolute bottom-0 left-1/2 -mb-1 h-2 w-2 -translate-x-1/2 rotate-45 bg-slate-800" />
            </div>
          </div>
        ))}
      </div>

      {!showAll && badges.length > 8 && (
        <button className="mt-4 w-full rounded-lg border border-slate-200 dark:border-slate-600 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
          View All Badges
        </button>
      )}
    </div>
  );
}