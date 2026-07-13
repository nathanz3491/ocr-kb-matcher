'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import axios from 'axios';
import {
  Home, LayoutDashboard, Brain, BookOpen, GraduationCap, Layers,
  Moon, Sun, FileText, ExternalLink, Menu, X, MessageCircle, Upload,
  Search, Settings, HelpCircle, ChevronRight, ChevronDown, Users, LogOut
} from 'lucide-react';
import { useTheme } from '@/components/theme/ThemeProvider';
import { useAuth } from '@/contexts/AuthContext';
import { PackSwitcher } from '@/components/dashboard/PackSwitcher';
import { cn } from '@/lib/utils';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

const _navItems = [
  { href: '/', label: 'Home', icon: Home, description: 'Dashboard & quick actions' },
  { href: '/import', label: 'Import Content', icon: Upload, description: 'Build your knowledge base' },
  { href: '/learn', label: 'Learn', icon: GraduationCap, description: 'Study with quizzes' },
  { href: '/flashcards', label: 'Flashcards', icon: Layers, description: 'Spaced repetition cards' },
  { href: '/chat', label: 'AI Assistant', icon: MessageCircle, description: 'Chat with your knowledge' },
  { href: '/review', label: 'Review', icon: FileText, description: 'Review sessions' },
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, description: 'Analytics, progress & certificates' },
  { href: '/knowledge-graph', label: 'Knowledge Graph', icon: Brain, description: 'Visualize connections' },
];

const bottomItems = [
  { href: '/docs', label: 'Documentation', icon: ExternalLink },
  { href: '/help', label: 'Help & Support', icon: HelpCircle },
];

