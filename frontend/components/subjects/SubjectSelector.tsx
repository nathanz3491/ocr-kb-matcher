'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { BookOpen, Calculator, FlaskConical, Scroll, Languages, Code, ChevronDown, Lock, Sparkles } from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

interface Subject {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  totalNodes: number;
  learnedNodes: number;
  status: 'active' | 'coming_soon' | 'beta';
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Calculator,
  FlaskConical,
  Scroll,
  Languages,
  Code,
  BookOpen
};

const colorMap: Record<string, string> = {
  blue: 'from-blue-500 to-blue-600',
  green: 'from-emerald-500 to-emerald-600',
  amber: 'from-amber-500 to-amber-600',
  violet: 'from-violet-500 to-violet-600',
  cyan: 'from-cyan-500 to-cyan-600'
};

export function SubjectSelector() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [currentSubject, setCurrentSubject] = useState<Subject | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const [subjectsRes, currentRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/subjects`),
          axios.get(`${API_BASE_URL}/api/subjects/current`)
        ]);
        
        if (subjectsRes.data.success) {
          setSubjects(subjectsRes.data.data);
        }
        if (currentRes.data.success) {
          setCurrentSubject(currentRes.data.data);
        }
      } catch (err) {
        console.error('Error fetching subjects:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSubjects();
  }, []);

  const handleSwitchSubject = async (subjectId: string) => {
    if (subjectId === currentSubject?.id) {
      setIsOpen(false);
      return;
    }

    try {
      const res = await axios.post(`${API_BASE_URL}/api/subjects/switch`, { subjectId });
      if (res.data.success) {
        setCurrentSubject(res.data.data);
        setIsOpen(false);
        // Reload page to refresh data for new subject
        window.location.reload();
      }
    } catch (err) {
      console.error('Error switching subject:', err);
    }
  };

  if (loading || !currentSubject) {
    return (
      <div className="h-10 w-32 animate-pulse rounded-lg bg-white/50" />
    );
  }

  const CurrentIcon = iconMap[currentSubject.icon] || BookOpen;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg border border-white/40 bg-white/70 px-3 py-2 text-sm font-medium text-slate-700 shadow-sm backdrop-blur-sm transition-all hover:bg-white/90"
      >
        <div className={`rounded-md bg-gradient-to-br ${colorMap[currentSubject.color] || 'from-blue-500 to-blue-600'} p-1`}>
          <CurrentIcon className="h-3.5 w-3.5 text-white" />
        </div>
        <span className="hidden sm:inline">{currentSubject.name}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 z-50 mt-2 w-72 rounded-xl border border-white/40 bg-white/90 p-2 shadow-xl backdrop-blur-md">
            <div className="mb-2 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Select Subject
            </div>
            {subjects.map((subject) => {
              const Icon = iconMap[subject.icon] || BookOpen;
              const isActive = subject.id === currentSubject.id;
              const isComingSoon = subject.status === 'coming_soon';
              
              return (
                <button
                  key={subject.id}
                  onClick={() => !isComingSoon && handleSwitchSubject(subject.id)}
                  disabled={isComingSoon}
                  className={`flex w-full items-start gap-3 rounded-lg p-3 text-left transition-all ${
                    isActive 
                      ? 'bg-blue-50/80 dark:bg-blue-900/30 ring-1 ring-blue-200 dark:ring-blue-700' 
                      : isComingSoon
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:bg-white/60 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className={`rounded-lg bg-gradient-to-br ${colorMap[subject.color] || 'from-blue-500 to-blue-600'} p-2`}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${isActive ? 'text-blue-700 dark:text-blue-300' : 'text-slate-800 dark:text-white'}`}>
                        {subject.name}
                      </span>
                      {subject.status === 'beta' && (
                        <span className="rounded-full bg-amber-100 dark:bg-amber-900/50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                          Beta
                        </span>
                      )}
                      {isComingSoon && (
                        <span className="rounded-full bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-400">
                          Soon
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                      {subject.description}
                    </p>
                    {subject.totalNodes > 0 && (
                      <div className="mt-1.5 flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
                        <span className="font-medium text-green-600 dark:text-green-400">{subject.learnedNodes}</span>
                        <span>/</span>
                        <span>{subject.totalNodes}</span>
                        <span>learned</span>
                      </div>
                    )}
                  </div>
                  {isActive && <Sparkles className="h-4 w-4 text-blue-500" />}
                  {isComingSoon && <Lock className="h-4 w-4 text-slate-400" />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
