# Frontend

Next.js 16 App Router. React 19 + Tailwind CSS 4 + shadcn/ui + framer-motion.

## Structure

```
frontend/
├── app/                    # Next.js 16 App Router pages
│   ├── dashboard/
│   ├── knowledge-graph/
│   ├── graph-editor/
│   ├── flashcards/
│   ├── quiz/
│   ├── review/
│   ├── analytics/
│   ├── progress/
│   ├── chat/
│   ├── study-plan/
│   ├── certificates/
│   ├── docs/
│   ├── help/
│   ├── import/
│   ├── jobs/
│   ├── learn/
│   ├── settings/
│   └── auth/              # Auth pages (login, register, verify)
├── components/
│   ├── ui/              # shadcn base (button, card, dialog...)
│   ├── navigation/      # Navigation component
│   ├── upload/          # FileUploader, FilePreview
│   ├── results/         # GlobalKnowledgeGraph, LocalKnowledgeGraph, ReactFlowGraph, MatchResults, OCRTextDisplay, ResultsDisplay
│   ├── analytics/       # StatsDashboard, SkillRadarChart
│   ├── quiz/            # QuizCard
│   ├── reviews/         # ReviewQueue
│   ├── recommendations/ # RecommendationCard
│   ├── subjects/        # SubjectSelector
│   ├── search/          # UniversalSearch
│   ├── theme/           # ThemeProvider
│   ├── export/          # ExportButtons
│   ├── loading/         # LoadingScreen, MinimalLoader
│   ├── notification/    # Toast, Notification
│   ├── gamification/    # StreakTracker
│   ├── auth/            # ProtectedRoute, UserMenu
│   └── navigation/
├── contexts/
│   └── AuthContext.tsx  # Auth state + login/register/logout/verify
├── hooks/
│   ├── useJobStatus.ts  # Polls job status during processing
│   └── useUpload.ts     # Upload logic
├── lib/
│   ├── utils.ts         # cn(), formatters, utilities
│   ├── auth.ts          # Auth API client (login, register, tokens)
│   └── api.ts           # Auth-aware API client
└── skills/              # User-installed skills
```

## Config

- **ESLint**: flat-config `eslint.config.mjs`, `next/core-web-vitals`
- **TS**: `strict: true`, `jsx: react-jsx`, `moduleResolution: bundler`
- **Path aliases**: `@/*` → `./frontend/*`, `@shared/*` → `../shared/*`
- **Tailwind**: v4 via `@tailwindcss/postcss` (no `tailwind.config.*`)
- **Next.js**: `httpAgentOptions.keepAlive: false`, `experimental.optimizePackageImports`

## API Client

Frontend calls backend at `http://localhost:3001/api/*`. No tRPC/REST client framework — raw `fetch` or axios. All calls include `Authorization: Bearer <token>` via `lib/api.ts`.

## STYLING — HOW THIS APP LOOKS (MANDATORY)

**Match this style exactly. Do NOT use generic AI aesthetics.**

### Theme System
Every component must support light + dark mode using `useTheme()` from `@/components/theme/ThemeProvider`.
```tsx
const { theme } = useTheme(); // 'light' | 'dark'
// Always: theme === 'dark' ? darkClasses : lightClasses
```

### Backgrounds
Light: `bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50`
Dark: `dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-800 dark:to-slate-900`
Or: `bg-white dark:bg-slate-900`

### Decorative Background Orbs
```tsx
<div className="absolute inset-0 overflow-hidden">
  <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 blur-3xl" />
  <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 blur-3xl" />
</div>
```

### Glass Cards
```tsx
<div className={clsx(
  'rounded-2xl border backdrop-blur-xl p-6 shadow-2xl',
  theme === 'dark'
    ? 'bg-slate-800/40 border-slate-700/30'
    : 'bg-white/60 border-white/40'
)}>
```

### Buttons — Primary
```tsx
<button className={clsx(
  'w-full rounded-xl py-3 text-sm font-semibold',
  'flex items-center justify-center gap-2',
  'transition-all duration-300',
  'disabled:opacity-50 disabled:cursor-not-allowed',
  theme === 'dark'
    ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white'
    : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white',
  'shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30',
  'hover:scale-[1.01] active:scale-[0.99]'
)}>
```

