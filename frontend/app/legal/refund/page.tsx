'use client';

import { Navigation } from '@/components/navigation/Navigation';
import { useTheme } from '@/components/theme/ThemeProvider';
import { clsx } from 'clsx';
import Link from 'next/link';
import {
  RefreshCw, CheckCircle, Clock, AlertCircle, Mail, ArrowLeft,
  Scale, Lock, FileText
} from 'lucide-react';

function DecorativeOrb({ className }: { className: string }) {
  return (
    <div className={`absolute rounded-full bg-gradient-to-br opacity-50 pointer-events-none ${className}`} />
  );
}

function SectionCard({
  icon,
  title,
  enTitle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  enTitle: string;
  children: React.ReactNode;
}) {
  const { theme } = useTheme();
  return (
    <div
      className={clsx(
        'rounded-2xl border backdrop-blur-md p-6 shadow-lg transition-all duration-300',
        theme === 'dark'
          ? 'bg-slate-800/60 border-slate-700/50'
          : 'bg-white/70 border-white/60'
      )}
    >
      <div className="flex items-center gap-3 mb-4">
        <div
          className={clsx(
            'flex h-10 w-10 items-center justify-center rounded-xl shadow-md',
            theme === 'dark'
              ? 'bg-gradient-to-br from-emerald-600 to-teal-600'
              : 'bg-gradient-to-br from-emerald-500 to-teal-600'
          )}
        >
          {icon}
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">{title}</h2>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {enTitle}
          </p>
        </div>
      </div>
      <div className="space-y-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        {children}
      </div>
    </div>
  );
}

