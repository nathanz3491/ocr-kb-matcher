'use client';

import { Navigation } from "@/components/navigation/Navigation";
import { 
  Brain, TrendingUp, BarChart3, GraduationCap, BookOpen, Layers, 
  Upload, Sparkles, Target, Zap, ArrowRight, ChevronRight
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme/ThemeProvider";

interface FeatureCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  gradient: string;
  iconBg: string;
  decorativeColor: string;
}

function FeatureCard({ title, description, icon, href, gradient, iconBg, decorativeColor }: FeatureCardProps) {
  return (
    <Link
      href={href}
      className={`group relative overflow-hidden rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-6 backdrop-blur-md transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${gradient}`}
    >
      {/* Decorative circles */}
      <div className={`absolute -right-4 -top-4 h-24 w-24 rounded-full bg-gradient-to-br ${decorativeColor} opacity-50`} />
      <div className="absolute -left-2 -bottom-2 h-16 w-16 rounded-full bg-gradient-to-tr from-white/20 to-transparent dark:from-white/5" />
      
      <div className="relative z-10">
        <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-xl ${iconBg} shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>
          {icon}
        </div>
        <h3 className="text-lg font-bold text-slate-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {title}
        </h3>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          {description}
        </p>
        <div className="mt-4 flex items-center gap-1 text-sm font-medium text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          Explore
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </div>
      </div>
    </Link>
  );
}

// Step Card Component
interface StepCardProps {
  number: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

function StepCard({ number, title, description, icon, color }: StepCardProps) {
  return (
    <div className="relative flex gap-4">
      <div className="flex flex-col items-center">
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${color} shadow-lg`}>
          {icon}
        </div>
        <div className="mt-2 h-full w-0.5 bg-gradient-to-b from-slate-300 to-transparent dark:from-slate-600" />
      </div>
      <div className="flex-1 pb-8">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${color} text-white`}>
            Step {number}
          </span>
        </div>
        <h4 className="text-base font-bold text-slate-800 dark:text-white">{title}</h4>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{description}</p>
      </div>
    </div>
  );
}

