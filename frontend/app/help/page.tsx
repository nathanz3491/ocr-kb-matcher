'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/navigation/Navigation';
import { useTheme } from '@/components/theme/ThemeProvider';
import {
  HelpCircle, Mail, MessageCircle, BookOpen, Sparkles,
  ChevronRight, ExternalLink, Zap, Brain, FileText, Award,
  ArrowRight, Upload, GraduationCap, BarChart3, Layers,
  ChevronDown, ChevronUp, Lightbulb, Search, Send, BookMarked
} from 'lucide-react';
import { clsx } from 'clsx';

// ─── Shared Glass Card ───────────────────────────────────────────────────────
function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-6 backdrop-blur-md shadow-lg dark:shadow-slate-900/30 ${className}`}>
      {children}
    </div>
  );
}

// ─── Decorative Orb ──────────────────────────────────────────────────────────
function DecorativeOrb({ className }: { className: string }) {
  return <div className={`absolute rounded-full bg-gradient-to-br opacity-50 pointer-events-none ${className}`} />;
}

// ─── FAQ Accordion Item ──────────────────────────────────────────────────────
function FAQItem({ question, answer, isOpen, onToggle }: {
  question: string; answer: string; isOpen: boolean; onToggle: () => void;
}) {
  const { theme } = useTheme();
  return (
    <div
      className={clsx(
        'rounded-xl border transition-all duration-300',
        isOpen
          ? theme === 'dark'
            ? 'border-violet-500/40 bg-violet-900/20'
            : 'border-violet-200 bg-violet-50/80'
          : theme === 'dark'
            ? 'border-slate-700/40 bg-slate-800/40 hover:border-slate-600/50'
            : 'border-slate-200/60 bg-white/50 hover:border-slate-300/80'
      )}
    >
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 p-4 text-left"
      >
        <span className={clsx(
          'font-semibold text-sm transition-colors',
          isOpen
            ? 'text-violet-700 dark:text-violet-300'
            : 'text-slate-800 dark:text-slate-100'
        )}>
          {question}
        </span>
        <div className={clsx(
          'flex h-6 w-6 shrink-0 items-center justify-center rounded-lg transition-all duration-300',
          isOpen
            ? 'bg-violet-500/20 text-violet-600 dark:text-violet-400 rotate-180'
            : 'bg-slate-100 dark:bg-slate-700 text-slate-400'
        )}>
          <ChevronDown className="h-3.5 w-3.5 transition-transform duration-300" />
        </div>
      </button>
      <div className={clsx(
        'overflow-hidden transition-all duration-300',
        isOpen ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'
      )}>
        <p className="px-4 pb-4 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          {answer}
        </p>
      </div>
    </div>
  );
}

// ─── Section Label ───────────────────────────────────────────────────────────
function SectionLabel({ icon, text, color }: { icon: React.ReactNode; text: string; color: string }) {
  const colorMap: Record<string, string> = {
    blue: 'text-blue-600 dark:text-blue-400',
    violet: 'text-violet-600 dark:text-violet-400',
    rose: 'text-rose-600 dark:text-rose-400',
    emerald: 'text-emerald-600 dark:text-emerald-400',
    amber: 'text-amber-600 dark:text-amber-400',
    cyan: 'text-cyan-600 dark:text-cyan-400',
  };
  return (
    <div className={clsx('mb-2 flex items-center gap-2', colorMap[color] || colorMap.blue)}>
      {icon}
      <span className="text-xs font-bold uppercase tracking-wider">{text}</span>
    </div>
  );
}

// ─── Data ────────────────────────────────────────────────────────────────────
const FAQS = [
  {
    question: 'How do I upload learning materials?',
    answer: 'Click on "Import Content" in the navigation menu. You can upload images (JPG, PNG, PDF) or paste text directly. The AI will automatically extract and organize the knowledge points.',
  },
  {
    question: 'How does the knowledge graph work?',
    answer: 'The knowledge graph visualizes connections between topics. Green nodes are topics you\'ve learned, gray nodes are not yet studied. The graph helps you understand prerequisite relationships.',
  },
  {
    question: 'How do I generate quizzes?',
    answer: 'Go to the "Learn" page, select a topic, and click "Start Quiz". The AI will generate personalized questions based on your learning progress and knowledge gaps.',
  },
  {
    question: 'Can I use this offline?',
    answer: 'Yes! The app caches your knowledge graph locally. Enable offline mode in Settings for the best experience when you don\'t have internet access.',
  },
  {
    question: 'How do flashcard work?',
    answer: 'Flashcards use spaced repetition (SM-2 algorithm) to optimize memory. Cards you know well appear less frequently, while difficult cards appear more often.',
  },
];

const QUICK_LINKS = [
  {
    href: '/import',
    icon: <Upload className="h-5 w-5 text-white" />,
    iconBg: 'bg-gradient-to-br from-blue-500 to-indigo-600',
    color: 'blue',
    title: 'Import Content',
    desc: 'Upload images, PDFs, or paste text',
    badge: 'Start',
  },
  {
    href: '/learn',
    icon: <GraduationCap className="h-5 w-5 text-white" />,
    iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-600',
    color: 'emerald',
    title: 'Learn',
    desc: 'AI quizzes tailored to your level',
    badge: 'Practice',
  },
  {
    href: '/knowledge-graph',
    icon: <Brain className="h-5 w-5 text-white" />,
    iconBg: 'bg-gradient-to-br from-violet-500 to-purple-600',
    color: 'violet',
    title: 'Knowledge Graph',
    desc: 'Visualize topic connections',
    badge: 'Explore',
  },
  {
    href: '/certificates',
    icon: <Award className="h-5 w-5 text-white" />,
    iconBg: 'bg-gradient-to-br from-amber-500 to-orange-600',
    color: 'amber',
    title: 'Certificates',
    desc: 'Track achievements and earned certs',
    badge: 'View',
  },
];

const KEY_FEATURES = [
  {
    icon: <Brain className="h-6 w-6 text-white" />,
    iconBg: 'bg-gradient-to-br from-violet-500 to-purple-600',
    title: 'AI Knowledge Extraction',
    description: 'Automatically identify key concepts from your materials',
    color: 'violet',
  },
  {
    icon: <Sparkles className="h-6 w-6 text-white" />,
    iconBg: 'bg-gradient-to-br from-rose-500 to-pink-600',
    title: 'Smart Quiz Generation',
    description: 'AI-generated questions tailored to your level',
    color: 'rose',
  },
  {
    icon: <Layers className="h-6 w-6 text-white" />,
    iconBg: 'bg-gradient-to-br from-blue-500 to-indigo-600',
    title: 'Spaced Repetition',
    description: 'Scientific flashcard review system',
    color: 'blue',
  },
  {
    icon: <Award className="h-6 w-6 text-white" />,
    iconBg: 'bg-gradient-to-br from-amber-500 to-orange-600',
    title: 'Certificates',
    description: 'Earn achievements for your progress',
    color: 'amber',
  },
];

// ─── Page ────────────────────────────────────────────────────────────────────
export default function HelpPage() {
  const { theme } = useTheme();
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <Navigation />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-4 pt-20 pb-14">
        <DecorativeOrb className="from-blue-400/25 to-transparent -right-16 -top-16 h-64 w-64 dark:from-blue-600/15" />
        <DecorativeOrb className="from-violet-400/20 to-transparent -left-12 bottom-0 h-44 w-44 dark:from-violet-600/10" />
        <DecorativeOrb className="from-indigo-400/15 to-transparent right-1/3 top-24 h-28 w-28 dark:from-indigo-600/8" />

        <div className="relative z-10 mx-auto max-w-4xl text-center px-4">
          {/* Badge */}
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-200 dark:border-blue-800 bg-blue-50/80 dark:bg-blue-900/30 px-4 py-1.5 backdrop-blur-sm">
            <HelpCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Help &amp; Support Center</span>
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
            <span className="text-slate-900 dark:text-white">Need </span>
            <span className="bg-gradient-to-r from-blue-600 via-violet-600 to-indigo-600 bg-clip-text text-transparent dark:from-blue-400 dark:via-violet-400 dark:to-indigo-400">
              Help?
            </span>
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
            Everything you need to get started with{' '}
            <span className="font-semibold text-slate-800 dark:text-slate-200">Knowledge Intelligence Platform</span>.
            Find answers, explore features, or reach out for support.
          </p>

          {/* Quick search hint */}
          <div className="mt-7 inline-flex items-center gap-2 rounded-xl border border-slate-200/60 dark:border-slate-700/60 bg-white/80 dark:bg-slate-800/80 px-5 py-2.5 shadow-md backdrop-blur-sm">
            <Search className="h-4 w-4 text-slate-400" />
            <span className="text-sm text-slate-400">Browse FAQ below or</span>
            <a
              href="mailto:zimonathanzhou@outlook.com?subject=KIP%20Support%20Request"
              className="text-sm font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
            >
              contact support
            </a>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 pb-16 space-y-14">

        {/* ── Section 1: Quick Links ───────────────────────────────────────── */}
        <section>
          <div className="mb-6">
            <SectionLabel icon={<BookMarked className="h-3.5 w-3.5" />} text="Quick Access" color="blue" />
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">Jump Right In</h2>
            <p className="mt-1 text-slate-600 dark:text-slate-400">The fastest paths to common tasks.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {QUICK_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="group relative flex items-center gap-4 rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-5 backdrop-blur-md shadow-lg dark:shadow-slate-900/30 transition-all duration-300 hover:scale-[1.01] hover:shadow-xl hover:border-blue-300 dark:hover:border-blue-600 overflow-hidden"
              >
                <div className={`absolute -right-3 -top-3 h-16 w-16 rounded-full bg-gradient-to-br ${link.iconBg} opacity-30 dark:opacity-15`} />
                <div className={`relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${link.iconBg} shadow-md transition-transform duration-300 group-hover:scale-110`}>
                  {link.icon}
                </div>
                <div className="relative z-10 min-w-0 flex-1">
                  <div className="mb-0.5 flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-800 dark:text-white">{link.title}</h4>
                    <span className="rounded-full bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-400">{link.badge}</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{link.desc}</p>
                </div>
                <ChevronRight className="relative z-10 h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5" />
              </Link>
            ))}
          </div>
        </section>

        {/* ── Section 2: FAQ Accordion ───────────────────────────────────── */}
        <section>
          <div className="mb-6">
            <SectionLabel icon={<MessageCircle className="h-3.5 w-3.5" />} text="FAQ" color="violet" />
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">Frequently Asked Questions</h2>
            <p className="mt-1 text-slate-600 dark:text-slate-400">Click any question to reveal the answer.</p>
          </div>

          <GlassCard>
            <div className="space-y-3">
              {FAQS.map((faq, idx) => (
                <FAQItem
                  key={idx}
                  question={faq.question}
                  answer={faq.answer}
                  isOpen={openFAQ === idx}
                  onToggle={() => setOpenFAQ(openFAQ === idx ? null : idx)}
                />
              ))}
            </div>
          </GlassCard>
        </section>

        {/* ── Section 3: Key Features ─────────────────────────────────────── */}
        <section>
          <div className="mb-6">
            <SectionLabel icon={<Zap className="h-3.5 w-3.5" />} text="Platform Features" color="rose" />
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">What KIP Offers</h2>
            <p className="mt-1 text-slate-600 dark:text-slate-400">Intelligent tools built for better learning.</p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {KEY_FEATURES.map((feature) => (
              <GlassCard key={feature.title} className="group relative overflow-hidden hover:scale-[1.01] transition-transform duration-200">
                <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-gradient-to-br from-white/20 to-transparent dark:from-white/5 pointer-events-none" />
                <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${feature.iconBg} shadow-md transition-transform duration-300 group-hover:scale-110`}>
                  {feature.icon}
                </div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-white">{feature.title}</h4>
                <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{feature.description}</p>
              </GlassCard>
            ))}
          </div>
        </section>

        {/* ── Section 4: Contact & Support ─────────────────────────────────── */}
        <section>
          <div className="mb-6">
            <SectionLabel icon={<Mail className="h-3.5 w-3.5" />} text="Get In Touch" color="amber" />
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">Contact &amp; Support</h2>
            <p className="mt-1 text-slate-600 dark:text-slate-400">Have questions or need personalized help?</p>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-white/40 dark:border-slate-700/50 bg-gradient-to-br from-violet-600/95 to-indigo-700/95 dark:from-violet-700/80 dark:to-indigo-800/80 p-8 shadow-2xl backdrop-blur-md text-center">
            <div className="absolute -right-6 -top-6 h-36 w-36 rounded-full bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
            <div className="absolute -left-6 -bottom-6 h-28 w-28 rounded-full bg-gradient-to-tr from-white/10 to-transparent pointer-events-none" />

            <div className="relative z-10">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm shadow-lg">
                <Mail className="h-7 w-7 text-white" />
              </div>

              <h3 className="text-xl font-extrabold text-white">Can&apos;t find what you need?</h3>
              <p className="mx-auto mt-3 max-w-md text-blue-100 text-sm leading-relaxed">
                Send an email and I&apos;ll get back to you within 24–48 hours. Please include as much detail as possible about your issue or question.
              </p>

              <a
                href="mailto:zimonathanzhou@outlook.com?subject=KIP%20Support%20Request"
                className="mt-7 inline-flex items-center gap-2.5 rounded-xl bg-white px-7 py-3.5 text-sm font-bold text-violet-700 shadow-xl transition-all hover:scale-105 hover:bg-blue-50 hover:shadow-2xl"
              >
                <Send className="h-4 w-4" />
                Send Email to Support
                <ExternalLink className="h-3.5 w-3.5 opacity-70" />
              </a>

              <div className="mt-6 rounded-lg border border-white/20 bg-white/10 px-4 py-2.5 backdrop-blur-sm">
                <span className="text-sm font-medium text-blue-100">zimonathanzhou@outlook.com</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Section 5: Still Learning? ─────────────────────────────────── */}
        <section>
          <div className="relative overflow-hidden rounded-2xl border border-white/40 dark:border-slate-700/50 bg-gradient-to-br from-slate-100/90 to-blue-50/90 dark:from-slate-800/90 dark:to-slate-800/70 p-8 backdrop-blur-md shadow-lg">
            <div className="absolute -right-4 -top-4 h-28 w-28 rounded-full bg-gradient-to-br from-blue-400/20 to-transparent dark:from-blue-600/10 pointer-events-none" />
            <div className="absolute -left-4 bottom-0 h-24 w-24 rounded-full bg-gradient-to-tr from-violet-400/15 to-transparent dark:from-violet-600/8 pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center text-center sm:flex-row sm:text-left gap-6">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg">
                <Lightbulb className="h-7 w-7 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Still learning how it all works?</h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-lg">
                  Check out the full documentation for a complete walkthrough of every feature, import mode, and learning workflow.
                </p>
              </div>
              <Link
                href="/docs"
                className="shrink-0 flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl hover:scale-105"
              >
                View Docs
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <div className="flex flex-col items-center gap-3 pt-4 border-t border-slate-200/40 dark:border-slate-700/40">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-violet-500 dark:text-violet-400" />
            <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">Knowledge Intelligence Platform</span>
            <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-bold text-slate-500 dark:text-slate-400">v1.0.0</span>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500">Made with intention for better learning</p>
        </div>

      </div>
    </div>
  );
}
