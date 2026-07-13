'use client';

import { useState } from 'react';
import { Navigation } from '@/components/navigation/Navigation';
import {
  Brain, Upload, Layers, GraduationCap, BookOpen, Target,
  Sparkles, ArrowRight, ChevronRight, Zap, Clock, Mail,
  FileText, Shield, RefreshCw
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/theme/ThemeProvider';

interface FeatureCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
  iconBg: string;
  decorativeColor: string;
}

function FeatureCard({ title, description, icon, gradient, iconBg, decorativeColor }: FeatureCardProps) {
  const { theme } = useTheme();
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-2xl border backdrop-blur-md p-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl',
        theme === 'dark'
          ? 'bg-slate-800/60 border-slate-700/50'
          : 'bg-white/70 border-white/60',
        gradient
      )}
    >
      <div className={cn('absolute -right-4 -top-4 h-24 w-24 rounded-full bg-gradient-to-br opacity-50', decorativeColor)} />
      <div className="absolute -left-2 -bottom-2 h-16 w-16 rounded-full bg-gradient-to-tr from-white/20 to-transparent dark:from-white/5" />

      <div className="relative z-10">
        <div className={cn('mb-4 flex h-14 w-14 items-center justify-center rounded-xl shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3', iconBg)}>
          {icon}
        </div>
        <h3 className="text-lg font-bold text-slate-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {title}
        </h3>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}

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
        <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl shadow-lg', color)}>
          {icon}
        </div>
        <div className="mt-2 h-full w-0.5 bg-gradient-to-b from-slate-300 to-transparent dark:from-slate-600" />
      </div>
      <div className="flex-1 pb-8">
        <div className="flex items-center gap-2 mb-1">
          <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full text-white', color)}>
            步骤 {number}
          </span>
        </div>
        <h4 className="text-base font-bold text-slate-800 dark:text-white">{title}</h4>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{description}</p>
      </div>
    </div>
  );
}

interface PricingTeaseCardProps {
  name: string;
  price: string;
  period: string;
  features: string[];
  highlight?: boolean;
  theme: 'light' | 'dark';
}

