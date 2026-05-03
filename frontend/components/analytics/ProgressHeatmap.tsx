'use client';

import { useState, useEffect } from 'react';

interface HeatmapData {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

// Generate mock data for the last 12 weeks
const generateHeatmapData = (): HeatmapData[] => {
  const data: HeatmapData[] = [];
  const today = new Date();
  
  for (let i = 83; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    // Random activity level (weighted towards lower levels)
    const rand = Math.random();
    let count = 0;
    let level: 0 | 1 | 2 | 3 | 4 = 0;
    
    if (rand > 0.7) {
      count = Math.floor(Math.random() * 5) + 1;
      level = count >= 4 ? 4 : count >= 2 ? 2 : 1;
    } else if (rand > 0.4) {
      count = Math.floor(Math.random() * 3) + 1;
      level = count >= 2 ? 2 : 1;
    }
    
    data.push({ date: dateStr, count, level });
  }
  
  return data;
};

const getLevelColor = (level: number, isDark: boolean): string => {
  const colors = isDark 
    ? ['bg-slate-800', 'bg-emerald-900', 'bg-emerald-700', 'bg-emerald-500', 'bg-emerald-400']
    : ['bg-slate-100', 'bg-emerald-200', 'bg-emerald-400', 'bg-emerald-500', 'bg-emerald-600'];
  return colors[level] || colors[0];
};

const getMonthLabel = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short' });
};

export function ProgressHeatmap() {
  const [heatmapData, setHeatmapData] = useState<HeatmapData[]>([]);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setHeatmapData(generateHeatmapData());
    // Check theme
    const theme = localStorage.getItem('theme');
    setIsDark(theme === 'dark');
  }, []);

  // Group by weeks (7 days each)
  const weeks: HeatmapData[][] = [];
  for (let i = 0; i < heatmapData.length; i += 7) {
    weeks.push(heatmapData.slice(i, i + 7));
  }

  // Get unique months for labels
  const monthLabels: { month: string; weekIndex: number }[] = [];
  weeks.forEach((week, idx) => {
    const firstDay = week[0];
    if (firstDay) {
      const month = getMonthLabel(firstDay.date);
      const lastLabel = monthLabels[monthLabels.length - 1];
      if (!lastLabel || lastLabel.month !== month) {
        monthLabels.push({ month, weekIndex: idx });
      }
    }
  });

  const getDayLabel = (day: number): string => ['Mon', '', 'Wed', '', 'Fri', '', ''][day] || '';

  const totalActivities = heatmapData.reduce((sum, d) => sum + d.count, 0);
  const activeDays = heatmapData.filter(d => d.count > 0).length;
  const currentStreak = (() => {
    let streak = 0;
    for (let i = heatmapData.length - 1; i >= 0; i--) {
      if (heatmapData[i].count > 0) streak++;
      else break;
    }
    return streak;
  })();

  return (
    <div className="rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-6 shadow-lg dark:shadow-slate-900/30 backdrop-blur-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-white">Activity Heatmap</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Your learning activity over time</p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="text-center">
            <div className="font-bold text-slate-800 dark:text-white">{totalActivities}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Total</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-slate-800 dark:text-white">{activeDays}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Days</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-slate-800 dark:text-white">{currentStreak}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Streak</div>
          </div>
        </div>
      </div>

      {/* Month Labels */}
      <div className="mb-2 flex pl-8">
        {monthLabels.map((label, idx) => (
          <div
            key={idx}
            className="text-xs text-slate-400 dark:text-slate-500"
            style={{ 
              marginLeft: idx === 0 ? 0 : `${(label.weekIndex - (monthLabels[idx - 1]?.weekIndex || 0)) * 2.5 - 20}rem`
            }}
          >
            {label.month}
          </div>
        ))}
      </div>

      {/* Heatmap Grid */}
      <div className="flex gap-1">
        {/* Day Labels */}
        <div className="flex flex-col gap-1 pr-2">
          {getDayLabel(0) && <div className="h-5 text-xs text-slate-400 dark:text-slate-500">Mon</div>}
          {getDayLabel(2) && <div className="h-5 text-xs text-slate-400 dark:text-slate-500">Wed</div>}
          {getDayLabel(4) && <div className="h-5 text-xs text-slate-400 dark:text-slate-500">Fri</div>}
        </div>

        {/* Weeks */}
        <div className="flex gap-1 overflow-x-auto">
          {weeks.map((week, weekIdx) => (
            <div key={weekIdx} className="flex flex-col gap-1">
              {week.map((day, dayIdx) => (
                <div
                  key={dayIdx}
                  className={`h-5 w-5 rounded-sm ${getLevelColor(day.level, isDark)} transition-all hover:ring-2 hover:ring-blue-400`}
                  title={`${day.date}: ${day.count} activities`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-end gap-2">
        <span className="text-xs text-slate-400 dark:text-slate-500">Less</span>
        <div className="flex gap-1">
          {[0, 1, 2, 3, 4].map(level => (
            <div
              key={level}
              className={`h-4 w-4 rounded-sm ${getLevelColor(level, isDark)}`}
            />
          ))}
        </div>
        <span className="text-xs text-slate-400 dark:text-slate-500">More</span>
      </div>
    </div>
  );
}