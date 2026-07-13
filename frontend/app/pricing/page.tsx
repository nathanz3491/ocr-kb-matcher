'use client';

import { useState } from 'react';
import { Navigation } from '@/components/navigation/Navigation';
import {
  Check, X, Zap, Sparkles, ArrowRight, ChevronDown, ChevronUp,
  ShoppingCart, QrCode, Settings, Gift, HelpCircle, Clock,
  Shield, FileText, RefreshCw, Crown, Star
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/theme/ThemeProvider';

interface PricingTier {
  id: string;
  name: string;
  nameEn: string;
  price: string;
  period: string;
  periodEn: string;
  description: string;
  features: string[];
  notIncluded?: string[];
  highlight?: boolean;
  ctaText: string;
  badge?: string;
}

interface ComparisonRow {
  feature: string;
  featureEn: string;
  free: string | boolean;
  monthly: string | boolean;
  yearly: string | boolean;
}

interface FaqItem {
  question: string;
  answer: string;
}

const tiers: PricingTier[] = [
  {
    id: 'free',
    name: '免费版',
    nameEn: 'Free',
    price: '¥0',
    period: '/月',
    periodEn: '/month',
    description: '适合初次体验，零成本开始智能学习',
    features: [
      '每月 2 次文档上传',
      '每月 3 次测验生成',
      '每月 20 条 AI 对话',
      '基础知识图谱',
      '闪卡复习（最多 50 张）',
      '社区支持',
    ],
    notIncluded: [
      '高级分析报告',
      '优先客服支持',
      '批量导入导出',
    ],
    ctaText: '免费开始',
  },
  {
    id: 'monthly',
    name: '月度会员',
    nameEn: 'Monthly',
    price: '¥19',
    period: '/月',
    periodEn: '/month',
    description: '按月订阅，灵活可控，随时取消',
    features: [
      '每月 15 次文档上传',
      '每月 30 次测验生成',
      '每月 100 条 AI 对话',
      '完整知识图谱编辑',
      '无限闪卡复习',
      '错题本与 SM-2 复习',
      '学习进度分析',
      '邮件客服支持',
    ],
    highlight: true,
    badge: '最受欢迎',
    ctaText: '立即购买',
  },
  {
    id: 'yearly',
    name: '年度会员',
    nameEn: 'Yearly',
    price: '¥198',
    period: '/年',
    periodEn: '/year',
    description: '年度订阅更划算，相当于 ¥16.5/月',
    features: [
      '每月 15 次文档上传',
      '每月 30 次测验生成',
      '每月 100 条 AI 对话',
      '完整知识图谱编辑',
      '无限闪卡复习',
      '错题本与 SM-2 复习',
      '学习进度分析 + 周报',
      '优先客服支持',
      '批量导入导出',
      '新功能抢先体验',
    ],
    badge: '最佳价值',
    ctaText: '立即购买',
  },
];

const comparisonRows: ComparisonRow[] = [
  { feature: '文档上传', featureEn: 'Document uploads', free: '2 / 月', monthly: '15 / 月', yearly: '15 / 月' },
  { feature: '测验生成', featureEn: 'Quiz generation', free: '3 / 月', monthly: '30 / 月', yearly: '30 / 月' },
  { feature: 'AI 对话', featureEn: 'AI chat messages', free: '20 / 月', monthly: '100 / 月', yearly: '100 / 月' },
  { feature: '知识图谱', featureEn: 'Knowledge graph', free: '只读', monthly: '完整编辑', yearly: '完整编辑' },
  { feature: '闪卡数量', featureEn: 'Flashcards', free: '50 张上限', monthly: '无限', yearly: '无限' },
  { feature: 'SM-2 复习', featureEn: 'SM-2 review', free: false, monthly: true, yearly: true },
  { feature: '错题本', featureEn: 'Wrong-question book', free: false, monthly: true, yearly: true },
  { feature: '学习分析', featureEn: 'Analytics', free: '基础', monthly: '完整', yearly: '完整 + 周报' },
  { feature: '批量导出', featureEn: 'Batch export', free: false, monthly: false, yearly: true },
  { feature: '客服支持', featureEn: 'Support', free: '社区', monthly: '邮件', yearly: '优先' },
  { feature: '新功能抢先', featureEn: 'Early access', free: false, monthly: false, yearly: true },
];

const faqs: FaqItem[] = [
  {
    question: '免费版和付费版有什么区别？',
    answer: '免费版每月提供 2 次上传、3 次测验生成和 20 条 AI 对话，适合初次体验。付费版大幅提升额度，并解锁知识图谱编辑、SM-2 间隔重复、错题本、学习分析等核心功能。',
  },
  {
    question: '购买后如何兑换会员？',
    answer: '购买后你会收到一串兑换码。登录平台后，进入「设置」→「会员与兑换」，输入兑换码即可立即激活对应时长的会员权益。',
  },
  {
    question: '月度会员和年度会员哪个更划算？',
    answer: '年度会员 ¥198/年，相当于 ¥16.5/月，比月度会员 ¥19/月节省约 13%。如果你计划长期使用，年度会员是更经济的选择。',
  },
  {
    question: '会员到期后会怎样？',
    answer: '会员到期后，你的数据（知识图谱、闪卡、错题本等）会完整保留，但功能将回退到免费版额度。重新购买会员后可立即恢复全部功能。',
  },
  {
    question: '可以退款吗？',
    answer: '兑换码一经使用即激活会员时长，原则上不支持退款。如遇到技术问题导致无法使用，请联系客服协商处理。建议先使用免费版充分体验后再决定是否购买。',
  },
  {
    question: '一个兑换码可以用多久？',
    answer: '每个兑换码对应固定的会员时长：月度码激活 30 天，年度码激活 365 天。兑换码只能使用一次，使用后即失效。',
  },
  {
    question: '支持哪些支付方式？',
    answer: '目前支持淘宝和微信购买兑换码。点击「立即购买」按钮将跳转到对应购买页面。后续可能会增加更多支付渠道。',
  },
];

const redeemSteps = [
  {
    number: '1',
    title: '购买兑换码',
    titleEn: 'Purchase code',
    description: '点击「立即购买」前往淘宝或微信店铺，选择月度或年度会员并完成支付。',
    icon: <ShoppingCart className="h-6 w-6 text-white" />,
    color: 'bg-gradient-to-br from-blue-500 to-indigo-600',
  },
  {
    number: '2',
    title: '获取兑换码',
    titleEn: 'Get your code',
    description: '支付成功后，你会在订单详情或私信中收到一串字母数字组合的兑换码。',
    icon: <QrCode className="h-6 w-6 text-white" />,
    color: 'bg-gradient-to-br from-violet-500 to-purple-600',
  },
  {
    number: '3',
    title: '登录并兑换',
    titleEn: 'Redeem in settings',
    description: '登录平台，进入「设置」→「会员与兑换」，粘贴兑换码并点击确认，会员立即生效。',
    icon: <Gift className="h-6 w-6 text-white" />,
    color: 'bg-gradient-to-br from-rose-500 to-pink-600',
  },
];

function PricingCard({ tier, theme }: { tier: PricingTier; theme: 'light' | 'dark' }) {
  const purchaseUrl = process.env.NEXT_PUBLIC_PURCHASE_URL || 'https://example.com/purchase';

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border backdrop-blur-md p-6 transition-all duration-300',
        theme === 'dark'
          ? 'bg-slate-800/60 border-slate-700/50'
          : 'bg-white/70 border-white/60',
        tier.highlight && 'ring-2 ring-blue-500/50 shadow-lg shadow-blue-500/10 scale-[1.02]'
      )}
    >
      {tier.badge && (
        <div className={cn(
          'absolute top-0 right-0 text-white text-xs font-bold px-3 py-1 rounded-bl-xl',
          tier.id === 'yearly'
            ? 'bg-gradient-to-l from-emerald-500 to-teal-500'
            : 'bg-gradient-to-l from-blue-500 to-indigo-500'
        )}>
          {tier.badge}
        </div>
      )}

      <div className="mb-4">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white">{tier.name}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-500 mt-0.5">{tier.nameEn}</p>
      </div>

      <div className="flex items-baseline gap-1 mb-4">
        <span className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">{tier.price}</span>
        <span className="text-sm text-slate-500 dark:text-slate-500">{tier.period}</span>
        <span className="text-xs text-slate-400 dark:text-slate-500 ml-1">{tier.periodEn}</span>
      </div>

      <p className="text-sm text-slate-600 dark:text-slate-400 mb-5">{tier.description}</p>

      <ul className="space-y-2.5 mb-6">
        {tier.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
            <Check className="h-4 w-4 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
            {f}
          </li>
        ))}
        {tier.notIncluded?.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-slate-400 dark:text-slate-500">
            <X className="h-4 w-4 text-slate-400 dark:text-slate-500 shrink-0 mt-0.5" />
            {f}
          </li>
        ))}
      </ul>

      <a
        href={purchaseUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          'group flex items-center justify-center gap-2 w-full rounded-xl py-3 text-sm font-semibold',
          'transition-all duration-300',
          tier.highlight
            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:scale-[1.01] active:scale-[0.99]'
            : theme === 'dark'
              ? 'bg-slate-800/80 border border-slate-700/50 text-slate-300 hover:bg-slate-700 hover:border-slate-600'
              : 'bg-white/80 border border-slate-200/50 text-slate-700 hover:bg-white hover:border-slate-300'
        )}
      >
        {tier.highlight && <Zap className="h-4 w-4" />}
        {tier.ctaText}
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </a>
    </div>
  );
}