function PricingTeaseCard({ name, price, period, features, highlight, theme }: PricingTeaseCardProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border backdrop-blur-md p-5 transition-all duration-300',
        theme === 'dark'
          ? 'bg-slate-800/60 border-slate-700/50'
          : 'bg-white/70 border-white/60',
        highlight && 'ring-2 ring-blue-500/50 shadow-lg shadow-blue-500/10'
      )}
    >
      {highlight && (
        <div className="absolute top-0 right-0 bg-gradient-to-l from-blue-500 to-indigo-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl">
          推荐
        </div>
      )}
      <h4 className="text-base font-bold text-slate-800 dark:text-white">{name}</h4>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">{price}</span>
        <span className="text-sm text-slate-500 dark:text-slate-500">{period}</span>
      </div>
      <ul className="mt-3 space-y-1.5">
        {features.map((f) => (
          <li key={f} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <Zap className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400 shrink-0" />
            {f}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Home() {
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setEmail('');
    }
  };

  const features: FeatureCardProps[] = [
    {
      title: '上传文档',
      description: '支持 PDF、图片、DOCX 等多种格式。AI 自动提取文字并结构化整理。',
      icon: <Upload className="h-7 w-7 text-white" />,
      gradient: 'shadow-blue-500/10 hover:shadow-blue-500/20',
      iconBg: 'bg-gradient-to-br from-blue-500 to-indigo-600',
      decorativeColor: 'from-blue-400/30 to-transparent dark:from-blue-500/20',
    },
    {
      title: '知识图谱',
      description: '将知识点可视化为互联图谱，一目了然地看到概念之间的关系与层次。',
      icon: <Brain className="h-7 w-7 text-white" />,
      gradient: 'shadow-cyan-500/10 hover:shadow-cyan-500/20',
      iconBg: 'bg-gradient-to-br from-cyan-500 to-blue-600',
      decorativeColor: 'from-cyan-400/30 to-transparent dark:from-cyan-500/20',
    },
    {
      title: '闪卡复习',
      description: 'AI 自动生成闪卡，支持正反面记忆。快速巩固核心概念与公式。',
      icon: <Layers className="h-7 w-7 text-white" />,
      gradient: 'shadow-amber-500/10 hover:shadow-amber-500/20',
      iconBg: 'bg-gradient-to-br from-amber-500 to-orange-600',
      decorativeColor: 'from-amber-400/30 to-transparent dark:from-amber-500/20',
    },
    {
      title: '智能测验',
      description: '根据你的知识薄弱点生成自适应测验。错题自动归档，针对性提升。',
      icon: <GraduationCap className="h-7 w-7 text-white" />,
      gradient: 'shadow-rose-500/10 hover:shadow-rose-500/20',
      iconBg: 'bg-gradient-to-br from-rose-500 to-pink-600',
      decorativeColor: 'from-rose-400/30 to-transparent dark:from-rose-500/20',
    },
    {
      title: '错题本',
      description: '自动收集测验中的错题，分类整理，随时回顾，避免重复犯错。',
      icon: <BookOpen className="h-7 w-7 text-white" />,
      gradient: 'shadow-violet-500/10 hover:shadow-violet-500/20',
      iconBg: 'bg-gradient-to-br from-violet-500 to-purple-600',
      decorativeColor: 'from-violet-400/30 to-transparent dark:from-violet-500/20',
    },
    {
      title: 'SM-2 间隔重复',
      description: '基于科学的 SM-2 算法，在最佳时间点推送复习内容，记忆效率最大化。',
      icon: <Clock className="h-7 w-7 text-white" />,
      gradient: 'shadow-emerald-500/10 hover:shadow-emerald-500/20',
      iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-600',
      decorativeColor: 'from-emerald-400/30 to-transparent dark:from-emerald-500/20',
    },
  ];

  const steps: StepCardProps[] = [
    {
      number: '1',
      title: '上传你的笔记',
      description: '拍照或上传 PDF、Word 文档。支持试卷、讲义、读书笔记等各种学习资料。',
      icon: <Upload className="h-6 w-6 text-white" />,
      color: 'bg-gradient-to-br from-blue-500 to-indigo-600',
    },
    {
      number: '2',
      title: 'AI 自动整理',
      description: 'OCR 识别文字，AI 提取知识点并构建知识图谱。自动归类、去重、建立关联。',
      icon: <Sparkles className="h-6 w-6 text-white" />,
      color: 'bg-gradient-to-br from-violet-500 to-purple-600',
    },
    {
      number: '3',
      title: '开始智能复习',
      description: '生成闪卡、测验和错题本。SM-2 算法在最佳时间提醒你复习，事半功倍。',
      icon: <Target className="h-6 w-6 text-white" />,
      color: 'bg-gradient-to-br from-rose-500 to-pink-600',
    },
  ];

  const pricingTiers = [
    {
      name: '免费版',
      price: '¥0',
      period: '/月',
      features: ['每月 2 次上传', '3 次测验生成', '20 条 AI 对话'],
    },
    {
      name: '月卡',
      price: '¥19',
      period: '/月',
      features: ['每月 15 次上传', '30 次测验生成', '100 条 AI 对话'],
    },
    {
      name: '年卡',
      price: '¥198',
      period: '/年',
      features: ['每月 15 次上传', '30 次测验生成', '100 条 AI 对话', '相当于 ¥16.5/月'],
    },
    {
      name: '高考冲刺',
      price: '¥99',
      period: '/季',
      features: ['50 次上传（一次性）', '100 次测验生成', '300 条 AI 对话', '3–6 月专用'],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <Navigation />

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 blur-3xl" />
      </div>

      <section className="relative px-4 pt-20 pb-16">
        <div className="mx-auto max-w-5xl text-center px-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 dark:border-blue-800 bg-blue-50/80 dark:bg-blue-900/30 px-4 py-1.5 mb-6 backdrop-blur-sm">
            <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">AI 驱动的学习平台</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            把笔记变成
            <span className="bg-gradient-to-r from-blue-600 via-violet-600 to-indigo-600 dark:from-blue-400 dark:via-violet-400 dark:to-indigo-400 bg-clip-text text-transparent">
              知识图谱
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base sm:text-xl text-slate-600 dark:text-slate-400 leading-relaxed">
            AI 自动整理，智能复习。上传你的学习资料，让 AI 帮你构建知识体系、生成测验、管理错题，用科学的方法高效提分。
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/auth/register"
              className={cn(
                'group flex items-center gap-2 rounded-xl px-8 py-4 text-base font-bold text-white',
                'bg-gradient-to-r from-blue-600 to-indigo-600',
                'hover:from-blue-500 hover:to-indigo-500',
                'shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30',
                'transition-all duration-300 hover:scale-105'
              )}
            >
              <Zap className="h-5 w-5" />
              免费试用
              <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/pricing"
              className={cn(
                'flex items-center gap-2 rounded-xl border px-8 py-4 text-base font-semibold',
                'backdrop-blur-sm transition-all duration-300 hover:scale-105',
                theme === 'dark'
                  ? 'bg-slate-800/80 border-slate-700/50 text-slate-300 hover:bg-slate-700 hover:border-slate-600'
                  : 'bg-white/80 border-slate-200/50 text-slate-700 hover:bg-white hover:border-slate-300'
              )}
            >
              <Target className="h-5 w-5" />
              查看价格
            </Link>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-slate-500 dark:text-slate-500">
            <div className="flex items-center gap-2">
              <Upload className="h-4 w-4 text-blue-500 dark:text-blue-400" />
              <span>支持 PDF / 图片 / DOCX</span>
            </div>
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-cyan-500 dark:text-cyan-400" />
              <span>AI 知识图谱构建</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
              <span>SM-2 科学复习</span>
            </div>
          </div>
        </div>
      </section>

      <section className="relative px-4 py-12">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white">
              一站式学习工具箱
            </h2>
            <p className="mt-3 text-slate-600 dark:text-slate-400">
              从资料整理到复习巩固，AI 全程陪伴你的学习旅程
            </p>
          </div>

          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <FeatureCard key={feature.title} {...feature} />
            ))}
          </div>
        </div>
      </section>

      <section className="relative px-4 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-8 grid-cols-1 lg:grid-cols-2 lg:gap-12 items-start">
            <div>
              <div className="mb-8">
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white">
                  三步开始高效学习
                </h2>
                <p className="mt-3 text-slate-600 dark:text-slate-400">
                  无需复杂设置，上传即可开始
                </p>
              </div>

              <div className={cn(
                'relative rounded-2xl border backdrop-blur-md p-6 sm:p-8 shadow-lg',
                theme === 'dark'
                  ? 'bg-slate-800/60 border-slate-700/50'
                  : 'bg-white/70 border-white/60'
              )}>
                {steps.map((step) => (
                  <StepCard key={step.number} {...step} />
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <div className="mb-2">
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white">
                  灵活定价
                </h2>
                <p className="mt-3 text-slate-600 dark:text-slate-400">
                  从免费开始，按需升级。无隐藏费用，随时取消。
                </p>
              </div>

              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                {pricingTiers.map((tier, idx) => (
                  <PricingTeaseCard
                    key={tier.name}
                    {...tier}
                    highlight={idx === 1}
                    theme={theme}
                  />
                ))}
              </div>

              <Link
                href="/pricing"
                className={cn(
                  'flex items-center justify-center gap-2 rounded-xl border px-6 py-3 text-sm font-semibold',
                  'backdrop-blur-sm transition-all duration-300 hover:scale-[1.01]',
                  theme === 'dark'
                    ? 'bg-slate-800/80 border-slate-700/50 text-slate-300 hover:bg-slate-700'
                    : 'bg-white/80 border-slate-200/50 text-slate-700 hover:bg-white'
                )}
              >
                查看完整定价详情
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="relative px-4 py-12">
        <div className="mx-auto max-w-4xl">
          <div className="relative overflow-hidden rounded-2xl border border-white/40 dark:border-slate-700/50 bg-gradient-to-br from-blue-500/90 to-indigo-600/90 dark:from-blue-600/80 dark:to-indigo-700/80 p-8 sm:p-12 text-center shadow-2xl backdrop-blur-sm">
            <div className="absolute -right-4 -top-4 h-32 w-32 rounded-full bg-gradient-to-br from-white/20 to-transparent" />
            <div className="absolute -left-4 -bottom-4 h-24 w-24 rounded-full bg-gradient-to-tr from-white/10 to-transparent" />

            <div className="relative z-10">
              <h2 className="text-2xl sm:text-3xl font-bold text-white">
                准备好提升学习效率了吗？
              </h2>
              <p className="mt-4 text-lg text-blue-100">
                立即注册，免费体验 AI 知识整理与智能复习。
              </p>
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/auth/register"
                  className="flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-bold text-blue-600 shadow-xl transition-all hover:bg-blue-50 hover:scale-105"
                >
                  <Zap className="h-5 w-5" />
                  免费开始
                </Link>
                <Link
                  href="/docs"
                  className="flex items-center gap-2 rounded-xl border-2 border-white/30 bg-white/10 px-8 py-4 text-base font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20"
                >
                  <FileText className="h-5 w-5" />
                  了解更多
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative px-4 py-10">
        <div className="mx-auto max-w-xl text-center">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">
            订阅产品更新
          </h3>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            获取新功能通知、学习技巧与独家优惠
          </p>
          {subscribed ? (
            <div className={cn(
              'mt-4 rounded-xl p-3 text-sm font-medium',
              'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400'
            )}>
              订阅成功！我们会将最新动态发送到您的邮箱。
            </div>
          ) : (
            <form onSubmit={handleSubscribe} className="mt-4 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Mail className={cn(
                  'absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5',
                  theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                )} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className={cn(
                    'w-full rounded-xl border py-3 pl-11 pr-4 text-sm font-medium',
                    'transition-all duration-300',
                    'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500',
                    theme === 'dark'
                      ? 'bg-slate-800/80 border-slate-600/50 text-white placeholder-slate-500'
                      : 'bg-white/80 border-slate-200/50 text-slate-700 placeholder-slate-400'
                  )}
                />
              </div>
              <button
                type="submit"
                className={cn(
                  'rounded-xl px-6 py-3 text-sm font-semibold text-white',
                  'bg-gradient-to-r from-blue-600 to-indigo-600',
                  'hover:from-blue-500 hover:to-indigo-500',
                  'shadow-lg shadow-blue-500/25 hover:shadow-xl',
                  'transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]'
                )}
              >
                订阅
              </button>
            </form>
          )}
        </div>
      </section>

      <footer className="relative px-4 py-10 border-t border-slate-200 dark:border-slate-800">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="text-sm text-slate-500 dark:text-slate-400">
              <p>© 2026 知识智能平台. 保留所有权利。</p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
              <Link
                href="/legal/terms"
                className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                <Shield className="h-4 w-4" />
                服务条款
              </Link>
              <Link
                href="/legal/privacy"
                className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                <FileText className="h-4 w-4" />
                隐私政策
              </Link>
              <Link
                href="/legal/refund"
                className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                退款政策
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
