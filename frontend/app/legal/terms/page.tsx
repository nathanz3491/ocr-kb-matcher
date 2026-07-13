'use client';

import { Navigation } from '@/components/navigation/Navigation';
import { useTheme } from '@/components/theme/ThemeProvider';
import { clsx } from 'clsx';
import Link from 'next/link';
import {
  Scale, Shield, User, BookOpen, Copyright, AlertTriangle, Gavel,
  ArrowLeft, FileText, Lock, RefreshCw
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
              ? 'bg-gradient-to-br from-blue-600 to-purple-600'
              : 'bg-gradient-to-br from-blue-500 to-indigo-600'
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

export default function TermsPage() {
  const { theme } = useTheme();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <Navigation />

      <section className="relative overflow-hidden px-4 pt-20 pb-10">
        <DecorativeOrb className="from-blue-400/20 to-transparent -right-16 -top-16 h-64 w-64 dark:from-blue-600/15" />
        <DecorativeOrb className="from-violet-400/15 to-transparent -left-12 bottom-0 h-44 w-44 dark:from-violet-600/10" />

        <div className="relative z-10 mx-auto max-w-4xl text-center px-4">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-200 dark:border-blue-800 bg-blue-50/80 dark:bg-blue-900/30 px-4 py-1.5 backdrop-blur-sm">
            <Scale className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Legal</span>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl text-slate-900 dark:text-white">
            服务条款
          </h1>
          <p className="mt-3 text-lg text-slate-500 dark:text-slate-400">
            Terms of Service
          </p>
          <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
            最后更新：2026年7月12日 | Last updated: July 12, 2026
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-4 pb-16 space-y-6">
        <SectionCard
          icon={<BookOpen className="h-5 w-5 text-white" />}
          title="服务概述"
          enTitle="Service Overview"
        >
          <p>
            本服务条款（以下简称"条款"）适用于您使用知识智能平台（Knowledge Intelligence Platform，以下简称"本平台"或"我们"）提供的所有在线服务。本平台是一款基于人工智能技术的学习工具，提供文档 OCR 识别、知识图谱构建、智能测验生成、闪卡复习、学习分析等功能。
          </p>
          <p className="text-slate-500 dark:text-slate-500 text-xs">
            These Terms of Service govern your use of the Knowledge Intelligence Platform ("Platform" or "we"), an AI-powered learning tool providing OCR, knowledge graph construction, quiz generation, flashcard review, and learning analytics.
          </p>
        </SectionCard>

        <SectionCard
          icon={<User className="h-5 w-5 text-white" />}
          title="用户账户"
          enTitle="User Accounts"
        >
          <p>
            使用本平台部分功能需要注册账户。您须年满 13 周岁方可注册。注册时需提供真实、准确的电子邮箱地址，并设置安全密码。您有责任妥善保管账户凭证，对账户下的所有活动承担全部责任。如发现未经授权的使用，请立即联系我们。
          </p>
          <p>
            我们保留因违反本条款、欺诈行为或长期不活跃（超过 24 个月）而暂停或终止账户的权利。账户终止后，您的个人数据将依据隐私政策处理。
          </p>
          <p className="text-slate-500 dark:text-slate-500 text-xs">
            Some features require registration. You must be at least 13 years old. Provide accurate information and keep credentials secure. We may suspend or terminate accounts for violations, fraud, or inactivity exceeding 24 months.
          </p>
        </SectionCard>

        <SectionCard
          icon={<Shield className="h-5 w-5 text-white" />}
          title="服务使用"
          enTitle="Acceptable Use"
        >
          <p>
            您同意仅将本平台用于合法的个人学习目的。禁止以下行为：
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>上传、分享或处理任何违法、侵权、淫秽、暴力或仇恨内容；</li>
            <li>使用自动化工具（爬虫、机器人）大规模抓取平台数据；</li>
            <li>试图破解、干扰或破坏平台的安全措施或正常运行；</li>
            <li>冒充他人身份或提供虚假信息；</li>
            <li>将平台生成的内容用于商业考试作弊或其他欺诈行为。</li>
          </ul>
          <p>
            违反上述规定可能导致账户立即终止，并保留追究法律责任的权利。
          </p>
          <p className="text-slate-500 dark:text-slate-500 text-xs">
            Use the Platform solely for lawful personal learning. Prohibited: illegal/infringing content, automated scraping, security circumvention, impersonation, or using generated content for cheating or fraud. Violations may result in immediate termination.
          </p>
        </SectionCard>

        <SectionCard
          icon={<Copyright className="h-5 w-5 text-white" />}
          title="知识产权"
          enTitle="Intellectual Property"
        >
          <p>
            您保留对上传至平台的所有原始内容（文档、图片、文本等）的所有权。上传即表示您授予本平台一项非独占、可撤销的许可，仅用于提供、改进和维护服务（如 OCR 处理、AI 分析）。
          </p>
          <p>
            平台界面、代码、品牌标识及 AI 生成的原创学习材料（如自动生成的知识图谱结构、测验题目模板）的知识产权归本平台所有。未经书面许可，不得复制、修改、分发或用于商业目的。
          </p>
          <p className="text-slate-500 dark:text-slate-500 text-xs">
            You retain ownership of uploaded content and grant us a limited license solely to operate the service. Platform UI, code, branding, and original AI-generated structural materials remain our property. No commercial use without written permission.
          </p>
        </SectionCard>

        <SectionCard
          icon={<AlertTriangle className="h-5 w-5 text-white" />}
          title="免责声明"
          enTitle="Disclaimer"
        >
          <p>
            本平台基于人工智能技术提供服务，AI 生成的内容（包括但不限于知识提取、测验答案、学习建议）可能存在错误或不准确之处，仅供参考，不构成专业教育、医疗或法律建议。
          </p>
          <p>
            在适用法律允许的最大范围内，本平台不对以下情况承担责任：服务中断、数据丢失、AI 输出错误导致的任何直接或间接损失。我们致力于持续改进服务质量，但不保证服务绝对无中断或无错误。
          </p>
          <p className="text-slate-500 dark:text-slate-500 text-xs">
            AI-generated content may contain errors and is for reference only, not professional advice. To the extent permitted by law, we are not liable for service interruptions, data loss, or damages arising from AI output inaccuracies.
          </p>
        </SectionCard>

        <SectionCard
          icon={<Gavel className="h-5 w-5 text-white" />}
          title="法律适用与争议解决"
          enTitle="Governing Law"
        >
          <p>
            本条款的订立、效力、解释、履行及争议解决均适用中华人民共和国法律（为本条款之目的，不包括港澳台地区法律）。
          </p>
          <p>
            因本条款引起的或与本条款有关的任何争议，双方应首先通过友好协商解决；协商不成的，任何一方均可向本平台运营方所在地（深圳市）有管辖权的人民法院提起诉讼。
          </p>
          <p className="text-slate-500 dark:text-slate-500 text-xs">
            These Terms are governed by the laws of the People&apos;s Republic of China. Disputes shall first be resolved through negotiation; if unsuccessful, submitted to the competent court in Shenzhen, where the Platform operator is located.
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
                href="/legal/privacy"
                className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                <Lock className="h-4 w-4" />
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
