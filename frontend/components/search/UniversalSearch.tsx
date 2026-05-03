'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Home, GraduationCap, BarChart3, TrendingUp, Brain, Upload, FolderOpen, Loader2, ArrowRight } from 'lucide-react';
import axios from 'axios';
import { useTheme } from '@/components/theme/ThemeProvider';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  type: 'node' | 'page' | 'domain';
  url: string;
  icon: string;
}

interface SearchResponse {
  query: string;
  results: SearchResult[];
  total: number;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  home: Home,
  graduation: GraduationCap,
  chart: BarChart3,
  trending: TrendingUp,
  network: Brain,
  upload: Upload,
  folder: FolderOpen,
  brain: Brain,
};

function getIcon(iconName: string) {
  const IconComponent = iconMap[iconName] || Brain;
  return <IconComponent className="h-4 w-4" />;
}

export function UniversalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await axios.get<{ success: boolean; data: SearchResponse }>(
          `${API_BASE_URL}/api/search`,
          { params: { q: query } }
        );
        if (res.data.success) {
          setResults(res.data.data.results);
          setIsOpen(true);
        }
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = useCallback((result: SearchResult) => {
    setQuery('');
    setIsOpen(false);
    router.push(result.url);
  }, [router]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : results.length - 1));
        break;
      case 'Enter':
        if (selectedIndex >= 0 && results[selectedIndex]) {
          handleSelect(results[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        inputRef.current?.blur();
        break;
    }
  }, [isOpen, results, selectedIndex, handleSelect]);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'node': return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30';
      case 'page': return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30';
      case 'domain': return 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/30';
      default: return 'text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/50';
    }
  };

  const { theme } = useTheme();

  return (
    <div ref={containerRef} className="relative w-64">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => query && results.length > 0 && setIsOpen(true)}
          placeholder="Search..."
          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 py-2 pl-10 pr-10 text-sm outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-700 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-700 text-slate-800 dark:text-slate-200"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setResults([]);
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {isLoading && (
          <div className="absolute right-10 top-1/2 -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
          </div>
        )}
      </div>

      {/* Dropdown Results */}
      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 max-h-80 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 z-[100]">
          <div className="p-2">
            <div className="mb-2 px-3 py-1 text-xs font-medium text-slate-500 dark:text-slate-400">
              {results.length} result{results.length !== 1 ? 's' : ''} found
            </div>
            {results.map((result, index) => (
              <button
                key={result.id}
                onClick={() => handleSelect(result)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all ${
                  index === selectedIndex 
                    ? 'bg-blue-50 dark:bg-blue-900/30 border-l-2 border-blue-500' 
                    : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                }`}
              >
                <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${getTypeColor(result.type)}`}>
                  {getIcon(result.icon)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-800 dark:text-white truncate">{result.title}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{result.subtitle}</div>
                </div>
                <ArrowRight className="h-4 w-4 flex-shrink-0 text-slate-400" />
              </button>
            ))}
          </div>
          
          {/* Footer */}
          <div className="border-t border-slate-100 dark:border-slate-700 px-3 py-2 text-xs text-slate-400 dark:text-slate-500">
            <span className="flex items-center gap-1">
              Use <kbd className="rounded bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 font-mono text-slate-600 dark:text-slate-300">↑</kbd>
              <kbd className="rounded bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 font-mono text-slate-600 dark:text-slate-300">↓</kbd>
              to navigate, <kbd className="rounded bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 font-mono text-slate-600 dark:text-slate-300">Enter</kbd> to select
            </span>
          </div>
        </div>
      )}

      {/* No results */}
      {isOpen && query && results.length === 0 && !isLoading && (
        <div className="absolute top-full left-0 right-0 mt-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 text-center shadow-lg dark:shadow-slate-900/30">
          <div className="text-sm text-slate-500 dark:text-slate-400">
            No results for "<span className="font-medium text-slate-700 dark:text-slate-300">{query}</span>"
          </div>
          <div className="mt-1 text-xs text-slate-400 dark:text-slate-500">Try searching for pages, topics, or subjects</div>
        </div>
      )}
    </div>
  );
}