export default function Home() {
  const { theme } = useTheme();

  const features = [
    {
      title: "Import Content",
      description: "Upload questions, documents, or worksheets. Support for images, PDFs, and text.",
      icon: <Upload className="h-7 w-7 text-white" />,
      href: "/import",
      gradient: "shadow-blue-500/10 hover:shadow-blue-500/20",
      iconBg: "bg-gradient-to-br from-blue-500 to-indigo-600",
      decorativeColor: "from-blue-400/30 to-transparent dark:from-blue-500/20"
    },
    {
      title: "Learn & Quiz",
      description: "Take AI-generated quizzes tailored to your knowledge gaps and track mastery.",
      icon: <GraduationCap className="h-7 w-7 text-white" />,
      href: "/learn",
      gradient: "shadow-rose-500/10 hover:shadow-rose-500/20",
      iconBg: "bg-gradient-to-br from-rose-500 to-pink-600",
      decorativeColor: "from-rose-400/30 to-transparent dark:from-rose-500/20"
    },
    {
      title: "Analytics",
      description: "Deep insights into your learning progress with gap analysis and recommendations.",
      icon: <BarChart3 className="h-7 w-7 text-white" />,
      href: "/analytics",
      gradient: "shadow-violet-500/10 hover:shadow-violet-500/20",
      iconBg: "bg-gradient-to-br from-violet-500 to-purple-600",
      decorativeColor: "from-violet-400/30 to-transparent dark:from-violet-500/20"
    },
    {
      title: "Knowledge Graph",
      description: "Visualize your knowledge as an interconnected graph. See relationships between topics.",
      icon: <Brain className="h-7 w-7 text-white" />,
      href: "/knowledge-graph",
      gradient: "shadow-cyan-500/10 hover:shadow-cyan-500/20",
      iconBg: "bg-gradient-to-br from-cyan-500 to-blue-600",
      decorativeColor: "from-cyan-400/30 to-transparent dark:from-cyan-500/20"
    },
    {
      title: "Flashcards",
      description: "Study with auto-generated flashcards and cheat sheets for quick revision.",
      icon: <Layers className="h-7 w-7 text-white" />,
      href: "/flashcards",
      gradient: "shadow-amber-500/10 hover:shadow-amber-500/20",
      iconBg: "bg-gradient-to-br from-amber-500 to-orange-600",
      decorativeColor: "from-amber-400/30 to-transparent dark:from-amber-500/20"
    },
    {
      title: "Track Progress",
      description: "Monitor your learning timeline, streaks, and achievements over time.",
      icon: <TrendingUp className="h-7 w-7 text-white" />,
      href: "/progress",
      gradient: "shadow-emerald-500/10 hover:shadow-emerald-500/20",
      iconBg: "bg-gradient-to-br from-emerald-500 to-teal-600",
      decorativeColor: "from-emerald-400/30 to-transparent dark:from-emerald-500/20"
    }
  ];

  const steps = [
    {
      number: "1",
      title: "Import Your Content",
      description: "Upload educational material via the Import page. Support for single questions or bulk worksheets.",
      icon: <Upload className="h-6 w-6 text-white" />,
      color: "bg-gradient-to-br from-blue-500 to-indigo-600"
    },
    {
      number: "2",
      title: "AI Processing",
      description: "Our AI extracts text, matches it to knowledge topics, and generates personalized learning materials.",
      icon: <Sparkles className="h-6 w-6 text-white" />,
      color: "bg-gradient-to-br from-violet-500 to-purple-600"
    },
    {
      number: "3",
      title: "Learn & Quiz",
      description: "Take AI-generated quizzes, study flashcards, and track your mastery of each topic.",
      icon: <Target className="h-6 w-6 text-white" />,
      color: "bg-gradient-to-br from-rose-500 to-pink-600"
    },
    {
      number: "4",
      title: "Track & Improve",
      description: "View detailed analytics, identify knowledge gaps, and watch your progress grow over time.",
      icon: <Zap className="h-6 w-6 text-white" />,
      color: "bg-gradient-to-br from-amber-500 to-orange-600"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <Navigation />

      {/* Hero Section */}
      <section className="px-4 pt-16 pb-12">
        <div className="mx-auto max-w-5xl text-center px-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 dark:border-blue-800 bg-blue-50/80 dark:bg-blue-900/30 px-4 py-1.5 mb-6 backdrop-blur-sm">
            <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">AI-Powered Learning Platform</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Master Your Learning with{" "}
            <span className="bg-gradient-to-r from-blue-600 via-violet-600 to-indigo-600 dark:from-blue-400 dark:via-violet-400 dark:to-indigo-400 bg-clip-text text-transparent">
              AI Intelligence
            </span>
          </h1>
          
          <p className="mx-auto mt-6 max-w-2xl text-base sm:text-xl text-slate-600 dark:text-slate-400 leading-relaxed">
            Upload educational content, let AI extract and match knowledge, 
            take personalized quizzes, and visualize your growth.
          </p>

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/import"
              className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl hover:shadow-blue-500/30 hover:scale-105"
            >
              <Upload className="h-5 w-5" />
              Start Importing
              <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/learn"
              className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 px-8 py-4 text-base font-semibold text-slate-700 dark:text-slate-200 shadow-lg backdrop-blur-sm transition-all hover:bg-white dark:hover:bg-slate-700 hover:shadow-xl"
            >
              <GraduationCap className="h-5 w-5" />
              Start Learning
            </Link>
          </div>
        </div>
      </section>

      <section className="px-4 py-12">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white">
              Everything You Need to Learn
            </h2>
            <p className="mt-3 text-slate-600 dark:text-slate-400">
              A complete suite of tools powered by AI to accelerate your learning
            </p>
          </div>

          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <FeatureCard key={feature.title} {...feature} />
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-8 grid-cols-1 lg:grid-cols-2 lg:gap-12 items-start">
            <div>
              <div className="mb-8">
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white">
                  How It Works
                </h2>
                <p className="mt-3 text-slate-600 dark:text-slate-400">
                  Get started in four simple steps
                </p>
              </div>

              <div className="relative rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-6 sm:p-8 backdrop-blur-sm shadow-lg">
                {steps.map((step) => (
                  <StepCard key={step.number} {...step} />
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <div className="relative overflow-hidden rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-6 backdrop-blur-sm shadow-lg">
                <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-gradient-to-br from-violet-400/20 to-transparent dark:from-violet-500/10" />
                
                <h3 className="relative z-10 mb-4 text-lg font-bold text-slate-800 dark:text-white">
                  Quick Access
                </h3>
                <div className="relative z-10 space-y-2">
                  <Link href="/import" className="group flex items-center gap-3 rounded-xl p-3 transition-all hover:bg-blue-50 dark:hover:bg-blue-900/20">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                      <Upload className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="flex-1 font-medium text-slate-700 dark:text-slate-200">Import Content</span>
                    <ChevronRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-1" />
                  </Link>
                  <Link href="/learn" className="group flex items-center gap-3 rounded-xl p-3 transition-all hover:bg-rose-50 dark:hover:bg-rose-900/20">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-100 dark:bg-rose-900/30">
                      <GraduationCap className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                    </div>
                    <span className="flex-1 font-medium text-slate-700 dark:text-slate-200">Take a Quiz</span>
                    <ChevronRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-1" />
                  </Link>
                  <Link href="/analytics" className="group flex items-center gap-3 rounded-xl p-3 transition-all hover:bg-violet-50 dark:hover:bg-violet-900/20">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/30">
                      <BarChart3 className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                    </div>
                    <span className="flex-1 font-medium text-slate-700 dark:text-slate-200">View Analytics</span>
                    <ChevronRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-1" />
                  </Link>
                  <Link href="/knowledge-graph" className="group flex items-center gap-3 rounded-xl p-3 transition-all hover:bg-cyan-50 dark:hover:bg-cyan-900/20">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-100 dark:bg-cyan-900/30">
                      <Brain className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                    </div>
                    <span className="flex-1 font-medium text-slate-700 dark:text-slate-200">Knowledge Graph</span>
                    <ChevronRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-2xl border border-white/40 dark:border-slate-700/50 bg-gradient-to-br from-blue-50/80 to-indigo-50/80 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 backdrop-blur-sm shadow-lg">
                <div className="absolute -left-4 -bottom-4 h-24 w-24 rounded-full bg-gradient-to-tr from-blue-400/20 to-transparent dark:from-blue-500/10" />
                
                <div className="relative z-10">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg">
                    <BookOpen className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                    Documentation
                  </h3>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                    Learn how to make the most of all features with our comprehensive guides.
                  </p>
                  <Link href="/docs" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white dark:bg-slate-800 px-4 py-2 text-sm font-semibold text-blue-600 dark:text-blue-400 shadow-md transition-all hover:shadow-lg">
                    View Docs
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-12">
        <div className="mx-auto max-w-4xl">
          <div className="relative overflow-hidden rounded-2xl border border-white/40 dark:border-slate-700/50 bg-gradient-to-br from-blue-500/90 to-indigo-600/90 dark:from-blue-600/80 dark:to-indigo-700/80 p-8 sm:p-12 text-center shadow-2xl backdrop-blur-sm">
            <div className="absolute -right-4 -top-4 h-32 w-32 rounded-full bg-gradient-to-br from-white/20 to-transparent" />
            <div className="absolute -left-4 -bottom-4 h-24 w-24 rounded-full bg-gradient-to-tr from-white/10 to-transparent" />
            
            <div className="relative z-10">
              <h2 className="text-2xl sm:text-3xl font-bold text-white">
                Ready to Supercharge Your Learning?
              </h2>
              <p className="mt-4 text-lg text-blue-100">
                Start importing content and let AI transform how you learn.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/import" className="flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-bold text-blue-600 shadow-xl transition-all hover:bg-blue-50 hover:scale-105">
                  <Upload className="h-5 w-5" />
                  Get Started Now
                </Link>
                <Link href="/dashboard" className="flex items-center gap-2 rounded-xl border-2 border-white/30 bg-white/10 px-8 py-4 text-base font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20">
                  <BarChart3 className="h-5 w-5" />
                  View Dashboard
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* Auth CTA Section */}
      <section className="w-full max-w-4xl mx-auto px-4 mb-16">
        <div className={cn(
          "rounded-3xl border backdrop-blur-xl p-10 text-center shadow-2xl relative overflow-hidden",
          theme === "dark"
            ? "bg-gradient-to-br from-slate-800/80 via-slate-800/60 to-slate-900/80 border-slate-700/50"
            : "bg-gradient-to-br from-white/80 via-blue-50/50 to-indigo-50/50 border-white/60"
        )}>
          <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
            <div className="absolute -top-20 -right-20 h-60 w-60 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 blur-3xl" />
          </div>
          <div className="relative">
            <h2 className={cn(
              "text-3xl md:text-4xl font-bold mb-4",
              theme === "dark" ? "text-white" : "text-slate-800"
            )}>
              Ready to Start Learning?
            </h2>
            <p className={cn(
              "text-base md:text-lg mb-8 max-w-xl mx-auto",
              theme === "dark" ? "text-slate-400" : "text-slate-600"
            )}>
              Join thousands of students and educators using AI-powered tools to master any subject.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/auth/register"
                className={cn(
                  "w-full sm:w-auto rounded-2xl px-8 py-4 text-base font-bold transition-all duration-300",
                  "bg-gradient-to-r from-blue-500 to-indigo-600 text-white",
                  "hover:from-blue-400 hover:to-indigo-500",
                  "shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30",
                  "hover:scale-[1.02] active:scale-[0.99]",
                  "flex items-center justify-center gap-2"
                )}
              >
                Get Started Free
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/auth/login"
                className={cn(
                  "w-full sm:w-auto rounded-2xl px-8 py-4 text-base font-semibold transition-all duration-300",
                  theme === "dark"
                    ? "bg-slate-700/60 text-white hover:bg-slate-600/80 border border-slate-600"
                    : "bg-white/80 text-slate-700 hover:bg-white border border-slate-200",
                  "hover:scale-[1.02] active:scale-[0.99]",
                  "flex items-center justify-center gap-2"
                )}
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="px-4 py-8 border-t border-slate-200 dark:border-slate-800">
        <div className="mx-auto max-w-7xl text-center text-sm text-slate-500 dark:text-slate-400">
          <p>© 2026 OCR Knowledge Base Matcher. AI-Powered Learning Platform.</p>
        </div>
      </footer>
    </div>
  );
}
