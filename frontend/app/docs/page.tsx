'use client';

import { Navigation } from '@/components/navigation/Navigation';
import {
  BookOpen, Brain, BarChart3, GraduationCap, Layers, Upload,
  Sparkles, Target, Clock, FileText, MessageCircle, ChevronRight,
  ArrowRight, CheckCircle, Lightbulb, TrendingUp, FileWarning,
  ListChecks, ScanText, Globe, Star, Award, Zap
} from 'lucide-react';
import Link from 'next/link';

// ─── Shared Glass Card ───────────────────────────────────────────────────────
function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-6 backdrop-blur-md shadow-lg dark:shadow-slate-900/30 ${className}`}>
      {children}
    </div>
  );
}

// ─── Decorative Shape ────────────────────────────────────────────────────────
function DecorativeOrb({ className }: { className: string }) {
  return <div className={`absolute rounded-full bg-gradient-to-br opacity-50 pointer-events-none ${className}`} />;
}

// ─── Feature Badge ───────────────────────────────────────────────────────────
function FeatureBadge({ icon, label, color }: { icon: React.ReactNode; label: string; color: string }) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400',
    violet: 'bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400',
    rose: 'bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400',
    emerald: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400',
    amber: 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400',
    cyan: 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-600 dark:text-cyan-400',
    indigo: 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400',
    orange: 'bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400',
    pink: 'bg-pink-100 dark:bg-pink-900/40 text-pink-600 dark:text-pink-400',
  };
  const cls = colorMap[color] || colorMap.blue;
  return (
    <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${cls}`}>
      {icon}
      {label}
    </div>
  );
}

// ─── Step Card ───────────────────────────────────────────────────────────────
function StepCard({ number, title, description, icon, color }: {
  number: string; title: string; description: string; icon: React.ReactNode; color: string;
}) {
  const colorMap: Record<string, { bg: string; iconBg: string; badge: string }> = {
    blue: { bg: 'bg-blue-100 dark:bg-blue-900/30', iconBg: 'bg-gradient-to-br from-blue-500 to-indigo-600', badge: 'bg-blue-500' },
    violet: { bg: 'bg-violet-100 dark:bg-violet-900/30', iconBg: 'bg-gradient-to-br from-violet-500 to-purple-600', badge: 'bg-violet-500' },
    rose: { bg: 'bg-rose-100 dark:bg-rose-900/30', iconBg: 'bg-gradient-to-br from-rose-500 to-pink-600', badge: 'bg-rose-500' },
    amber: { bg: 'bg-amber-100 dark:bg-amber-900/30', iconBg: 'bg-gradient-to-br from-amber-500 to-orange-600', badge: 'bg-amber-500' },
    emerald: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-600', badge: 'bg-emerald-500' },
  };
  const c = colorMap[color] || colorMap.blue;
  return (
    <div className="relative flex gap-4">
      <div className="flex flex-col items-center">
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${c.iconBg} shadow-lg`}>
          {icon}
        </div>
        <div className="mt-2 h-full w-0.5 flex-1 bg-gradient-to-b from-slate-300 to-transparent dark:from-slate-600 dark:to-transparent" />
      </div>
      <div className="flex-1 pb-8">
        <span className={`mb-1 inline-block rounded-full ${c.badge} px-2.5 py-0.5 text-xs font-bold text-white`}>
          Step {number}
        </span>
        <h4 className="text-base font-bold text-slate-800 dark:text-white">{title}</h4>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

// ─── Import Mode Card ────────────────────────────────────────────────────────
function ImportModeCard({ icon, iconBg, title, description, badge, href, accent }: {
  icon: React.ReactNode; iconBg: string; title: string; description: string; badge: string; href: string; accent: string;
}) {
  return (
    <Link
      href={href}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-5 backdrop-blur-md transition-all duration-300 hover:scale-[1.01] hover:shadow-xl hover:border-blue-300 dark:hover:border-blue-600"
    >
      <div className={`absolute -right-3 -top-3 h-20 w-20 rounded-full bg-gradient-to-br ${accent} opacity-40 dark:opacity-20`} />
      <div className="relative z-10 flex items-start gap-4">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBg} shadow-md transition-transform duration-300 group-hover:scale-110`}>
          {icon}
        </div>
        <div>
          <div className="mb-1 flex items-center gap-2">
            <h4 className="text-sm font-bold text-slate-800 dark:text-white">{title}</h4>
            <span className="rounded-full bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-400">{badge}</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{description}</p>
        </div>
      </div>
    </Link>
  );
}