export function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const isParent = user?.accountType === 'parent';

  const navItems = [
    { href: '/', label: 'Home', icon: Home, description: 'Dashboard & quick actions' },
    { href: '/import', label: 'Import Content', icon: Upload, description: 'Build your knowledge base' },
    { href: '/learn', label: 'Learn', icon: GraduationCap, description: 'Study with quizzes' },
    { href: '/flashcards', label: 'Flashcards', icon: Layers, description: 'Spaced repetition cards' },
    { href: '/chat', label: 'AI Assistant', icon: MessageCircle, description: 'Chat with your knowledge' },
    { href: '/review', label: 'Review', icon: FileText, description: 'Review sessions' },
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, description: 'Analytics, progress & certificates' },
    { href: '/knowledge-graph', label: 'Knowledge Graph', icon: Brain, description: 'Visualize connections' },
  ];

  // DISABLED for MVP — see COMPLIANCE.md for re-enable conditions
  // if (isParent) {
  //   navItems.push({ href: '/parent-monitor', label: 'Parent Monitor', icon: Users, description: 'Monitor progress' });
  // }

  const [headerOpen, setHeaderOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      const isHeader = headerRef.current?.contains(target);
      const isButton = buttonRef.current?.contains(target);
      const isUserMenu = userMenuRef.current?.contains(target);
      if (!isHeader && !isButton && !isUserMenu) { setHeaderOpen(false); }
      if (!isUserMenu) { setUserMenuOpen(false); }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!headerOpen) { setUserMenuOpen(false); }
  }, [headerOpen]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (searchTimeoutRef.current) { clearTimeout(searchTimeoutRef.current); }
    if (!query.trim()) { setSearchResults([]); return; }
    searchTimeoutRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await axios.get(`${API_BASE_URL}/api/search?q=${encodeURIComponent(query)}`, { withCredentials: true });
        setSearchResults(res.data.results || []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim() && searchResults.length > 0) {
      const firstResult = searchResults[0];
      router.push(firstResult.url || '/');
      setHeaderOpen(false);
      setSearchQuery('');
      setSearchResults([]);
    }
  };

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setHeaderOpen(!headerOpen)}
        className={`fixed left-4 top-4 z-[99999] flex h-14 w-14 items-center justify-center rounded-2xl shadow-2xl backdrop-blur-xl transition-all duration-300 transition-transform ${headerOpen ? theme === 'dark' ? 'bg-slate-700 ring-2 ring-blue-500/30' : 'bg-white ring-2 ring-blue-500/30' : theme === 'dark' ? 'bg-slate-800/90 hover:bg-slate-700 hover:scale-105 active:scale-95' : 'bg-white/90 hover:bg-white hover:scale-105 active:scale-95'}`}
      >
        <div className="relative">
          <Menu className={`h-6 w-6 transition-all duration-300 ${headerOpen ? 'rotate-90 opacity-0' : 'rotate-0 opacity-100'} ${theme === 'dark' ? 'text-white' : 'text-slate-700'}`} />
          <X className={`absolute inset-0 h-6 w-6 transition-all duration-300 ${headerOpen ? 'rotate-0 opacity-100' : '-rotate-90 opacity-0'} ${theme === 'dark' ? 'text-white' : 'text-slate-700'}`} />
        </div>
      </button>

      <div
        ref={headerRef}
        className={`fixed inset-x-0 top-0 z-[99998] transition-all duration-500 ease-out ${headerOpen ? 'translate-y-0 opacity-100' : '-translate-y-[150%] opacity-0 pointer-events-none'}`}
      >
        <div className={`absolute inset-0 transition-opacity duration-500 ${headerOpen ? 'opacity-100' : 'opacity-0'} ${theme === 'dark' ? 'bg-slate-950/95' : 'bg-white/95'} backdrop-blur-2xl`} />

        <div className={`absolute bottom-0 left-0 right-0 h-px transition-opacity duration-500 ${headerOpen ? 'opacity-100' : 'opacity-0'} ${theme === 'dark' ? 'bg-gradient-to-r from-transparent via-blue-500/30 to-transparent' : 'bg-gradient-to-r from-transparent via-blue-400/40 to-transparent'}`} />

        <div className="relative mx-auto w-[90vw] max-w-6xl py-6">
          <div className="flex flex-wrap items-center justify-between gap-4 sm:gap-6 mb-6">
            <Link href="/" className="flex items-center gap-3 shrink-0 group" onClick={() => setHeaderOpen(false)}>
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl shadow-xl transition-all duration-300 group-hover:scale-110 ${theme === 'dark' ? 'bg-gradient-to-br from-blue-600 to-purple-600' : 'bg-gradient-to-br from-blue-500 to-indigo-600'}`}>
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <div>
                <span className={`bg-clip-text text-2xl font-bold transition-all ${theme === 'dark' ? 'bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400' : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600'} text-transparent`}>KIP</span>
                <p className={`text-[10px] font-medium -mt-0.5 tracking-wider ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>KNOWLEDGE INTELLIGENCE PLATFORM</p>
              </div>
            </Link>

            <div className="flex-1 max-w-xs sm:max-w-lg">
              <form onSubmit={handleSearchSubmit} className="relative group">
                <Search className={`absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors z-10 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'} group-focus-within:text-blue-500`} />
                <input
                  type="text"
                  placeholder="Search topics, quizzes, flashcards..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className={`w-full rounded-2xl py-3 pl-12 pr-16 text-sm font-medium transition-all duration-300 ${theme === 'dark' ? 'bg-slate-800/80 text-white placeholder-slate-500 focus:bg-slate-800' : 'bg-slate-100/80 text-slate-700 placeholder-slate-400 focus:bg-white'} border-2 border-transparent focus:border-blue-500/50 focus:shadow-lg focus:shadow-blue-500/10`}
                />
                <kbd className={`absolute right-3 top-1/2 -translate-y-1/2 hidden md:inline-flex h-6 items-center gap-1 rounded-lg px-2 text-xs font-bold transition-colors ${theme === 'dark' ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-500'}`}>
                  <span className="text-[10px]">&#8984;K</span>
                </kbd>

                {searchResults.length > 0 && (
                  <div className={`absolute top-full mt-2 w-full rounded-xl border overflow-hidden z-50 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} shadow-xl`}>
                    {searchResults.map((result, idx) => (
                      <button key={idx} type="button" onClick={() => { router.push(result.url || '/'); setHeaderOpen(false); setSearchQuery(''); setSearchResults([]); }} className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${theme === 'dark' ? 'hover:bg-slate-700 text-white' : 'hover:bg-slate-100 text-slate-700'}`}>
                        <Search className="h-4 w-4 text-blue-500" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{result.title || result.name || result.id}</div>
                          <div className={`text-xs truncate ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{result.subtitle || result.type || result.category}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </form>
            </div>

            <button
              onClick={toggleTheme}
              className={`flex h-12 w-12 items-center justify-center rounded-2xl shrink-0 transition-all duration-300 hover:scale-110 active:scale-95 ${theme === 'dark' ? 'bg-slate-800 hover:bg-slate-700 text-yellow-400' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
              title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            >
              <div className="relative h-5 w-5">
                <Sun className={`absolute inset-0 h-5 w-5 transition-all duration-500 ${theme === 'light' ? 'rotate-0 opacity-100' : '-rotate-90 opacity-0'}`} />
                <Moon className={`absolute inset-0 h-5 w-5 transition-all duration-500 ${theme === 'dark' ? 'rotate-0 opacity-100' : '-rotate-90 opacity-0'}`} />
              </div>
            </button>

            {!user ? (
              <div className="flex items-center gap-3 shrink-0">
                <Link href="/auth/login" onClick={() => setHeaderOpen(false)} className={cn('rounded-xl px-4 py-2 text-sm font-medium transition-all duration-300', theme === 'dark' ? 'text-slate-300 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100')}>Sign In</Link>
                <Link href="/auth/register" onClick={() => setHeaderOpen(false)} className={cn('rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-300', theme === 'dark' ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-500 hover:to-purple-500' : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-400 hover:to-indigo-500')}>Get Started</Link>
              </div>
            ) : (
              <div className="flex items-center gap-3 shrink-0">
                <PackSwitcher />
                <div className="relative shrink-0" ref={userMenuRef}>
                <button
                  onClick={() => { setUserMenuOpen(!userMenuOpen); }}
                  className={cn(
                    'group flex items-center gap-2 rounded-xl px-3 py-2 transition-all duration-300',
                    theme === 'dark'
                      ? 'bg-slate-800/60 hover:bg-slate-700/80 active:scale-95'
                      : 'bg-slate-100/80 hover:bg-slate-200/80 active:scale-95'
                  )}
                >
                  <div className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white transition-all duration-300',
                    'bg-gradient-to-br from-blue-500 to-purple-600 group-hover:from-blue-400 group-hover:to-purple-500 group-hover:shadow-lg group-hover:shadow-blue-500/25 group-hover:scale-105'
                  )}>{user.name?.charAt(0).toUpperCase()}</div>
                  <span className={cn(
                    'text-sm font-medium max-w-[100px] truncate hidden sm:block transition-all duration-200',
                    theme === 'dark' ? 'text-white' : 'text-slate-700'
                  )}>{user.name}</span>
                  <ChevronDown className={cn(
                    'h-4 w-4 transition-all duration-300',
                    userMenuOpen ? 'rotate-180 scale-110' : 'rotate-0 scale-100',
                    theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                  )} />
                </button>

                <div
                  className={cn(
                    'absolute right-0 top-full mt-2 z-50 origin-top-right transition-all duration-300 ease-out',
                    userMenuOpen
                      ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
                      : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
                  )}
                >
                  <div className={cn(
                    'w-56 rounded-xl border overflow-hidden shadow-2xl',
                    theme === 'dark' ? 'bg-slate-800 border-slate-700/80' : 'bg-white border-slate-200/80'
                  )}>
                    <div className={cn(
                      'px-4 py-3.5 border-b transition-all duration-300',
                      theme === 'dark' ? 'border-slate-700/60' : 'border-slate-100/80'
                    )}>
                      <div className={cn(
                        'text-sm font-semibold truncate transition-all duration-200',
                        theme === 'dark' ? 'text-white' : 'text-slate-800'
                      )}>{user.name}</div>
                      <div className={cn(
                        'text-xs truncate mt-0.5 transition-all duration-200',
                        theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                      )}>{user.email}</div>
                    </div>
                    <div className="py-1.5">
                      <Link
                        href="/settings"
                        onClick={() => { setUserMenuOpen(false); setHeaderOpen(false); }}
                        className={cn(
                          'group/item flex items-center gap-3 px-4 py-2.5 mx-1.5 rounded-lg text-sm transition-all duration-200',
                          theme === 'dark'
                            ? 'text-slate-300 hover:text-white hover:bg-blue-500/10 hover:translate-x-0.5'
                            : 'text-slate-600 hover:text-slate-800 hover:bg-blue-50 hover:translate-x-0.5'
                        )}
                      >
                        <span className={cn(
                          'flex h-7 w-7 items-center justify-center rounded-lg transition-all duration-200',
                          theme === 'dark' ? 'bg-slate-700/60 group-hover/item:bg-blue-500/20 group-hover/item:text-blue-400' : 'bg-slate-100 group-hover/item:bg-blue-100 group-hover/item:text-blue-600'
                        )}>
                          <Settings className="h-3.5 w-3.5 transition-transform duration-200 group-hover/item:rotate-45" />
                        </span>
                        <span className="font-medium">Settings</span>
                      </Link>
                      <button
                        onClick={async () => {
                          await logout();
                          localStorage.removeItem('accessToken');
                          localStorage.removeItem('refreshToken');
                          setUserMenuOpen(false);
                          setHeaderOpen(false);
                          window.location.href = '/';
                        }}
                        className={cn(
                          'group/item w-full flex items-center gap-3 px-4 py-2.5 mx-1.5 rounded-lg text-sm transition-all duration-200',
                          theme === 'dark'
                            ? 'text-slate-300 hover:text-red-400 hover:bg-red-500/10 hover:translate-x-0.5'
                            : 'text-slate-600 hover:text-red-600 hover:bg-red-50 hover:translate-x-0.5'
                        )}
                      >
                        <span className={cn(
                          'flex h-7 w-7 items-center justify-center rounded-lg transition-all duration-200',
                          theme === 'dark' ? 'bg-slate-700/60 group-hover/item:bg-red-500/20 group-hover/item:text-red-400' : 'bg-slate-100 group-hover/item:bg-red-100 group-hover/item:text-red-500'
                        )}>
                          <LogOut className="h-3.5 w-3.5 transition-transform duration-200 group-hover/item:-translate-x-0.5" />
                        </span>
                        <span className="font-medium">Sign Out</span>
                      </button>
                    </div>
                  </div>

                  <div className={cn(
                    'absolute -bottom-2 left-0 right-0 h-4',
                    'bg-gradient-to-b from-transparent to-transparent pointer-events-none'
                  )} />
                </div>
              </div>
            </div>
            )}
          </div>

          {user && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                  return (
                    <Link key={item.href} href={item.href} onClick={() => setHeaderOpen(false)} className={`group relative flex items-center gap-4 rounded-2xl p-5 transition-all duration-300 hover:scale-[1.01] ${isActive ? theme === 'dark' ? 'bg-gradient-to-br from-blue-600/30 to-purple-600/20 border-2 border-blue-500/60' : 'bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-300' : theme === 'dark' ? 'bg-slate-800/60 border-2 border-transparent hover:border-slate-600' : 'bg-slate-50/80 border-2 border-transparent hover:border-slate-300'}`}>
                      <div className={`absolute inset-0 rounded-2xl transition-opacity duration-300 ${theme === 'dark' ? 'bg-gradient-to-br from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100' : 'bg-gradient-to-br from-blue-400/10 to-purple-400/10 opacity-0 group-hover:opacity-100'}`} />
                      <div className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-all duration-300 ${isActive ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/30' : theme === 'dark' ? 'bg-slate-700/80 text-slate-300 group-hover:bg-gradient-to-br group-hover:from-blue-600/30 group-hover:to-purple-600/30 group-hover:text-blue-400' : 'bg-slate-200/80 text-slate-600 group-hover:bg-gradient-to-br group-hover:from-blue-100 group-hover:to-purple-100 group-hover:text-blue-600'}`}><Icon className="h-5 w-5" /></div>
                      <div className="relative flex-1 min-w-0">
                        <span className={`block text-sm font-bold truncate transition-colors ${isActive ? theme === 'dark' ? 'text-blue-400' : 'text-blue-700' : theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{item.label}</span>
                        <span className={`block text-sm truncate transition-colors ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{item.description}</span>
                      </div>
                      <ChevronRight className={`relative h-5 w-5 shrink-0 transition-transform duration-300 group-hover:translate-x-1 ${isActive ? theme === 'dark' ? 'text-blue-400' : 'text-blue-500' : theme === 'dark' ? 'text-slate-600' : 'text-slate-400'}`} />
                    </Link>
                  );
                })}
              </div>

              <div className={`flex items-center justify-between mt-6 pt-4 border-t ${theme === 'dark' ? 'border-slate-800' : 'border-slate-100'}`}>
                <div className="flex items-center gap-2">
                  {bottomItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                    return (
                      <Link key={item.href} href={item.href} onClick={() => setHeaderOpen(false)} className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-300 hover:scale-105 ${isActive ? theme === 'dark' ? 'text-blue-400 bg-blue-500/20 hover:text-blue-300' : 'text-blue-600 bg-blue-50 hover:text-blue-700' : theme === 'dark' ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'}`}>
                        <Icon className="h-4 w-4" />{item.label}
                      </Link>
                    );
                  })}
                </div>
                <div className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 ${theme === 'dark' ? 'bg-emerald-900/30 border border-emerald-800/50' : 'bg-emerald-50 border border-emerald-200'}`}>
                  <span className="relative flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span></span>
                  <span className={`text-xs font-bold ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>ONLINE</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {headerOpen && <div className="fixed inset-0 z-[99990] transition-opacity duration-300" onClick={() => setHeaderOpen(false)} />}
    </>
  );
}
