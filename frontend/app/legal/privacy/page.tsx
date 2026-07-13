'use client';

import { Navigation } from '@/components/navigation/Navigation';
import { useTheme } from '@/components/theme/ThemeProvider';
import { clsx } from 'clsx';
import Link from 'next/link';
import {
  Lock, Database, Share2, Eye, Cookie, Mail, ArrowLeft,
  FileText, Scale, RefreshCw, UserCheck, Server
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
              ? 'bg-gradient-to-br from-violet-600 to-purple-600'
              : 'bg-gradient-to-br from-violet-500 to-purple-600'
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

export default function PrivacyPage() {
  const { theme } = useTheme();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <Navigation />

      <section className="relative overflow-hidden px-4 pt-20 pb-10">
        <DecorativeOrb className="from-violet-400/20 to-transparent -right-16 -top-16 h-64 w-64 dark:from-violet-600/15" />
        <DecorativeOrb className="from-blue-400/15 to-transparent -left-12 bottom-0 h-44 w-44 dark:from-blue-600/10" />

        <div className="relative z-10 mx-auto max-w-4xl text-center px-4">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-violet-200 dark:border-violet-800 bg-violet-50/80 dark:bg-violet-900/30 px-4 py-1.5 backdrop-blur-sm">
            <Lock className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            <span className="text-sm font-medium text-violet-700 dark:text-violet-300">Legal</span>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl text-slate-900 dark:text-white">
            隐私政策
          </h1>
          <p className="mt-3 text-lg text-slate-500 dark:text-slate-400">
            Privacy Policy
          </p>
          <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
            最后更新：2026年7月12日 | Last updated: July 12, 2026
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-4 pb-16 space-y-6">
        <SectionCard
          icon={<Eye className="h-5 w-5 text-white" />}
          title="信息收集"
          enTitle="Information We Collect"
        >
          <p>
            为了向您提供服务，我们收集以下类型的信息：
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>账户信息</strong>：电子邮箱地址、姓名（可选）、注册时间；</li>
            <li><strong>使用数据</strong>：上传的文档、图片及 OCR 提取的文本内容，知识图谱节点与关系数据，测验与闪卡的学习记录；</li>
            <li><strong>设备信息</strong>：浏览器类型、操作系统、IP 地址（用于安全审计与反欺诈）；</li>
            <li><strong>支付信息</strong>：如购买付费套餐，支付由微信支付或支付宝处理，我们不直接存储银行卡信息。</li>
          </ul>
          <p className="text-slate-500 dark:text-slate-500 text-xs">
            We collect account info (email, name), usage data (uploaded documents, OCR text, graph data, quiz/flashcard records), device info (browser, OS, IP for security), and payment info handled by third-party processors (WeChat Pay / Alipay).
          </p>
        </SectionCard>

        <SectionCard
          icon={<Database className="h-5 w-5 text-white" />}
          title="信息使用"
          enTitle="How We Use Information"
        >
          <p>
            我们使用您的信息用于以下目的：
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>提供、维护和改进平台功能（如 AI 知识提取、个性化测验推荐）；</li>
            <li>生成学习进度分析报告与知识掌握度统计；</li>
            <li>保障账户安全，检测和防止欺诈、滥用行为；</li>
            <li>发送服务通知（如账户验证、套餐到期提醒）；</li>
            <li>遵守法律法规要求或响应合法的法律程序。</li>
          </ul>
          <p>
            我们不会将您的个人数据用于与您使用本平台无关的广告定向推送。
          </p>
          <p className="text-slate-500 dark:text-slate-500 text-xs">
            We use your data to operate and improve the Platform, generate learning analytics, ensure security, send service notifications, and comply with legal obligations. We do not use your data for unrelated ad targeting.
          </p>
        </SectionCard>

        <SectionCard
          icon={<Share2 className="h-5 w-5 text-white" />}
          title="信息共享"
          enTitle="Information Sharing"
        >
          <p>
            我们高度重视您的隐私，不会出售您的个人信息。仅在以下有限情形下可能共享数据：
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>服务提供商</strong>：向提供服务器托管、AI 接口（Moonshot AI）的技术服务商共享必要数据，且受合同约束仅用于提供服务；</li>
            <li><strong>法律要求</strong>：根据法律法规、法院命令或政府要求披露；</li>
            <li><strong>业务转让</strong>：如发生合并、收购或资产出售，我们将提前通知并确保接收方遵守同等隐私保护标准；</li>
            <li><strong>经您同意</strong>：在获得您明确授权的其他情形。</li>
          </ul>
          <p className="text-slate-500 dark:text-slate-500 text-xs">
            We do not sell your personal information. Data is shared only with service providers (hosting, AI APIs) under contract, when required by law, during business transfers with notice, or with your explicit consent.
          </p>
        </SectionCard>

        <SectionCard
          icon={<Server className="h-5 w-5 text-white" />}
          title="数据存储与安全"
          enTitle="Data Storage & Security"
        >
          <p>
            您的数据存储于中国大陆境内的服务器上。我们采用 SQLite 数据库存储用户数据，并通过以下措施保障安全：
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>传输层使用 HTTPS/TLS 加密；</li>
            <li>密码经 bcrypt 哈希处理后存储，明文密码不可恢复；</li>
            <li>定期自动备份数据库，保留 30 天本地备份及 90 天云端备份；</li>
            <li>访问控制与审计日志，防止未授权访问。</li>
          </ul>
          <p>
            尽管我们采取合理措施保护数据，互联网传输不存在绝对安全。如发生数据泄露事件，我们将按照法律法规要求及时通知受影响用户。
          </p>
          <p className="text-slate-500 dark:text-slate-500 text-xs">
            Data is stored on servers in mainland China. We use HTTPS/TLS, bcrypt password hashing, automated backups (30 days local / 90 days cloud), and access controls. No internet transmission is 100% secure; we will notify users promptly in case of a breach as required by law.
          </p>
        </SectionCard>

        <SectionCard
          icon={<UserCheck className="h-5 w-5 text-white" />}
          title="用户权利"
          enTitle="Your Rights"
        >
          <p>
            根据《中华人民共和国个人信息保护法》（PIPL），您享有以下权利：
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>查阅与复制</strong>：有权查阅我们持有的您的个人信息，并申请复制；</li>
            <li><strong>更正</strong>：有权要求更正不准确或不完整的个人信息；</li>
            <li><strong>删除</strong>：在特定情形下有权要求删除个人信息（如撤回同意、服务终止）；</li>
            <li><strong>限制处理</strong>：有权在争议期间要求限制对个人信息的处理；</li>
            <li><strong>撤回同意</strong>：有权随时撤回此前给予的同意，不影响撤回前已进行的处理活动的效力。</li>
          </ul>
          <p>
            行使上述权利请通过本页底部联系方式与我们联系，我们将在 15 个工作日内响应。
          </p>
          <p className="text-slate-500 dark:text-slate-500 text-xs">
            Under PIPL, you have the right to access, correct, delete, restrict processing of, and withdraw consent for your personal information. Contact us below; we will respond within 15 business days.
          </p>
        </SectionCard>

        <SectionCard
          icon={<Cookie className="h-5 w-5 text-white" />}
          title="Cookie 与类似技术"
          enTitle="Cookies & Similar Technologies"
        >
          <p>
            本平台使用 Cookie 和本地存储（LocalStorage）以保障基本功能运行：
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>必要 Cookie</strong>：用于维持登录状态（JWT Token 存储）和主题偏好；</li>
            <li><strong>分析 Cookie</strong>：我们使用自托管的匿名统计工具了解功能使用情况，不追踪个人身份；</li>
            <li><strong>第三方追踪</strong>：我们不使用 Google Analytics、Facebook Pixel 等第三方追踪工具。</li>
          </ul>
          <p>
            您可以通过浏览器设置清除 Cookie 或拒绝 Cookie，但可能导致部分功能（如保持登录）无法正常使用。
          </p>
          <p className="text-slate-500 dark:text-slate-500 text-xs">
            We use essential cookies for authentication and theme preferences, plus self-hosted anonymous analytics. We do not use third-party trackers like Google Analytics or Facebook Pixel. Disabling cookies may affect login persistence.
          </p>
        </SectionCard>

        <SectionCard
          icon={<Mail className="h-5 w-5 text-white" />}
          title="联系方式"
          enTitle="Contact Us"
        >
          <p>
            如您对本隐私政策有任何疑问、投诉或希望行使您的权利，请通过以下方式联系我们：
          </p>
          <div className="flex items-center gap-2 mt-2">
            <Mail className="h-4 w-4 text-violet-500 dark:text-violet-400" />
            <a
              href="mailto:zimonathanzhou@outlook.com?subject=Privacy%20Inquiry"
              className="text-sm font-medium text-violet-600 dark:text-violet-400 hover:underline"
            >
              zimonathanzhou@outlook.com
            </a>
          </div>
          <p className="mt-2">
            我们将在收到您的请求后 15 个工作日内予以回复。如涉及重大隐私政策变更，我们将通过邮件或平台公告提前通知您。
          </p>
          <p className="text-slate-500 dark:text-slate-500 text-xs">
            For privacy questions, complaints, or to exercise your rights, email us at zimonathanzhou@outlook.com. We will respond within 15 business days. Major policy changes will be notified via email or platform announcement.
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
                className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
              >
                <Scale className="h-4 w-4" />
                服务条款
              </Link>
              <Link
                href="/legal/refund"
                className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
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
