'use client';

import { useState } from 'react';
import { Navigation } from '@/components/navigation/Navigation';
import {
  Sparkles, Zap, Clock, Target, ArrowRight, Mail,
  Shield, FileText, RefreshCw, CheckCircle
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/theme/ThemeProvider';
import { useToast } from '@/components/notification/Toast';

interface TierCardProps {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  highlight?: boolean;
  ctaText: string;
  onCta: () => void;
  theme: 'light' | 'dark';
}

function TierCard({
  name,
  price,
  period,
  description,
  features,
  highlight,
  ctaText,
  onCta,
  theme,
}: TierCardProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border backdrop-blur-md p-6 transition-all duration-300',
        theme === 'dark'
          ? 'bg-slate-800/60 border-slate-700/50'
          : 'bg-white/70 border-white/60',
        highlight && 'ring-2 ring-blue-500/50 shadow-xl shadow-blue-500/10 scale-[1.02]'
      )}
    >
      {highlight && (
        <div className="absolute top-0 right-0 bg-gradient-to-l from-blue-500 to-indigo-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl">
          最受欢迎
        </div>
      )}

      <h3 className="text-lg font-bold text-slate-800 dark:text-white">{name}</h3>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-500">{description}</p>

      <div className="mt-4 flex items-baseline gap-1">
        <span className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">{price}</span>
        <span className="text-sm text-slate-500 dark:text-slate-500">{period}</span>
      </div>

      <ul className="mt-5 space-y-2.5">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
            <CheckCircle className="h-4 w-4 text-blue-500 dark:text-blue-400 shrink-0 mt-0.5" />
            {f}
          </li>
        ))}
      </ul>

      <button
        onClick={onCta}
        className={cn(
          'mt-6 w-full rounded-xl py-3 text-sm font-semibold',
          'flex items-center justify-center gap-2',
          'transition-all duration-300',
          highlight
            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-500/25 hover:shadow-xl'
            : theme === 'dark'
              ? 'bg-slate-700/60 text-slate-200 hover:bg-slate-600/80 border border-slate-600'
              : 'bg-white/80 text-slate-700 hover:bg-white border border-slate-200'
        )}
      >
        {ctaText}
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function PricingPage() {
  const { theme } = useTheme();
  const { addToast } = useToast();
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleComingSoon = () => {
    addToast('定价页面即将上线，请先免费注册体验！', 'info', 4000);
  };

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setEmail('');
      addToast('订阅成功！上线时我们会通知您。', 'success', 4000);
    }
  };

  const tiers = [
    {
      name: '免费版',
      price: '¥0',
      period: '/月',
      description: '适合初次体验',
      features: ['每月 2 次上传', '3 次测验生成', '20 条 AI 对话', '基础知识图谱'],
      ctaText: '免费开始',
    },
    {
      name: '月卡',
      price: '¥19',
      period: '/月',
      description: '灵活按月付费',
      features: ['每月 15 次上传', '30 次测验生成', '100 条 AI 对话', '完整知识图谱', '错题本与复习'],
      highlight: true,
      ctaText: '选择月卡',
    },
    {
      name: '年卡',
      price: '¥198',
      period: '/年',
      description: '最划算的长期选择',
      features: ['每月 15 次上传', '30 次测验生成', '100 条 AI 对话', '完整知识图谱', '错题本与复习', '相当于 ¥16.5/月'],
      ctaText: '选择年卡',
    },
    {
      name: '高考冲刺',
      price: '¥99',
      period: '/季',
      description: '3–6 月高考专用',
      features: ['50 次上传（一次性）', '100 次测验生成', '300 条 AI 对话', '完整知识图谱', '高考专题资料包'],
      ctaText: '选择冲刺包',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <Navigation />

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 blur-3xl" />
      </div>

      <section className="relative px-4 pt-20 pb-10">
        <div className="mx-auto max-w-4xl text-center px-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 dark:border-blue-800 bg-blue-50/80 dark:bg-blue-900/30 px-4 py-1.5 mb-6 backdrop-blur-sm">
            <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">即将上线</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            定价方案
          </h1>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            我们正在完善支付系统。以下价格预览仅供参考，正式上线时可能微调。现在注册即可免费体验全部功能。
          </p>
        </div>
      </section>

      <section className="relative px-4 py-8">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {tiers.map((tier) => (
              <TierCard
                key={tier.name}
                {...tier}
                onCta={handleComingSoon}
                theme={theme}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="relative px-4 py-10">
        <div className="mx-auto max-w-2xl">
          <div
            className={cn(
              'rounded-2xl border backdrop-blur-md p-6 sm:p-8 shadow-lg',
              theme === 'dark'
                ? 'bg-slate-800/60 border-slate-700/50'
                : 'bg-white/70 border-white/60'
            )}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-xl shadow-md',
                  theme === 'dark'
                    ? 'bg-gradient-to-br from-blue-600 to-purple-600'
                    : 'bg-gradient-to-br from-blue-500 to-indigo-600'
                )}
              >
                <Mail className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">订阅上线通知</h3>
                <p className="text-sm text-slate-500 dark:text-slate-500">
                  支付功能上线时第一时间通知您
                </p>
              </div>
            </div>

            {subscribed ? (
              <div
                className={cn(
                  'rounded-xl p-3 text-sm font-medium flex items-center gap-2',
                  'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800',
                  'text-emerald-600 dark:text-emerald-400'
                )}
              >
                <CheckCircle className="h-5 w-5" />
                订阅成功！我们会将最新动态发送到您的邮箱。
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Mail
                    className={cn(
                      'absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5',
                      theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                    )}
                  />
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
                  订阅通知
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      <section className="relative px-4 py-6">
        <div className="mx-auto max-w-2xl">
          <div
            className={cn(
              'rounded-2xl border backdrop-blur-md p-6 shadow-lg',
              theme === 'dark'
                ? 'bg-slate-800/60 border-slate-700/50'
                : 'bg-white/70 border-white/60'
            )}
          >
            <h3 className="text-base font-bold text-slate-800 dark:text-white mb-4">
              法律信息
            </h3>
            <div className="flex flex-wrap items-center gap-4">
              <Link
                href="/legal/terms"
                className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                <Shield className="h-4 w-4" />
                服务条款
              </Link>
              <Link
                href="/legal/privacy"
                className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                <FileText className="h-4 w-4" />
                隐私政策
              </Link>
              <Link
                href="/legal/refund"
                className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                退款政策
              </Link>
            </div>
          </div>
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