export default function DocsPage() {
  const steps = [
    {
      number: '1', title: 'Import Your Content', description: 'Upload images, PDFs, DOCX, PPTX or paste text via the Import page. Choose from four modes: single question, multiple questions, wrong question summary, or bulk wrong questions.',
      icon: <Upload className="h-6 w-6 text-white" />, color: 'blue',
    },
    {
      number: '2', title: 'AI Processing & Matching', description: 'Tesseract.js OCR extracts text from your files. OpenAI GPT then matches the content to topics in your knowledge graph, generating quizzes, flashcards, cheat sheets, and study notes.',
      icon: <Sparkles className="h-6 w-6 text-white" />, color: 'violet',
    },
    {
      number: '3', title: 'Learn & Practice', description: 'Take AI-generated quizzes, flip through flashcards, review cheat sheets and study notes. The wrong question feature provides targeted explanations and 5 practice questions per mistake.',
      icon: <GraduationCap className="h-6 w-6 text-white" />, color: 'rose',
    },
    {
      number: '4', title: 'Track & Grow', description: 'Monitor your progress, streaks, and analytics. Spaced repetition ensures you review topics at optimal intervals. Visualize your knowledge graph and earn certificates for mastered topics.',
      icon: <TrendingUp className="h-6 w-6 text-white" />, color: 'emerald',
    },
  ];

  const features = [
    { icon: <Brain className="h-6 w-6 text-white" />, iconBg: 'bg-gradient-to-br from-violet-500 to-purple-600', color: 'violet', title: 'Knowledge Graph', description: 'ReactFlow-powered interactive visualization of your learning landscape. See how topics connect and grow.' },
    { icon: <Target className="h-6 w-6 text-white" />, iconBg: 'bg-gradient-to-br from-rose-500 to-pink-600', color: 'rose', title: 'AI Quizzes', description: 'Personalized quizzes generated from your uploaded content. Adaptive difficulty targets your knowledge gaps.' },
    { icon: <Layers className="h-6 w-6 text-white" />, iconBg: 'bg-gradient-to-br from-blue-500 to-indigo-600', color: 'blue', title: 'Flashcards', description: 'AI-generated flashcards for every topic. Study on demand or use spaced repetition to maximize retention.' },
    { icon: <BarChart3 className="h-6 w-6 text-white" />, iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-600', color: 'emerald', title: 'Analytics Dashboard', description: 'Deep insights into your learning progress, skill gaps, and mastery levels across all topics.' },
    { icon: <Clock className="h-6 w-6 text-white" />, iconBg: 'bg-gradient-to-br from-amber-500 to-orange-600', color: 'amber', title: 'Spaced Repetition', description: 'Review topics at scientifically optimal intervals. Never forget what you have learned.' },
    { icon: <FileText className="h-6 w-6 text-white" />, iconBg: 'bg-gradient-to-br from-cyan-500 to-blue-600', color: 'cyan', title: 'Cheat Sheets & Notes', description: 'AI-generated cheat sheets and study notes for quick revision before exams.' },
    { icon: <MessageCircle className="h-6 w-6 text-white" />, iconBg: 'bg-gradient-to-br from-indigo-500 to-violet-600', color: 'indigo', title: 'AI Chat Assistant', description: 'Ask questions about your knowledge base and get intelligent answers powered by GPT.' },
    { icon: <Award className="h-6 w-6 text-white" />, iconBg: 'bg-gradient-to-br from-orange-500 to-red-600', color: 'orange', title: 'Certificates', description: 'Earn certificates when you master a topic. Track achievements and share your accomplishments.' },
  ];

  const navLinks = [
    { href: '/', icon: <BookOpen className="h-5 w-5" />, iconBg: 'bg-blue-100 dark:bg-blue-900/40', iconColor: 'text-blue-600 dark:text-blue-400', title: 'Home', desc: 'Overview, feature cards, and quick access' },
    { href: '/import', icon: <Upload className="h-5 w-5" />, iconBg: 'bg-violet-100 dark:bg-violet-900/40', iconColor: 'text-violet-600 dark:text-violet-400', title: 'Import Content', desc: 'Upload documents in 4 modes' },
    { href: '/learn', icon: <GraduationCap className="h-5 w-5" />, iconBg: 'bg-rose-100 dark:bg-rose-900/40', iconColor: 'text-rose-600 dark:text-rose-400', title: 'Learn', desc: 'Quizzes and topic recommendations' },
    { href: '/flashcards', icon: <Layers className="h-5 w-5" />, iconBg: 'bg-cyan-100 dark:bg-cyan-900/40', iconColor: 'text-cyan-600 dark:text-cyan-400', title: 'Flashcards', desc: 'Spaced repetition study cards' },
    { href: '/review', icon: <FileText className="h-5 w-5" />, iconBg: 'bg-amber-100 dark:bg-amber-900/40', iconColor: 'text-amber-600 dark:text-amber-400', title: 'Review', desc: 'Cheat sheets and study notes' },
    { href: '/chat', icon: <MessageCircle className="h-5 w-5" />, iconBg: 'bg-indigo-100 dark:bg-indigo-900/40', iconColor: 'text-indigo-600 dark:text-indigo-400', title: 'AI Assistant', desc: 'Chat with your knowledge base' },
    { href: '/analytics', icon: <BarChart3 className="h-5 w-5" />, iconBg: 'bg-emerald-100 dark:bg-emerald-900/40', iconColor: 'text-emerald-600 dark:text-emerald-400', title: 'Analytics', desc: 'Detailed stats and skill gaps' },
    { href: '/progress', icon: <TrendingUp className="h-5 w-5" />, iconBg: 'bg-orange-100 dark:bg-orange-900/40', iconColor: 'text-orange-600 dark:text-orange-400', title: 'Progress', desc: 'Timeline, streaks, achievements' },
    { href: '/knowledge-graph', icon: <Brain className="h-5 w-5" />, iconBg: 'bg-violet-100 dark:bg-violet-900/40', iconColor: 'text-violet-600 dark:text-violet-400', title: 'Knowledge Graph', desc: 'Interactive topic visualization' },
    { href: '/dashboard', icon: <Star className="h-5 w-5" />, iconBg: 'bg-pink-100 dark:bg-pink-900/40', iconColor: 'text-pink-600 dark:text-pink-400', title: 'Dashboard', desc: 'Overview of all learning activity' },
    { href: '/certificates', icon: <Award className="h-5 w-5" />, iconBg: 'bg-teal-100 dark:bg-teal-900/40', iconColor: 'text-teal-600 dark:text-teal-400', title: 'Certificates', desc: 'Earned topic certificates' },
    { href: '/settings', icon: <Zap className="h-5 w-5" />, iconBg: 'bg-slate-100 dark:bg-slate-700/40', iconColor: 'text-slate-600 dark:text-slate-400', title: 'Settings', desc: 'Preferences and configuration' },
  ];

  const tips = [
    { tip: 'Upload diverse file types — images, PDFs, DOCX, and PPTX all work. Mix formats for richer topic coverage.' },
    { tip: 'Use the Wrong Question feature after any quiz or test. Upload the worksheet, mark wrong answers, and get 5 targeted practice questions per mistake.' },
    { tip: 'Review flashcards daily using spaced repetition. The system schedules reviews at the optimal moment for long-term retention.' },
    { tip: 'Explore the Knowledge Graph after each import. Watch new topics appear and connect with existing ones.' },
    { tip: 'Check the Analytics page weekly to spot weak areas and follow AI recommendations for what to study next.' },
    { tip: 'Use the AI Chat Assistant to ask questions about topics you are struggling with — it draws from your knowledge base.' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <Navigation />

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-4 pt-20 pb-16">
        <DecorativeOrb className="from-blue-400/30 to-transparent -right-16 -top-16 h-72 w-72 dark:from-blue-600/20" />
        <DecorativeOrb className="from-violet-400/20 to-transparent -left-12 bottom-0 h-48 w-48 dark:from-violet-600/10" />
        <DecorativeOrb className="from-indigo-400/20 to-transparent right-1/3 top-24 h-32 w-32 dark:from-indigo-600/10" />

        <div className="relative z-10 mx-auto max-w-5xl text-center px-4">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-200 dark:border-blue-800 bg-blue-50/80 dark:bg-blue-900/30 px-4 py-1.5 backdrop-blur-sm">
            <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Documentation & Getting Started</span>
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
            <span className="text-slate-900 dark:text-white">Welcome to </span>
            <span className="bg-gradient-to-r from-blue-600 via-violet-600 to-indigo-600 bg-clip-text text-transparent dark:from-blue-400 dark:via-violet-400 dark:to-indigo-400">
              KIP
            </span>
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
            <span className="font-semibold text-slate-800 dark:text-slate-200">Knowledge Intelligence Platform</span> — an AI-powered learning system that transforms your educational documents into personalized quizzes, flashcards, and study materials.
          </p>

          <p className="mx-auto mt-3 max-w-2xl text-base text-slate-500 dark:text-slate-500">
            Upload worksheets, tests, or any document. Our AI extracts knowledge, matches it to topics, and generates everything you need to master any subject.
          </p>

          {/* CTA row */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/import"
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl hover:shadow-blue-500/30 hover:scale-105"
            >
              <Upload className="h-4 w-4" />
              Start Importing
              <ChevronRight className="h-4 w-4" />
            </Link>
            <Link
              href="/learn"
              className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 px-7 py-3.5 text-sm font-semibold text-slate-700 dark:text-slate-200 shadow-lg backdrop-blur-sm transition-all hover:bg-white dark:hover:bg-slate-700 hover:shadow-xl"
            >
              <GraduationCap className="h-4 w-4" />
              Start Learning
            </Link>
          </div>

          {/* Feature badges */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
            <FeatureBadge icon={<Brain className="h-3 w-3" />} label="Knowledge Graph" color="violet" />
            <FeatureBadge icon={<Target className="h-3 w-3" />} label="AI Quizzes" color="rose" />
            <FeatureBadge icon={<Layers className="h-3 w-3" />} label="Flashcards" color="blue" />
            <FeatureBadge icon={<Clock className="h-3 w-3" />} label="Spaced Repetition" color="amber" />
            <FeatureBadge icon={<FileText className="h-3 w-3" />} label="Cheat Sheets" color="cyan" />
            <FeatureBadge icon={<MessageCircle className="h-3 w-3" />} label="AI Chat" color="indigo" />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 pb-16 space-y-12">

        {/* ── How It Works ─────────────────────────────────────────────── */}
        <section>
          <div className="mb-8 flex items-end justify-between">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-amber-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Workflow</span>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">How It Works</h2>
              <p className="mt-1 text-slate-600 dark:text-slate-400">Four steps from document to mastery.</p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <GlassCard>
              <div className="mb-6">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">The KIP Learning Pipeline</h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Everything flows from import to mastery.</p>
              </div>
              {steps.map((step) => (
                <StepCard key={step.number} {...step} />
              ))}
            </GlassCard>

            <div className="space-y-5">
              <GlassCard className="relative overflow-hidden">
                <div className="absolute -right-4 -top-4 h-28 w-28 rounded-full bg-gradient-to-br from-violet-400/20 to-transparent dark:from-violet-600/10" />
                <div className="relative z-10">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg">
                    <ScanText className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">OCR + AI Extraction</h3>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    Tesseract.js extracts text from images, PDFs, DOCX, and PPTX files. OpenAI GPT then analyzes and matches content to knowledge topics in your personal knowledge graph.
                  </p>
                </div>
              </GlassCard>

              <GlassCard className="relative overflow-hidden">
                <div className="absolute -left-4 -bottom-4 h-24 w-24 rounded-full bg-gradient-to-tr from-rose-400/20 to-transparent dark:from-rose-600/10" />
                <div className="relative z-10">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 shadow-lg">
                    <FileWarning className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">Wrong Question Feature</h3>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    Upload a worksheet and specify which questions you answered incorrectly. KIP provides AI explanations plus 5 targeted practice questions per wrong answer — perfect for post-test review.
                  </p>
                  <Link href="/import" className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:gap-2.5 transition-all">
                    Try it on Import page <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </GlassCard>
            </div>
          </div>
        </section>

        {/* ── Import Options ───────────────────────────────────────────── */}
        <section>
          <div className="mb-8">
            <div className="mb-1 flex items-center gap-2">
              <Upload className="h-5 w-5 text-blue-500" />
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Import Modes</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">Four Ways to Import</h2>
            <p className="mt-1 text-slate-600 dark:text-slate-400">Choose the mode that matches your use case.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <ImportModeCard
              icon={<ScanText className="h-5 w-5 text-white" />}
              iconBg="bg-gradient-to-br from-blue-500 to-indigo-600"
              title="Single Question"
              description="Upload one question or document at a time for precise OCR extraction and matching. Best for focused study."
              badge="Precise"
              href="/import"
              accent="from-blue-400/40 to-transparent dark:from-blue-600/20"
            />
            <ImportModeCard
              icon={<ListChecks className="h-5 w-5 text-white" />}
              iconBg="bg-gradient-to-br from-violet-500 to-purple-600"
              title="Multiple Questions"
              description="Upload a full worksheet, test, or batch of questions at once for bulk OCR processing and matching."
              badge="Bulk"
              href="/import"
              accent="from-violet-400/40 to-transparent dark:from-violet-600/20"
            />
            <ImportModeCard
              icon={<Globe className="h-5 w-5 text-white" />}
              iconBg="bg-gradient-to-br from-amber-500 to-orange-600"
              title="Wrong Question Summary"
              description="Upload one question you got wrong — get an AI explanation plus 5 practice questions. Great for post-quiz review."
              badge="Remedial"
              href="/import"
              accent="from-amber-400/40 to-transparent dark:from-amber-600/20"
            />
            <ImportModeCard
              icon={<FileWarning className="h-5 w-5 text-white" />}
              iconBg="bg-gradient-to-br from-rose-500 to-pink-600"
              title="Wrong Questions Summary (bulk)"
              description="Upload a worksheet + specify wrong question numbers → AI explanations + 5 practice questions per question."
              badge="Bulk Remedial"
              href="/import"
              accent="from-rose-400/40 to-transparent dark:from-rose-600/20"
            />
          </div>

          {/* Supported formats */}
          <div className="mt-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 px-5 py-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Supported file formats</p>
            <div className="flex flex-wrap gap-2">
              {['PNG', 'JPG', 'WEBP', 'GIF', 'PDF', 'DOCX', 'PPTX', 'TXT', 'MD', 'HTML'].map((fmt) => (
                <span key={fmt} className="rounded-full bg-white dark:bg-slate-700 px-3 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300 shadow-sm">
                  {fmt}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ── Features Overview ─────────────────────────────────────────── */}
        <section>
          <div className="mb-8">
            <div className="mb-1 flex items-center gap-2">
              <Star className="h-5 w-5 text-violet-500" />
              <span className="text-xs font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">Features</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">Platform Capabilities</h2>
            <p className="mt-1 text-slate-600 dark:text-slate-400">Every tool you need for intelligent, personalized learning.</p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <GlassCard key={f.title} className="group relative overflow-hidden hover:scale-[1.01] transition-transform duration-200">
                <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-gradient-to-br from-white/20 to-transparent dark:from-white/5 pointer-events-none" />
                <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${f.iconBg} shadow-md transition-transform duration-300 group-hover:scale-110`}>
                  {f.icon}
                </div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-white">{f.title}</h4>
                <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{f.description}</p>
              </GlassCard>
            ))}
          </div>
        </section>

        {/* ── Navigation Guide ─────────────────────────────────────────── */}
        <section>
          <div className="mb-8">
            <div className="mb-1 flex items-center gap-2">
              <Target className="h-5 w-5 text-emerald-500" />
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Navigation</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">Explore the Platform</h2>
            <p className="mt-1 text-slate-600 dark:text-slate-400">Quick links to every section of KIP.</p>
          </div>

          <GlassCard>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="group flex items-center gap-3 rounded-xl border border-transparent p-3 transition-all hover:border-slate-200 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${link.iconBg} ${link.iconColor} transition-transform duration-200 group-hover:scale-110`}>
                    {link.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-slate-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {link.title}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{link.desc}</div>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5" />
                </Link>
              ))}
            </div>
          </GlassCard>
        </section>

        {/* ── Tips ─────────────────────────────────────────────────────── */}
        <section>
          <div className="mb-8">
            <div className="mb-1 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Best Practices</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">Tips for Success</h2>
            <p className="mt-1 text-slate-600 dark:text-slate-400">Get the most out of KIP with these strategies.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {tips.map((item, i) => (
              <GlassCard key={i} className="flex items-start gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/40 dark:to-teal-900/40">
                  <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{item.tip}</p>
              </GlassCard>
            ))}
          </div>
        </section>

        {/* ── Bottom CTA ───────────────────────────────────────────────── */}
        <section className="relative overflow-hidden rounded-2xl border border-white/40 dark:border-slate-700/50 bg-gradient-to-br from-blue-600/95 to-indigo-700/95 dark:from-blue-700/80 dark:to-indigo-800/80 p-10 text-center shadow-2xl backdrop-blur-md">
          <div className="absolute -right-6 -top-6 h-40 w-40 rounded-full bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
          <div className="absolute -left-6 -bottom-6 h-32 w-32 rounded-full bg-gradient-to-tr from-white/10 to-transparent pointer-events-none" />
          <div className="relative z-10">
            <Sparkles className="mx-auto mb-4 h-10 w-10 text-white/80" />
            <h2 className="text-2xl font-extrabold text-white sm:text-3xl">Ready to start learning?</h2>
            <p className="mx-auto mt-3 max-w-lg text-blue-100">
              Import your first document and let KIP transform how you study, practice, and master any subject.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/import"
                className="flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-sm font-bold text-blue-600 shadow-xl transition-all hover:bg-blue-50 hover:scale-105"
              >
                <Upload className="h-4 w-4" />
                Import Your First Document
              </Link>
              <Link
                href="/knowledge-graph"
                className="flex items-center gap-2 rounded-xl border-2 border-white/30 bg-white/10 px-8 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20"
              >
                <Brain className="h-4 w-4" />
                Explore the Knowledge Graph
              </Link>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