### Buttons — Secondary / Ghost
```tsx
<button className={clsx(
  'flex items-center gap-2 rounded-xl px-4 py-2.5',
  'border backdrop-blur-sm transition-all duration-300',
  theme === 'dark'
    ? 'bg-slate-800/80 border-slate-700/50 text-slate-300 hover:bg-slate-700 hover:border-slate-600'
    : 'bg-white/80 border-slate-200/50 text-slate-600 hover:bg-white hover:border-slate-300'
)}>
```

### Inputs
```tsx
<input
  type="email"
  placeholder="you@example.com"
  className={clsx(
    'w-full rounded-xl border py-3 pl-11 pr-4 text-sm font-medium',
    'transition-all duration-300',
    'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500',
    theme === 'dark'
      ? 'bg-slate-800/80 border-slate-600/50 text-white placeholder-slate-500'
      : 'bg-white/80 border-slate-200/50 text-slate-700 placeholder-slate-400'
  )}
/>
```

### Icon + Input Layout
```tsx
<div className="relative">
  <Mail className={clsx(
    'absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5',
    theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
  )} />
  <input className="pl-11 ..." />
</div>
```

### Text Colors
- Heading: `text-slate-800 dark:text-white`
- Body: `text-slate-600 dark:text-slate-400`
- Muted: `text-slate-500 dark:text-slate-500`
- Accent: `text-blue-600 dark:text-blue-400`
- Error: `text-red-600 dark:text-red-400`

### Typography
- Page headings: `text-2xl font-bold text-slate-800 dark:text-white`
- Section headings: `text-xl font-semibold`
- Body: `text-sm text-slate-600 dark:text-slate-400`
- Labels: `text-sm font-medium`

### Spacing & Shape
- Card padding: `p-6`
- Section gap: `gap-4` to `gap-6`
- Border radius: `rounded-xl` (inputs), `rounded-2xl` (cards), `rounded-full` (badges)
- Icon size: `h-4 w-4` (inline), `h-5 w-5` (with text), `h-8 w-8` (standalone)

### Error / Success States
```tsx
// Error
<div className="rounded-xl p-3 text-sm font-medium bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400">
// Success
<div className="rounded-xl p-3 text-sm font-medium bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400">
```

### Loading States
```tsx
<button disabled={loading} className="...">
  {loading ? (
    <Loader2 className="h-5 w-5 animate-spin" />
  ) : (
    'Button Text'
  )}
</button>
```

### Animations
- Hover scale: `hover:scale-[1.01] active:scale-[0.99]`
- Transitions: `transition-all duration-300`
- Blur glows: `blur-3xl`
- Spinners: `animate-spin`

### Icons
Always use **Lucide React** icons. Import individually, not barrel.
```tsx
import { Mail, Lock, Loader2, ArrowLeft } from 'lucide-react';
```

### Component Patterns
- Extract repeated sub-components as separate functions within the file (e.g., `StatCard`, `getCategoryColor()`)
- Use `React.memo()` for pure display components
- Always use `clsx`/`cn` utility for conditional classes
- Never hardcode colors without theme awareness

## Auth Pages (THIS IS THE STANDARD)

Auth pages (`/auth/login`, `/auth/register`, `/auth/verify`) use a centered card layout:

```tsx
<div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
  <div className="absolute inset-0 overflow-hidden">
    <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 blur-3xl" />
    <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 blur-3xl" />
  </div>
  <div className="relative min-h-screen flex flex-col items-center justify-center px-4 py-12">
    {/* Card */}
  </div>
</div>
```

## Anti-Patterns (THIS DIR)

- **`@playwright/test` unused** — installed but no Playwright tests exist
- **No `next.config` type checking** — `typescript.ignoreBuildErrors: false` enforced
- **Nested `.claude/`** — ignored by Multica bare clone (internal git repo)
- **No TypeScript checking in CI** — `tsc --noEmit` not wired
- **NEVER** hardcode colors without `theme === 'dark'` check
- **NEVER** use bare `bg-white` or `text-slate-700` without dark mode alternative
- **NEVER** use `bg-gray-*` — use `bg-slate-*` consistently
- **NEVER** skip `clsx()` for conditional classes — always use it