export default function RefundPage() {
  const { theme } = useTheme();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <Navigation />

      <section className="relative overflow-hidden px-4 pt-20 pb-10">
        <DecorativeOrb className="from-emerald-400/20 to-transparent -right-16 -top-16 h-64 w-64 dark:from-emerald-600/15" />
        <DecorativeOrb className="from-teal-400/15 to-transparent -left-12 bottom-0 h-44 w-44 dark:from-teal-600/10" />

        <div className="relative z-10 mx-auto max-w-4xl text-center px-4">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-200 dark:border-emerald-800 bg-emerald-50/80 dark:bg-emerald-900/30 px-4 py-1.5 backdrop-blur-sm">
            <RefreshCw className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Legal</span>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl text-slate-900 dark:text-white">
            退款政策
          </h1>
          <p className="mt-3 text-lg text-slate-500 dark:text-slate-400">
            Refund Policy
          </p>
          <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
            最后更新：2026年7月12日 | Last updated: July 12, 2026
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-4 pb-16 space-y-6">
        <SectionCard
          icon={<CheckCircle className="h-5 w-5 text-white" />}
          title="退款条件"
          enTitle="Refund Eligibility"
        >
          <p>
            我们提供<strong>7 天无理由退款保证</strong>，适用于所有付费套餐（月卡 ¥19/月、年卡 ¥198/年）。
          </p>
          <p>
            符合以下条件即可申请全额退款：
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>自购买之日起 7 个自然日内提出申请；</li>
            <li>申请账户在申请退款时处于正常状态（未因违规被封禁）；</li>
            <li>同一账户在同一自然年内最多可申请 1 次退款。</li>
          </ul>
          <p>
            免费套餐（Free）不涉及退款。7 天免费试用期结束后自动转为免费套餐，试用期间无需付费，因此不适用退款。
          </p>
          <p className="text-slate-500 dark:text-slate-500 text-xs">
            We offer a 7-day money-back guarantee for all paid subscriptions (Monthly ¥19/mo, Annual ¥198/yr). Eligible if requested within 7 days of purchase, account is in good standing, and no more than 1 refund per calendar year. Free tier and trial periods are not eligible for refunds.
          </p>
        </SectionCard>

        <SectionCard
          icon={<Clock className="h-5 w-5 text-white" />}
          title="退款流程与时限"
          enTitle="Refund Process & Timeline"
        >
          <p>
            退款申请流程如下：
          </p>
          <ol className="list-decimal pl-5 space-y-1">
            <li>
              <strong>提交申请</strong>：通过本页底部邮箱或平台内"设置 &gt; 订阅管理"提交退款申请，注明购买订单号及退款原因；
            </li>
            <li>
              <strong>审核处理</strong>：我们将在 3 个工作日内完成审核。审核期间您的套餐权益保持不变；
            </li>
            <li>
              <strong>退款到账</strong>：审核通过后，款项将原路退回至您的支付账户（微信支付或支付宝）。到账时间取决于支付渠道，通常为 3–10 个工作日。
            </li>
          </ol>
          <p>
            退款成功后，您的账户将自动降级为免费套餐，已使用的付费额度不计入退款扣减（7 天内全额退）。
          </p>
          <p className="text-slate-500 dark:text-slate-500 text-xs">
            Submit via email or Settings &gt; Subscription with order ID and reason. We review within 3 business days. Refunds are returned to the original payment method (WeChat Pay / Alipay) within 3–10 business days. After refund, your account downgrades to the free tier; usage during the period is not deducted.
          </p>
        </SectionCard>

        <SectionCard
          icon={<AlertCircle className="h-5 w-5 text-white" />}
          title="特殊情况"
          enTitle="Special Circumstances"
        >
          <p>
            以下情况不适用标准 7 天退款政策，但可联系客服协商处理：
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>超过 7 天</strong>：购买超过 7 天后原则上不予退款。但若因平台重大故障导致服务连续不可用超过 48 小时，可申请按比例退还剩余时长费用；
            </li>
            <li>
              <strong>年卡中途退订</strong>：年卡用户在购买 7 天后要求退订，可按照剩余未使用月份的比例退还费用（已使用月份按月卡单价 ¥19 折算，退还剩余部分）；
            </li>
            <li>
              <strong>重复扣款</strong>：因系统或支付渠道故障导致的重复扣款，一经核实全额退还重复部分，不受 7 天限制；
            </li>
            <li>
              <strong>欺诈或滥用</strong>：如发现利用退款政策进行恶意套利（如反复购买-退款以获取免费 AI 额度），我们有权拒绝退款并保留追究责任的权利。
            </li>
          </ul>
          <p className="text-slate-500 dark:text-slate-500 text-xs">
            Beyond 7 days, refunds are generally not available unless platform downtime exceeds 48 hours (prorated) or duplicate charges occurred (full refund). Annual subscribers may receive a prorated refund after 7 days based on unused months. We reserve the right to deny refunds in cases of fraud or policy abuse.
          </p>
        </SectionCard>

        <SectionCard
          icon={<Mail className="h-5 w-5 text-white" />}
          title="联系方式"
          enTitle="Contact Us"
        >
          <p>
            如有关于退款的任何疑问或需要提交退款申请，请通过以下方式联系我们的支持团队：
          </p>
          <div className="flex items-center gap-2 mt-2">
            <Mail className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
            <a
              href="mailto:zimonathanzhou@outlook.com?subject=Refund%20Request"
              className="text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              zimonathanzhou@outlook.com
            </a>
          </div>
          <p className="mt-2">
            请在邮件标题注明"退款申请"，并在正文中提供注册邮箱、订单号及退款原因，以便我们快速处理。
          </p>
          <p className="text-slate-500 dark:text-slate-500 text-xs">
            For refund questions or to submit a request, email zimonathanzhou@outlook.com with subject "Refund Request" and include your registered email, order ID, and reason for faster processing.
          </p>
        </SectionCard>

        <div
          className={clsx(
            'rounded-2xl border backdrop-blur-md p-6 shadow-lg',
            theme === 'dark'
              ? 'bg-slate-800/60 border-slate-700/50'
              : 'bg-white/70 border-white/60'
          )}
        >
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link
                href="/legal/terms"
                className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
              >
                <Scale className="h-4 w-4" />
                服务条款
              </Link>
              <Link
                href="/legal/privacy"
                className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
              >
                <Lock className="h-4 w-4" />
                隐私政策
              </Link>
            </div>
            <Link
              href="/"
              className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              返回首页
            </Link>
          </div>
        </div>

        <div className="text-center text-xs text-slate-400 dark:text-slate-500 pt-4">
          <p>© 2026 OCR Knowledge Base Matcher. 保留所有权利。</p>
        </div>
      </div>
    </div>
  );
}