function ComparisonTable({ theme }: { theme: 'light' | 'dark' }) {
  const renderCell = (value: string | boolean) => {
    if (typeof value === 'boolean') {
      return value ? (
        <Check className="h-5 w-5 text-emerald-500 dark:text-emerald-400 mx-auto" />
      ) : (
        <X className="h-5 w-5 text-slate-400 dark:text-slate-500 mx-auto" />
      );
    }
    return <span className="text-sm text-slate-700 dark:text-slate-300">{value}</span>;
  };

  return (
    <div className={cn(
      'overflow-hidden rounded-2xl border backdrop-blur-md shadow-lg',
      theme === 'dark'
        ? 'bg-slate-800/60 border-slate-700/50'
        : 'bg-white/70 border-white/60'
    )}>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className={cn(
              'border-b',
              theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200/50'
            )}>
              <th className="px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 min-w-[160px]">
                功能
                <span className="block text-xs font-normal text-slate-500 dark:text-slate-500">Feature</span>
              </th>
              <th className="px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 text-center min-w-[100px]">
                免费版
              </th>
              <th className="px-4 py-3 text-sm font-semibold text-blue-600 dark:text-blue-400 text-center min-w-[100px]">
                月度
              </th>
              <th className="px-4 py-3 text-sm font-semibold text-emerald-600 dark:text-emerald-400 text-center min-w-[100px]">
                年度
              </th>
            </tr>
          </thead>
          <tbody>
            {comparisonRows.map((row, idx) => (
              <tr
                key={row.feature}
                className={cn(
                  'border-b transition-colors',
                  theme === 'dark' ? 'border-slate-700/30 hover:bg-slate-700/20' : 'border-slate-200/30 hover:bg-slate-50/50',
                  idx === comparisonRows.length - 1 && 'border-b-0'
                )}
              >
                <td className="px-4 py-3">
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{row.feature}</span>
                  <span className="block text-xs text-slate-500 dark:text-slate-500">{row.featureEn}</span>
                </td>
                <td className="px-4 py-3 text-center">{renderCell(row.free)}</td>
                <td className="px-4 py-3 text-center">{renderCell(row.monthly)}</td>
                <td className="px-4 py-3 text-center">{renderCell(row.yearly)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RedeemStep({ step, theme }: { step: typeof redeemSteps[0]; theme: 'light' | 'dark' }) {
  return (
    <div className="relative flex gap-4">
      <div className="flex flex-col items-center">
        <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl shadow-lg', step.color)}>
          {step.icon}
        </div>
        <div className="mt-2 h-full w-0.5 bg-gradient-to-b from-slate-300 to-transparent dark:from-slate-600" />
      </div>
      <div className="flex-1 pb-8">
        <div className="flex items-center gap-2 mb-1">
          <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full text-white', step.color)}>
            步骤 {step.number}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-500">{step.titleEn}</span>
        </div>
        <h4 className="text-base font-bold text-slate-800 dark:text-white">{step.title}</h4>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{step.description}</p>
      </div>
    </div>
  );
}

function FaqAccordion({ faq, theme }: { faq: FaqItem; theme: 'light' | 'dark' }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={cn(
        'rounded-xl border backdrop-blur-md transition-all duration-300',
        theme === 'dark'
          ? 'bg-slate-800/60 border-slate-700/50'
          : 'bg-white/70 border-white/60',
        open && 'shadow-lg'
      )}
    >
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full px-5 py-4 text-left"
      >
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 pr-4">{faq.question}</span>
        {open ? (
          <ChevronUp className="h-5 w-5 text-slate-500 dark:text-slate-500 shrink-0" />
        ) : (
          <ChevronDown className="h-5 w-5 text-slate-500 dark:text-slate-500 shrink-0" />
        )}
      </button>
      {open && (
        <div className="px-5 pb-4">
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{faq.answer}</p>
        </div>
      )}
    </div>
  );
}

export default function PricingPage() {
  const { theme } = useTheme();
  const purchaseUrl = process.env.NEXT_PUBLIC_PURCHASE_URL || 'https://example.com/purchase';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <Navigation />

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 blur-3xl" />
      </div>

      <section className="relative px-4 pt-24 pb-16">
        <div className="mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 dark:border-blue-800 bg-blue-50/80 dark:bg-blue-900/30 px-4 py-1.5 mb-6 backdrop-blur-sm">
            <Crown className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">选择适合你的学习计划</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            透明定价，
            <span className="bg-gradient-to-r from-blue-600 via-violet-600 to-indigo-600 dark:from-blue-400 dark:via-violet-400 dark:to-indigo-400 bg-clip-text text-transparent">
              按需升级
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base sm:text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
            从免费版开始体验，随时升级到月度或年度会员，解锁更多 AI 学习助力。
          </p>
        </div>
      </section>

      <section className="relative px-4 pb-16">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-6 grid-cols-1 md:grid-cols-3 items-start">
            {tiers.map((tier) => (
              <PricingCard key={tier.id} tier={tier} theme={theme} />
            ))}
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm text-slate-500 dark:text-slate-500">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
              <span>数据安全加密</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500 dark:text-blue-400" />
              <span>即时激活，无需等待</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-500 dark:text-amber-400" />
              <span>7×24 小时服务</span>
            </div>
          </div>
        </div>
      </section>

      <section className="relative px-4 py-16">
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white">
              功能对比
            </h2>
            <p className="mt-3 text-slate-600 dark:text-slate-400">
              详细对比各版本功能，找到最适合你的方案
            </p>
          </div>
          <ComparisonTable theme={theme} />
        </div>
      </section>

      <section className="relative px-4 py-16">
        <div className="mx-auto max-w-3xl">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white">
              如何兑换会员
            </h2>
            <p className="mt-3 text-slate-600 dark:text-slate-400">
              三步轻松激活，立即享受全部功能
            </p>
          </div>

          <div className={cn(
            'relative rounded-2xl border backdrop-blur-md p-6 sm:p-8 shadow-lg',
            theme === 'dark'
              ? 'bg-slate-800/60 border-slate-700/50'
              : 'bg-white/70 border-white/60'
          )}>
            {redeemSteps.map((step) => (
              <RedeemStep key={step.number} step={step} theme={theme} />
            ))}

            <div className="mt-2 flex items-center justify-center">
              <a
                href={purchaseUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'group flex items-center gap-2 rounded-xl px-8 py-4 text-base font-bold text-white',
                  'bg-gradient-to-r from-blue-600 to-indigo-600',
                  'hover:from-blue-500 hover:to-indigo-500',
                  'shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30',
                  'transition-all duration-300 hover:scale-105'
                )}
              >
                <Sparkles className="h-5 w-5" />
                立即购买兑换码
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="relative px-4 py-16">
        <div className="mx-auto max-w-3xl">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white">
              常见问题
            </h2>
            <p className="mt-3 text-slate-600 dark:text-slate-400">
              关于定价、购买与兑换的常见问题解答
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq) => (
              <FaqAccordion key={faq.question} faq={faq} theme={theme} />
            ))}
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
                立即购买兑换码，解锁 AI 驱动的完整学习体验。
              </p>
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                <a
                  href={purchaseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-bold text-blue-600 shadow-xl transition-all hover:bg-blue-50 hover:scale-105"
                >
                  <Zap className="h-5 w-5" />
                  立即购买
                </a>
                <Link
                  href="/auth/register"
                  className="flex items-center gap-2 rounded-xl border-2 border-white/30 bg-white/10 px-8 py-4 text-base font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20"
                >
                  <HelpCircle className="h-5 w-5" />
                  先免费体验
                </Link>
              </div>
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
