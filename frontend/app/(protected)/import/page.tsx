'use client';

import React, { useState } from 'react';
import { Navigation } from '@/components/navigation/Navigation';
import { useRouter } from 'next/navigation';
import {
  Upload, FileText, FileImage, Globe,
  Loader2, CheckCircle, XCircle,
  FileJson, Scissors, FilePlus,
  HelpCircle, ListChecks, ArrowLeft
} from 'lucide-react';

type ImportMode = 'select' | 'single' | 'multiple' | 'wrong-single' | 'wrong-multiple';
type ImportSource = 'file' | 'url' | 'clipboard' | 'text';

interface ImportSourceOption {
  id: ImportSource;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const sourceOptions: ImportSourceOption[] = [
  {
    id: 'file',
    label: 'Upload Files',
    description: 'Upload images, PDFs, or documents from your computer',
    icon: <FileText className="h-6 w-6" />,
    color: 'blue'
  },
  {
    id: 'url',
    label: 'Import from URL',
    description: 'Fetch content from a website or online document',
    icon: <Globe className="h-6 w-6" />,
    color: 'green'
  },
  {
    id: 'clipboard',
    label: 'Paste from Clipboard',
    description: 'Import copied text directly',
    icon: <Scissors className="h-6 w-6" />,
    color: 'purple'
  },
  {
    id: 'text',
    label: 'Type or Paste Text',
    description: 'Enter or paste educational content manually',
    icon: <FilePlus className="h-6 w-6" />,
    color: 'orange'
  }
];

const colorClasses: Record<string, { bg: string; text: string; border: string; hover: string; shadow: string; hoverShadow: string; gradientFrom: string; gradientTo: string }> = {
  blue: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800', hover: 'hover:border-blue-400 dark:hover:border-blue-600', shadow: 'shadow-[0_8px_32px_-4px_rgba(59,130,246,0.15)]', hoverShadow: 'hover:shadow-[0_12px_40px_-4px_rgba(59,130,246,0.25)]', gradientFrom: 'from-blue-100/80 to-blue-50/40 dark:from-blue-900/60 dark:to-blue-800/30', gradientTo: 'group-hover:from-blue-200/80 group-hover:to-blue-100/40 dark:group-hover:from-blue-800/60 dark:group-hover:to-blue-700/30' },
  green: { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-600 dark:text-green-400', border: 'border-green-200 dark:border-green-800', hover: 'hover:border-green-400 dark:hover:border-green-600', shadow: 'shadow-[0_8px_32px_-4px_rgba(34,197,94,0.15)]', hoverShadow: 'hover:shadow-[0_12px_40px_-4px_rgba(34,197,94,0.25)]', gradientFrom: 'from-green-100/80 to-green-50/40 dark:from-green-900/60 dark:to-green-800/30', gradientTo: 'group-hover:from-green-200/80 group-hover:to-green-100/40 dark:group-hover:from-green-800/60 dark:group-hover:to-green-700/30' },
  purple: { bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-800', hover: 'hover:border-purple-400 dark:hover:border-purple-600', shadow: 'shadow-[0_8px_32px_-4px_rgba(139,92,246,0.15)]', hoverShadow: 'hover:shadow-[0_12px_40px_-4px_rgba(139,92,246,0.25)]', gradientFrom: 'from-purple-100/80 to-purple-50/40 dark:from-purple-900/60 dark:to-purple-800/30', gradientTo: 'group-hover:from-purple-200/80 group-hover:to-purple-100/40 dark:group-hover:from-purple-800/60 dark:group-hover:to-purple-700/30' },
  orange: { bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-800', hover: 'hover:border-orange-400 dark:hover:border-orange-600', shadow: 'shadow-[0_8px_32px_-4px_rgba(249,115,22,0.15)]', hoverShadow: 'hover:shadow-[0_12px_40px_-4px_rgba(249,115,22,0.25)]', gradientFrom: 'from-orange-100/80 to-orange-50/40 dark:from-orange-900/60 dark:to-orange-800/30', gradientTo: 'group-hover:from-orange-200/80 group-hover:to-orange-100/40 dark:group-hover:from-orange-800/60 dark:group-hover:to-orange-700/30' },
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

// Native fetch wrapper that attaches the JWT bearer token. Upload/stream
// endpoints use raw fetch (FormData / streaming) and bypass the axios
// interceptor, so auth must be injected here.
const apiFetch = async (url: string, init: RequestInit = {}) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  // Raw fetch bypasses the axios 401/429 interceptor, so surface quota
  // exhaustion here — this drives the QuotaExceededHandler upgrade toast.
  if (res.status === 429 && typeof window !== 'undefined') {
    try {
      const body = await res.clone().json();
      if (body?.error === 'QUOTA_EXCEEDED') {
        window.dispatchEvent(new CustomEvent('app:quota-exceeded', { detail: body }));
      }
    } catch {}
  }
  return res;
};

// ---- Mode Selection ----
function ModeSelector({ onSelect }: { onSelect: (mode: 'single' | 'multiple') => void }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {/* Single Question Card */}
      <button
        onClick={() => onSelect('single')}
        className="group relative flex flex-col items-start overflow-hidden rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-8 text-left shadow-[0_8px_32px_-4px_rgba(59,130,246,0.15)] dark:shadow-slate-900/30 backdrop-blur-md transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_12px_40px_-4px_rgba(59,130,246,0.25)] hover:border-blue-300 dark:hover:border-blue-600"
      >
        <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-gradient-to-br from-blue-200/40 to-transparent dark:from-blue-400/10" />
        <div className="absolute -left-2 -bottom-3 h-16 w-16 rounded-full bg-gradient-to-tr from-blue-100/30 to-transparent dark:from-blue-300/5" />
        <div className="relative z-10">
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-blue-100/80 to-blue-50/40 dark:from-blue-900/60 dark:to-blue-800/30 text-blue-600 dark:text-blue-400 shadow-[inset_0_1px_2px_rgba(255,255,255,0.8),0_4px_12px_rgba(59,130,246,0.2)] transition-colors group-hover:from-blue-200/80 group-hover:to-blue-100/40 dark:group-hover:from-blue-800/60 dark:group-hover:to-blue-700/30 group-hover:shadow-[inset_0_1px_2px_rgba(255,255,255,0.8),0_6px_16px_rgba(59,130,246,0.3)]">
            <HelpCircle className="h-8 w-8" />
          </div>
        </div>
        <h3 className="relative z-10 text-xl font-bold text-slate-800 dark:text-white">Single Question</h3>
        <p className="relative z-10 mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          Upload one question or document at a time for precise extraction and matching.
        </p>
        <div className="relative z-10 mt-6 flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400">
          Get started
          <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </button>

      {/* Multiple Questions Card */}
      <button
        onClick={() => onSelect('multiple')}
        className="group relative flex flex-col items-start overflow-hidden rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-8 text-left shadow-[0_8px_32px_-4px_rgba(139,92,246,0.15)] dark:shadow-slate-900/30 backdrop-blur-md transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_12px_40px_-4px_rgba(139,92,246,0.25)] hover:border-violet-300 dark:hover:border-violet-600"
      >
        <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-gradient-to-br from-violet-200/40 to-transparent dark:from-violet-400/10" />
        <div className="absolute -left-2 -bottom-3 h-16 w-16 rounded-full bg-gradient-to-tr from-violet-100/30 to-transparent dark:from-violet-300/5" />
        <div className="relative z-10">
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-violet-100/80 to-violet-50/40 dark:from-violet-900/60 dark:to-violet-800/30 text-violet-600 dark:text-violet-400 shadow-[inset_0_1px_2px_rgba(255,255,255,0.8),0_4px_12px_rgba(139,92,246,0.2)] transition-colors group-hover:from-violet-200/80 group-hover:to-violet-100/40 dark:group-hover:from-violet-800/60 dark:group-hover:to-violet-700/30 group-hover:shadow-[inset_0_1px_2px_rgba(255,255,255,0.8),0_6px_16px_rgba(139,92,246,0.3)]">
            <ListChecks className="h-8 w-8" />
          </div>
        </div>
        <h3 className="relative z-10 text-xl font-bold text-slate-800 dark:text-white">Multiple Questions</h3>
        <p className="relative z-10 mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          Upload a worksheet, test, or batch of questions at once for bulk processing.
        </p>
        <div className="relative z-10 mt-6 flex items-center gap-2 text-sm font-medium text-violet-600 dark:text-violet-400">
          Get started
          <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </button>
    </div>
  );
}

// ---- Wrong Mode Selection ----
function WrongModeSelector({ onSelect }: { onSelect: (mode: 'wrong-single' | 'wrong-multiple') => void }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {/* Wrong Single Question Card */}
      <button
        onClick={() => onSelect('wrong-single')}
        className="group relative flex flex-col items-start overflow-hidden rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-8 text-left shadow-[0_8px_32px_-4px_rgba(245,158,11,0.15)] dark:shadow-slate-900/30 backdrop-blur-md transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_12px_40px_-4px_rgba(245,158,11,0.25)] hover:border-amber-300 dark:hover:border-amber-600"
      >
        <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-gradient-to-br from-amber-200/40 to-transparent dark:from-amber-400/10" />
        <div className="absolute -left-2 -bottom-3 h-16 w-16 rounded-full bg-gradient-to-tr from-orange-100/30 to-transparent dark:from-orange-300/5" />
        <div className="relative z-10">
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-amber-100/80 to-orange-50/40 dark:from-amber-900/60 dark:to-orange-800/30 text-amber-600 dark:text-amber-400 shadow-[inset_0_1px_2px_rgba(255,255,255,0.8),0_4px_12px_rgba(245,158,11,0.2)] transition-colors group-hover:from-amber-200/80 group-hover:to-orange-100/40 dark:group-hover:from-amber-800/60 dark:group-hover:to-orange-700/30 group-hover:shadow-[inset_0_1px_2px_rgba(255,255,255,0.8),0_6px_16px_rgba(245,158,11,0.3)]">
            <HelpCircle className="h-8 w-8" />
          </div>
        </div>
        <h3 className="relative z-10 text-xl font-bold text-slate-800 dark:text-white">Wrong Question Summary</h3>
        <p className="relative z-10 mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          Upload one question you answered incorrectly — get an AI explanation + 5 practice questions.
        </p>
        <div className="relative z-10 mt-6 flex items-center gap-2 text-sm font-medium text-amber-600 dark:text-amber-400">
          Get started
          <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </button>

      {/* Wrong Multiple Questions Card */}
      <button
        onClick={() => onSelect('wrong-multiple')}
        className="group relative flex flex-col items-start overflow-hidden rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-8 text-left shadow-[0_8px_32px_-4px_rgba(249,115,22,0.15)] dark:shadow-slate-900/30 backdrop-blur-md transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_12px_40px_-4px_rgba(249,115,22,0.25)] hover:border-orange-300 dark:hover:border-orange-600"
      >
        <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-gradient-to-br from-orange-200/40 to-transparent dark:from-orange-400/10" />
        <div className="absolute -left-2 -bottom-3 h-16 w-16 rounded-full bg-gradient-to-tr from-amber-100/30 to-transparent dark:from-amber-300/5" />
        <div className="relative z-10">
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-orange-100/80 to-amber-50/40 dark:from-orange-900/60 dark:to-amber-800/30 text-orange-600 dark:text-orange-400 shadow-[inset_0_1px_2px_rgba(255,255,255,0.8),0_4px_12px_rgba(249,115,22,0.2)] transition-colors group-hover:from-orange-200/80 group-hover:to-amber-100/40 dark:group-hover:from-orange-800/60 dark:group-hover:to-amber-700/30 group-hover:shadow-[inset_0_1px_2px_rgba(255,255,255,0.8),0_6px_16px_rgba(249,115,22,0.3)]">
            <ListChecks className="h-8 w-8" />
          </div>
        </div>
        <h3 className="relative z-10 text-xl font-bold text-slate-800 dark:text-white">Wrong Questions Summary (bulk)</h3>
        <p className="relative z-10 mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          Upload a worksheet + specify wrong question numbers — get AI explanations + 5 practice questions per question.
        </p>
        <div className="relative z-10 mt-6 flex items-center gap-2 text-sm font-medium text-orange-600 dark:text-orange-400">
          Get started
          <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </button>
    </div>
  );
}

// ---- Shared Form Components ----
function StatusMessage({ status, message }: { status: 'idle' | 'success' | 'error'; message: string }) {
  if (status === 'idle') return null;
  return (
    <div className={`relative mt-6 overflow-hidden rounded-xl border p-4 ${
      status === 'success'
        ? 'border-green-200 dark:border-green-700 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 shadow-[0_4px_16px_-4px_rgba(34,197,94,0.15)]'
        : 'border-red-200 dark:border-red-700 bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/30 dark:to-rose-900/30 shadow-[0_4px_16px_-4px_rgba(239,68,68,0.15)]'
    }`}>
      <div className={`absolute -right-2 -bottom-2 h-16 w-16 rounded-full bg-gradient-to-tl ${
        status === 'success'
          ? 'from-green-200/30 to-transparent dark:from-green-700/20'
          : 'from-red-200/30 to-transparent dark:from-red-700/20'
      }`} />
      <div className="relative z-10 flex items-center gap-3">
        {status === 'success' ? (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-green-100/70 to-green-50/40 dark:from-green-800/50 dark:to-green-900/30 shadow-sm">
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
          </div>
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-red-100/70 to-red-50/40 dark:from-red-800/50 dark:to-red-900/30 shadow-sm">
            <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
          </div>
        )}
        <span className={
          status === 'success'
            ? 'text-green-700 dark:text-green-300'
            : 'text-red-700 dark:text-red-300'
        }>
          {message}
        </span>
      </div>
    </div>
  );
}

function SupportedFormatsSection() {
  return (
    <div className="relative mt-8 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-6 shadow-[0_4px_20px_-4px_rgba(100,116,139,0.1)]">
      <div className="absolute -right-3 -top-3 h-20 w-20 rounded-full bg-gradient-to-br from-blue-100/40 to-transparent dark:from-blue-800/20" />
      <div className="absolute -left-2 -bottom-2 h-12 w-12 rounded-full bg-gradient-to-tr from-indigo-100/30 to-transparent dark:from-indigo-800/15" />
      <h3 className="relative z-10 mb-4 text-lg font-semibold text-slate-800 dark:text-white">Supported Formats</h3>
      <div className="relative z-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-100/60 to-blue-50/30 dark:from-blue-900/40 dark:to-blue-800/20 shadow-sm">
            <FileImage className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <span className="text-sm text-slate-600 dark:text-slate-400">Images (PNG, JPG, WEBP)</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-red-100/60 to-red-50/30 dark:from-red-900/40 dark:to-red-800/20 shadow-sm">
            <FileText className="h-4 w-4 text-red-600 dark:text-red-400" />
          </div>
          <span className="text-sm text-slate-600 dark:text-slate-400">PDF Documents</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-green-100/60 to-green-50/30 dark:from-green-900/40 dark:to-green-800/20 shadow-sm">
            <FileJson className="h-4 w-4 text-green-600 dark:text-green-400" />
          </div>
          <span className="text-sm text-slate-600 dark:text-slate-400">Text Files (TXT, MD)</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-100/60 to-violet-50/30 dark:from-violet-900/40 dark:to-violet-800/20 shadow-sm">
            <Globe className="h-4 w-4 text-violet-600 dark:text-violet-400" />
          </div>
          <span className="text-sm text-slate-600 dark:text-slate-400">Web Pages (HTML)</span>
        </div>
      </div>
    </div>
  );
}

// ---- Single Mode Form ----
function SingleModeForm({ onBack }: { onBack: () => void }) {
  const router = useRouter();
  const [selectedSource, setSelectedSource] = useState<ImportSource | null>(null);
  const [url, setUrl] = useState('');
  const [textContent, setTextContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');

  const handleUrlImport = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setStatus('idle');

    try {
      const response = await apiFetch(`${API_BASE_URL}/api/upload/url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), jobType: 'SINGLE' })
      });

      const data = await response.json();

      if (response.ok && data.success && data.data?.jobId) {
        setStatus('success');
        setStatusMessage('URL content imported successfully!');
        setTimeout(() => {
          router.push(`/jobs/${data.data.jobId}`);
        }, 1500);
      } else {
        setStatus('error');
        setStatusMessage(data.error || 'Failed to import URL content');
      }
    } catch {
      setStatus('error');
      setStatusMessage('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const handleTextImport = async () => {
    if (!textContent.trim()) return;
    setLoading(true);
    setStatus('idle');

    try {
      const response = await apiFetch(`${API_BASE_URL}/api/upload/text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: textContent.trim(), title: 'Text Import', jobType: 'SINGLE' })
      });

      const data = await response.json();

      if (response.ok && data.success && data.data?.jobId) {
        setStatus('success');
        setStatusMessage('Text content imported successfully!');
        setTimeout(() => {
          router.push(`/jobs/${data.data.jobId}`);
        }, 1500);
      } else {
        setStatus('error');
        setStatusMessage(data.error || 'Failed to import text content');
      }
    } catch {
      setStatus('error');
      setStatusMessage('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const handleClipboardPaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim()) {
        setTextContent(text);
        setSelectedSource('text');
      }
    } catch (err) {
      console.error('Failed to read clipboard:', err);
    }
  };

  // Inline File Upload for Single mode (with jobType)
  const [singleFiles, setSingleFiles] = useState<File[]>([]);
  const [singleUploading, setSingleUploading] = useState(false);

  const handleSingleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSingleFiles(Array.from(e.target.files));
    }
  };

  const handleSingleFileUpload = async () => {
    if (singleFiles.length === 0) return;
    setSingleUploading(true);
    setStatus('idle');

    const formData = new FormData();
    const isMultiple = singleFiles.length > 1;
    singleFiles.forEach((file) => {
      formData.append(isMultiple ? 'files' : 'file', file);
    });
    formData.append('jobType', 'SINGLE');

    try {
      const response = await apiFetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        headers: {
          'x-upload-multiple': isMultiple ? 'true' : 'false',
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const jobId = data.data?.jobId || data.data?.jobs?.[0]?.jobId;
        if (jobId) {
          setStatus('success');
          setStatusMessage(`Successfully uploaded ${singleFiles.length} file(s)!`);
          setTimeout(() => router.push(`/jobs/${jobId}`), 1500);
        } else {
          setStatus('error');
          setStatusMessage('Upload succeeded but no job ID returned');
        }
      } else {
        setStatus('error');
        setStatusMessage(data.error || data.detail || 'Upload failed');
      }
    } catch {
      setStatus('error');
      setStatusMessage('Failed to connect to server');
    } finally {
      setSingleUploading(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to mode selection
        </button>
      </div>

      <div className="mb-4">
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Import Single Question</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Upload one question or document for precise extraction and matching.
        </p>
      </div>

      {!selectedSource ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {sourceOptions.map((option) => {
            const colors = colorClasses[option.color];
            return (
              <button
                key={option.id}
                onClick={() => {
                  if (option.id === 'clipboard') {
                    handleClipboardPaste();
                  } else {
                    setSelectedSource(option.id);
                  }
                }}
                className={`group relative flex flex-col items-start overflow-hidden rounded-2xl border ${colors.border} ${colors.bg} p-6 text-left transition-all ${colors.hover} ${colors.shadow} dark:shadow-slate-900/30 ${colors.hoverShadow}`}
              >
                <div className="absolute -right-3 -top-3 h-16 w-16 rounded-full bg-gradient-to-br from-white/30 to-transparent dark:from-white/10" />
                <div className="absolute -left-2 -bottom-2 h-10 w-10 rounded-full bg-gradient-to-tr from-white/20 to-transparent dark:from-white/5" />
                <div className={`relative z-10 mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${colors.gradientFrom} ${colors.gradientTo} ${colors.text} shadow-[inset_0_1px_2px_rgba(255,255,255,0.8),0_4px_12px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_1px_2px_rgba(255,255,255,0.05),0_4px_12px_rgba(0,0,0,0.15)]`}>
                  {option.icon}
                </div>
                <h3 className="relative z-10 text-lg font-semibold text-slate-800 dark:text-white">
                  {option.label}
                </h3>
                <p className="relative z-10 mt-1 text-sm text-slate-600 dark:text-slate-400">
                  {option.description}
                </p>
              </button>
            );
          })}
        </div>
      ) : null}

      {/* File Upload */}
      {selectedSource === 'file' && (
        <div className="rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-6 shadow-lg backdrop-blur-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Upload Files</h2>
            <button
              onClick={() => setSelectedSource(null)}
              className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            >
              Back to sources
            </button>
          </div>

          {/* Drop Zone */}
          <div className="relative mb-4 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 bg-gradient-to-br from-blue-50/30 to-indigo-50/30 dark:from-blue-900/10 dark:to-indigo-900/10 p-8 text-center hover:border-blue-400 dark:hover:border-blue-500 hover:from-blue-100/40 hover:to-indigo-100/40 dark:hover:from-blue-900/20 dark:hover:to-indigo-900/20 transition-colors cursor-pointer shadow-[inset_0_1px_4px_rgba(59,130,246,0.05)]">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-blue-500/[0.03] to-transparent pointer-events-none" />
            <input
              type="file"
              multiple
              accept=".png,.jpg,.jpeg,.gif,.webp,.pdf,.docx,.pptx,.txt,.md"
              onChange={handleSingleFileChange}
              className="hidden"
              id="single-file-input"
            />
            <label htmlFor="single-file-input" className="cursor-pointer relative z-10">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-blue-100/60 to-blue-50/30 dark:from-blue-900/40 dark:to-blue-800/20 shadow-md">
                <Upload className="h-6 w-6 text-blue-500" />
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {singleFiles.length > 0
                  ? `${singleFiles.length} file(s) selected`
                  : 'Click to browse or drag & drop'}
              </p>
              <p className="mt-1 text-xs text-slate-400">PNG, JPG, PDF, DOCX, PPTX, TXT, MD — Max 50MB</p>
            </label>
          </div>

          {singleFiles.length > 0 && (
            <div className="mb-4 space-y-2">
              {singleFiles.map((file, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 p-3">
                  <FileText className="h-5 w-5 text-slate-400" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 dark:text-slate-300 truncate">{file.name}</p>
                    <p className="text-xs text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {singleFiles.length > 0 && (
            <button
              onClick={handleSingleFileUpload}
              disabled={singleUploading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-600"
            >
              {singleUploading ? (
                <><Loader2 className="h-5 w-5 animate-spin" /> Uploading...</>
              ) : (
                <><Upload className="h-5 w-5" /> Upload {singleFiles.length} file(s)</>
              )}
            </button>
          )}
        </div>
      )}

      {/* URL Import */}
      {selectedSource === 'url' && (
        <div className="rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-6 shadow-lg backdrop-blur-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Import from URL</h2>
            <button
              onClick={() => setSelectedSource(null)}
              className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            >
              Back to sources
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Enter URL
              </label>
              <div className="flex gap-3">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/document.pdf"
                  className="flex-1 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3 text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
                <button
                  onClick={handleUrlImport}
                  disabled={!url.trim() || loading}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-600"
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Globe className="h-5 w-5" />}
                  Import
                </button>
              </div>
            </div>

            <p className="text-sm text-slate-500 dark:text-slate-400">
              Supported: PDF, DOC, DOCX, TXT, HTML, or any public webpage
            </p>
          </div>
        </div>
      )}

      {/* Text Input */}
      {selectedSource === 'text' && (
        <div className="rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-6 shadow-lg backdrop-blur-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Enter Text Content</h2>
            <button
              onClick={() => setSelectedSource(null)}
              className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            >
              Back to sources
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Paste or type your educational content
              </label>
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Enter educational content here...

Example:
The Pythagorean theorem states that in a right triangle, the square of the hypotenuse (c) equals the sum of the squares of the other two sides (a and b): a² + b² = c²"
                rows={12}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3 text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {textContent.split(/\s+/).filter(Boolean).length} words
              </p>
              <button
                onClick={handleTextImport}
                disabled={!textContent.trim() || loading}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-600"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <FilePlus className="h-5 w-5" />}
                Process Content
              </button>
            </div>
          </div>
        </div>
      )}

      <StatusMessage status={status} message={statusMessage} />
    </div>
  );
}

// ---- Multiple Mode Form ----
function MultipleModeForm({ onBack }: { onBack: () => void }) {
  const router = useRouter();
  const [selectedSource, setSelectedSource] = useState<ImportSource | null>(null);
  const [url, setUrl] = useState('');
  const [textContent, setTextContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');

  // Multiple file upload state
  const [multiFiles, setMultiFiles] = useState<File[]>([]);
  const [multiUploading, setMultiUploading] = useState(false);

  const handleMultiFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setMultiFiles((prev) => [...prev, ...Array.from(e.target.files!)].slice(0, 20));
    }
  };

  const removeMultiFile = (index: number) => {
    setMultiFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMultiFileUpload = async () => {
    if (multiFiles.length === 0) return;
    setMultiUploading(true);
    setStatus('idle');

    const formData = new FormData();
    const isMultiple = multiFiles.length > 1;
    multiFiles.forEach((file) => {
      formData.append(isMultiple ? 'files' : 'file', file);
    });
    formData.append('jobType', 'MULTIPLE');

    try {
      const response = await apiFetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        headers: {
          'x-upload-multiple': isMultiple ? 'true' : 'false',
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const jobId = data.data?.jobId || data.data?.jobs?.[0]?.jobId;
        if (jobId) {
          setStatus('success');
          setStatusMessage(`Successfully uploaded ${multiFiles.length} file(s)!`);
          setTimeout(() => router.push(`/jobs/${jobId}`), 1500);
        } else {
          setStatus('error');
          setStatusMessage('Upload succeeded but no job ID returned');
        }
      } else {
        setStatus('error');
        setStatusMessage(data.error || data.detail || 'Upload failed');
      }
    } catch {
      setStatus('error');
      setStatusMessage('Failed to connect to server');
    } finally {
      setMultiUploading(false);
    }
  };

  const handleUrlImport = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setStatus('idle');

    try {
      const response = await apiFetch(`${API_BASE_URL}/api/upload/url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), jobType: 'MULTIPLE' })
      });

      const data = await response.json();

      if (response.ok && data.success && data.data?.jobId) {
        setStatus('success');
        setStatusMessage('URL content imported successfully!');
        setTimeout(() => {
          router.push(`/jobs/${data.data.jobId}`);
        }, 1500);
      } else {
        setStatus('error');
        setStatusMessage(data.error || 'Failed to import URL content');
      }
    } catch {
      setStatus('error');
      setStatusMessage('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const handleTextImport = async () => {
    if (!textContent.trim()) return;
    setLoading(true);
    setStatus('idle');

    try {
      const response = await apiFetch(`${API_BASE_URL}/api/upload/text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: textContent.trim(), title: 'Text Import', jobType: 'MULTIPLE' })
      });

      const data = await response.json();

      if (response.ok && data.success && data.data?.jobId) {
        setStatus('success');
        setStatusMessage('Text content imported successfully!');
        setTimeout(() => {
          router.push(`/jobs/${data.data.jobId}`);
        }, 1500);
      } else {
        setStatus('error');
        setStatusMessage(data.error || 'Failed to import text content');
      }
    } catch {
      setStatus('error');
      setStatusMessage('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const handleClipboardPaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim()) {
        setTextContent(text);
        setSelectedSource('text');
      }
    } catch (err) {
      console.error('Failed to read clipboard:', err);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to mode selection
        </button>
      </div>

      <div className="mb-4">
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Import Multiple Questions</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Upload a worksheet, test, or multiple questions at once for bulk processing.
        </p>
      </div>

      {!selectedSource ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {sourceOptions.map((option) => {
            const colors = colorClasses[option.color];
            return (
              <button
                key={option.id}
                onClick={() => {
                  if (option.id === 'clipboard') {
                    handleClipboardPaste();
                  } else {
                    setSelectedSource(option.id);
                  }
                }}
                className={`group relative flex flex-col items-start overflow-hidden rounded-2xl border ${colors.border} ${colors.bg} p-6 text-left transition-all ${colors.hover} ${colors.shadow} dark:shadow-slate-900/30 ${colors.hoverShadow}`}
              >
                <div className="absolute -right-3 -top-3 h-16 w-16 rounded-full bg-gradient-to-br from-white/30 to-transparent dark:from-white/10" />
                <div className="absolute -left-2 -bottom-2 h-10 w-10 rounded-full bg-gradient-to-tr from-white/20 to-transparent dark:from-white/5" />
                <div className={`relative z-10 mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${colors.gradientFrom} ${colors.gradientTo} ${colors.text} shadow-[inset_0_1px_2px_rgba(255,255,255,0.8),0_4px_12px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_1px_2px_rgba(255,255,255,0.05),0_4px_12px_rgba(0,0,0,0.15)]`}>
                  {option.icon}
                </div>
                <h3 className="relative z-10 text-lg font-semibold text-slate-800 dark:text-white">
                  {option.label}
                </h3>
                <p className="relative z-10 mt-1 text-sm text-slate-600 dark:text-slate-400">
                  {option.description}
                </p>
              </button>
            );
          })}
        </div>
      ) : null}

      {/* File Upload - Multiple Mode */}
      {selectedSource === 'file' && (
        <div className="rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-6 shadow-lg backdrop-blur-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Upload Files</h2>
            <button
              onClick={() => setSelectedSource(null)}
              className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            >
              Back to sources
            </button>
          </div>

          <div className="mb-3 rounded-lg border border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-900/20 p-3">
            <p className="text-sm text-violet-700 dark:text-violet-300">
              Best results with PDF, DOCX, or PPTX files. Upload a worksheet, test, or multiple questions at once.
            </p>
          </div>

          {/* Drop Zone */}
          <div className="relative mb-4 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 bg-gradient-to-br from-violet-50/30 to-purple-50/30 dark:from-violet-900/10 dark:to-purple-900/10 p-8 text-center hover:border-violet-400 dark:hover:border-violet-500 hover:from-violet-100/40 hover:to-purple-100/40 dark:hover:from-violet-900/20 dark:hover:to-purple-900/20 transition-colors cursor-pointer shadow-[inset_0_1px_4px_rgba(139,92,246,0.05)]">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-violet-500/[0.03] to-transparent pointer-events-none" />
            <input
              type="file"
              multiple
              accept=".png,.jpg,.jpeg,.gif,.webp,.pdf,.docx,.pptx,.txt,.md"
              onChange={handleMultiFileChange}
              className="hidden"
              id="multi-file-input"
            />
            <label htmlFor="multi-file-input" className="cursor-pointer relative z-10">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-violet-100/60 to-violet-50/30 dark:from-violet-900/40 dark:to-violet-800/20 shadow-md">
                <Upload className="h-6 w-6 text-violet-500" />
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {multiFiles.length > 0
                  ? `${multiFiles.length} file(s) selected`
                  : 'Click to browse or drag & drop'}
              </p>
              <p className="mt-1 text-xs text-slate-400">PDF, DOCX, PPTX, TXT — works best with document files. Max 50MB per file.</p>
            </label>
          </div>

          {multiFiles.length > 0 && (
            <div className="mb-4 space-y-2 max-h-60 overflow-y-auto">
              {multiFiles.map((file, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 p-3">
                  <FileText className="h-5 w-5 text-slate-400" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 dark:text-slate-300 truncate">{file.name}</p>
                    <p className="text-xs text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <button
                    onClick={() => removeMultiFile(i)}
                    className="text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <XCircle className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {multiFiles.length > 0 && (
            <button
              onClick={handleMultiFileUpload}
              disabled={multiUploading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-6 py-3 font-medium text-white transition-colors hover:bg-violet-700 disabled:bg-slate-300 dark:disabled:bg-slate-600"
            >
              {multiUploading ? (
                <><Loader2 className="h-5 w-5 animate-spin" /> Uploading...</>
              ) : (
                <><Upload className="h-5 w-5" /> Upload {multiFiles.length} file(s)</>
              )}
            </button>
          )}
        </div>
      )}

      {/* URL Import - Multiple Mode */}
      {selectedSource === 'url' && (
        <div className="rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-6 shadow-lg backdrop-blur-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Import from URL</h2>
            <button
              onClick={() => setSelectedSource(null)}
              className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            >
              Back to sources
            </button>
          </div>

          <div className="mb-3 rounded-lg border border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-900/20 p-3">
            <p className="text-sm text-violet-700 dark:text-violet-300">
              Best results with PDF, DOCX, or PPTX files. Upload a worksheet, test, or multiple questions at once.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Enter URL
              </label>
              <div className="flex gap-3">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/worksheet.pdf"
                  className="flex-1 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3 text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200"
                />
                <button
                  onClick={handleUrlImport}
                  disabled={!url.trim() || loading}
                  className="flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-3 font-medium text-white transition-colors hover:bg-violet-700 disabled:bg-slate-300 dark:disabled:bg-slate-600"
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Globe className="h-5 w-5" />}
                  Import
                </button>
              </div>
            </div>

            <p className="text-sm text-slate-500 dark:text-slate-400">
              Supported: PDF, DOC, DOCX, TXT, HTML, or any public webpage
            </p>
          </div>
        </div>
      )}

      {/* Text Input - Multiple Mode */}
      {selectedSource === 'text' && (
        <div className="rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-6 shadow-lg backdrop-blur-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Enter Text Content</h2>
            <button
              onClick={() => setSelectedSource(null)}
              className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            >
              Back to sources
            </button>
          </div>

          <div className="mb-3 rounded-lg border border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-900/20 p-3">
            <p className="text-sm text-violet-700 dark:text-violet-300">
              Paste multiple questions, a full worksheet, or test content for batch processing.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Paste or type your educational content
              </label>
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Enter multiple questions or worksheet content here...

Example:
1. What is the Pythagorean theorem?
2. Calculate the area of a circle with radius 5.
3. Explain the water cycle."
                rows={12}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3 text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200"
              />
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {textContent.split(/\s+/).filter(Boolean).length} words
              </p>
              <button
                onClick={handleTextImport}
                disabled={!textContent.trim() || loading}
                className="flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-3 font-medium text-white transition-colors hover:bg-violet-700 disabled:bg-slate-300 dark:disabled:bg-slate-600"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <FilePlus className="h-5 w-5" />}
                Process Content
              </button>
            </div>
          </div>
        </div>
      )}

      <StatusMessage status={status} message={statusMessage} />
    </div>
  );
}

// ---- Wrong Single Form ----
function WrongSingleForm({ onBack }: { onBack: () => void }) {
  const router = useRouter();
  const [selectedSource, setSelectedSource] = useState<ImportSource | null>(null);
  const [url, setUrl] = useState('');
  const [textContent, setTextContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');

  const [wrongFiles, setWrongFiles] = useState<File[]>([]);
  const [wrongUploading, setWrongUploading] = useState(false);

  const handleWrongFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setWrongFiles(Array.from(e.target.files));
  };

  const handleWrongFileUpload = async () => {
    if (wrongFiles.length === 0) return;
    setWrongUploading(true);
    setStatus('idle');

    const formData = new FormData();
    wrongFiles.forEach((file) => formData.append('file', file));
    formData.append('jobType', 'WRONG_SINGLE');

    try {
      const response = await apiFetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        headers: { 'x-upload-multiple': 'false' },
        body: formData,
      });
      const data = await response.json();
      if (response.ok && data.success && data.data?.jobId) {
        setStatus('success');
        setStatusMessage('Question uploaded successfully!');
        setTimeout(() => router.push(`/jobs/${data.data.jobId}`), 1500);
      } else {
        setStatus('error');
        setStatusMessage(data.error || 'Upload failed');
      }
    } catch {
      setStatus('error');
      setStatusMessage('Failed to connect to server');
    } finally {
      setWrongUploading(false);
    }
  };

  const handleUrlImport = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setStatus('idle');
    try {
      const response = await apiFetch(`${API_BASE_URL}/api/upload/url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), jobType: 'WRONG_SINGLE' })
      });
      const data = await response.json();
      if (response.ok && data.success && data.data?.jobId) {
        setStatus('success');
        setStatusMessage('Question imported successfully!');
        setTimeout(() => router.push(`/jobs/${data.data.jobId}`), 1500);
      } else {
        setStatus('error');
        setStatusMessage(data.error || 'Import failed');
      }
    } catch {
      setStatus('error');
      setStatusMessage('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const handleTextImport = async () => {
    if (!textContent.trim()) return;
    setLoading(true);
    setStatus('idle');
    try {
      const response = await apiFetch(`${API_BASE_URL}/api/upload/text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: textContent.trim(), title: 'Wrong Question Import', jobType: 'WRONG_SINGLE' })
      });
      const data = await response.json();
      if (response.ok && data.success && data.data?.jobId) {
        setStatus('success');
        setStatusMessage('Question imported successfully!');
        setTimeout(() => router.push(`/jobs/${data.data.jobId}`), 1500);
      } else {
        setStatus('error');
        setStatusMessage(data.error || 'Import failed');
      }
    } catch {
      setStatus('error');
      setStatusMessage('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const handleClipboardPaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim()) { setTextContent(text); setSelectedSource('text'); }
    } catch {}
  };

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <button onClick={onBack} className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to mode selection
        </button>
      </div>
      <div className="mb-4">
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Wrong Question Review (Single)</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Upload one question you answered incorrectly — we'll explain it + generate 5 practice questions.
        </p>
      </div>

      {!selectedSource ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {sourceOptions.map((option) => {
            const colors = colorClasses[option.color];
            return (
              <button
                key={option.id}
                onClick={() => {
                  if (option.id === 'clipboard') { handleClipboardPaste(); }
                  else { setSelectedSource(option.id); }
                }}
                className={`group relative flex flex-col items-start overflow-hidden rounded-2xl border ${colors.border} ${colors.bg} p-6 text-left transition-all ${colors.hover} ${colors.shadow} dark:shadow-slate-900/30 ${colors.hoverShadow}`}
              >
                <div className="absolute -right-3 -top-3 h-16 w-16 rounded-full bg-gradient-to-br from-white/30 to-transparent dark:from-white/10" />
                <div className="absolute -left-2 -bottom-2 h-10 w-10 rounded-full bg-gradient-to-tr from-white/20 to-transparent dark:from-white/5" />
                <div className={`relative z-10 mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${colors.gradientFrom} ${colors.gradientTo} ${colors.text} shadow-[inset_0_1px_2px_rgba(255,255,255,0.8),0_4px_12px_rgba(0,0,0,0.08)]`}>
                  {option.icon}
                </div>
                <h3 className="relative z-10 text-lg font-semibold text-slate-800 dark:text-white">{option.label}</h3>
                <p className="relative z-10 mt-1 text-sm text-slate-600 dark:text-slate-400">{option.description}</p>
              </button>
            );
          })}
        </div>
      ) : null}

      {selectedSource === 'file' && (
        <div className="rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-6 shadow-lg backdrop-blur-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Upload Files</h2>
            <button onClick={() => setSelectedSource(null)} className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">Back to sources</button>
          </div>
          <div className="relative mb-4 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 bg-gradient-to-br from-amber-50/30 to-orange-50/30 dark:from-amber-900/10 dark:to-orange-900/10 p-8 text-center hover:border-amber-400 dark:hover:border-amber-500 transition-colors cursor-pointer">
            <input type="file" multiple accept=".png,.jpg,.jpeg,.gif,.webp,.pdf,.docx,.pptx,.txt,.md" onChange={handleWrongFileChange} className="hidden" id="wrong-single-file-input" />
            <label htmlFor="wrong-single-file-input" className="cursor-pointer relative z-10">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-amber-100/60 to-amber-50/30 dark:from-amber-900/40 dark:to-amber-800/20 shadow-md">
                <Upload className="h-6 w-6 text-amber-500" />
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">{wrongFiles.length > 0 ? `${wrongFiles.length} file(s) selected` : 'Click to browse or drag & drop'}</p>
            </label>
          </div>
          {wrongFiles.length > 0 && (
            <div className="mb-4 space-y-2">
              {wrongFiles.map((file, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 p-3">
                  <FileText className="h-5 w-5 text-slate-400" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 dark:text-slate-300 truncate">{file.name}</p>
                    <p className="text-xs text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          {wrongFiles.length > 0 && (
            <button onClick={handleWrongFileUpload} disabled={wrongUploading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-600 px-6 py-3 font-medium text-white transition-colors hover:bg-amber-700 disabled:bg-slate-300 dark:disabled:bg-slate-600">
              {wrongUploading ? <><Loader2 className="h-5 w-5 animate-spin" /> Uploading...</> : <><Upload className="h-5 w-5" /> Upload</>}
            </button>
          )}
        </div>
      )}

      {selectedSource === 'url' && (
        <div className="rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-6 shadow-lg backdrop-blur-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Import from URL</h2>
            <button onClick={() => setSelectedSource(null)} className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">Back to sources</button>
          </div>
          <div className="mb-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/20 p-3">
            <p className="text-sm text-amber-700 dark:text-amber-300">Enter the URL of the question or document you answered incorrectly.</p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Enter URL</label>
              <div className="flex gap-3">
                <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/question.pdf" className="flex-1 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3 text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200" />
                <button onClick={handleUrlImport} disabled={!url.trim() || loading} className="flex items-center gap-2 rounded-xl bg-amber-600 px-6 py-3 font-medium text-white transition-colors hover:bg-amber-700 disabled:bg-slate-300 dark:disabled:bg-slate-600">
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Globe className="h-5 w-5" />}
                  Import
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedSource === 'text' && (
        <div className="rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-6 shadow-lg backdrop-blur-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Enter Questions</h2>
            <button onClick={() => setSelectedSource(null)} className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">Back to sources</button>
          </div>
          <div className="mb-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/20 p-3">
            <p className="text-sm text-amber-700 dark:text-amber-300">Type or paste the question you answered incorrectly. Include the correct answer if known.</p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Your question</label>
              <textarea value={textContent} onChange={(e) => setTextContent(e.target.value)} placeholder="Enter the question you answered incorrectly..."
                rows={10} className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3 text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200" />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500 dark:text-slate-400">{textContent.split(/\s+/).filter(Boolean).length} words</p>
              <button onClick={handleTextImport} disabled={!textContent.trim() || loading} className="flex items-center gap-2 rounded-xl bg-amber-600 px-6 py-3 font-medium text-white transition-colors hover:bg-amber-700 disabled:bg-slate-300 dark:disabled:bg-slate-600">
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <FilePlus className="h-5 w-5" />}
                Get Explanation + Practice
              </button>
            </div>
          </div>
        </div>
      )}

      <StatusMessage status={status} message={statusMessage} />
    </div>
  );
}

// ---- Wrong Multiple Form ----
function WrongMultipleForm({ onBack }: { onBack: () => void }) {
  const router = useRouter();
  const [selectedSource, setSelectedSource] = useState<ImportSource | null>(null);
  const [url, setUrl] = useState('');
  const [textContent, setTextContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');

  const [wrongFiles, setWrongFiles] = useState<File[]>([]);
  const [wrongUploading, setWrongUploading] = useState(false);
  const [wrongQuestionIndices, setWrongQuestionIndices] = useState('');
  const [indexError, setIndexError] = useState('');

  const validateIndices = (value: string): boolean => {
    if (!value.trim()) {
      setIndexError('Please enter the question numbers you got wrong');
      return false;
    }
    const parts = value.split(',').map(s => s.trim()).filter(Boolean);
    if (parts.length === 0) {
      setIndexError('Please enter at least one question number');
      return false;
    }
    for (const part of parts) {
      const num = parseInt(part, 10);
      if (isNaN(num) || num < 1) {
        setIndexError('Each question number must be a positive integer (e.g., 1, 3, 5)');
        return false;
      }
    }
    setIndexError('');
    return true;
  };

  const handleWrongFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setWrongFiles(Array.from(e.target.files));
  };

  const handleWrongFileUpload = async () => {
    if (wrongFiles.length === 0) return;
    if (!validateIndices(wrongQuestionIndices)) return;
    setWrongUploading(true);
    setStatus('idle');

    const formData = new FormData();
    wrongFiles.forEach((file) => formData.append('file', file));
    formData.append('jobType', 'WRONG_MULTIPLE');
    formData.append('wrongQuestionIndices', wrongQuestionIndices.trim());

    try {
      const response = await apiFetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        headers: { 'x-upload-multiple': 'false' },
        body: formData,
      });
      const data = await response.json();
      if (response.ok && data.success && data.data?.jobId) {
        setStatus('success');
        setStatusMessage('Questions uploaded successfully!');
        setTimeout(() => router.push(`/jobs/${data.data.jobId}`), 1500);
      } else {
        setStatus('error');
        setStatusMessage(data.error || 'Upload failed');
      }
    } catch {
      setStatus('error');
      setStatusMessage('Failed to connect to server');
    } finally {
      setWrongUploading(false);
    }
  };

  const handleUrlImport = async () => {
    if (!url.trim()) return;
    if (!validateIndices(wrongQuestionIndices)) return;
    setLoading(true);
    setStatus('idle');
    try {
      const response = await apiFetch(`${API_BASE_URL}/api/upload/url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), jobType: 'WRONG_MULTIPLE', wrongQuestionIndices: wrongQuestionIndices.trim() })
      });
      const data = await response.json();
      if (response.ok && data.success && data.data?.jobId) {
        setStatus('success');
        setStatusMessage('Questions imported successfully!');
        setTimeout(() => router.push(`/jobs/${data.data.jobId}`), 1500);
      } else {
        setStatus('error');
        setStatusMessage(data.error || 'Import failed');
      }
    } catch {
      setStatus('error');
      setStatusMessage('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const handleTextImport = async () => {
    if (!textContent.trim()) return;
    if (!validateIndices(wrongQuestionIndices)) return;
    setLoading(true);
    setStatus('idle');
    try {
      const response = await apiFetch(`${API_BASE_URL}/api/upload/text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: textContent.trim(), title: 'Wrong Questions Import', jobType: 'WRONG_MULTIPLE', wrongQuestionIndices: wrongQuestionIndices.trim() })
      });
      const data = await response.json();
      if (response.ok && data.success && data.data?.jobId) {
        setStatus('success');
        setStatusMessage('Questions imported successfully!');
        setTimeout(() => router.push(`/jobs/${data.data.jobId}`), 1500);
      } else {
        setStatus('error');
        setStatusMessage(data.error || 'Import failed');
      }
    } catch {
      setStatus('error');
      setStatusMessage('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const handleClipboardPaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim()) { setTextContent(text); setSelectedSource('text'); setWrongQuestionIndices(''); setIndexError(''); }
    } catch {}
  };

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <button onClick={onBack} className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to mode selection
        </button>
      </div>
      <div className="mb-4">
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Wrong Question Review (Batch)</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Upload a worksheet + specify wrong question numbers — we'll explain them + generate 5 practice questions each.
        </p>
      </div>

      {!selectedSource ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {sourceOptions.map((option) => {
            const colors = colorClasses[option.color];
            return (
              <button
                key={option.id}
                onClick={() => {
                  if (option.id === 'clipboard') { handleClipboardPaste(); }
                  else { setSelectedSource(option.id); }
                }}
                className={`group relative flex flex-col items-start overflow-hidden rounded-2xl border ${colors.border} ${colors.bg} p-6 text-left transition-all ${colors.hover} ${colors.shadow} dark:shadow-slate-900/30 ${colors.hoverShadow}`}
              >
                <div className="absolute -right-3 -top-3 h-16 w-16 rounded-full bg-gradient-to-br from-white/30 to-transparent dark:from-white/10" />
                <div className="absolute -left-2 -bottom-2 h-10 w-10 rounded-full bg-gradient-to-tr from-white/20 to-transparent dark:from-white/5" />
                <div className={`relative z-10 mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${colors.gradientFrom} ${colors.gradientTo} ${colors.text} shadow-[inset_0_1px_2px_rgba(255,255,255,0.8),0_4px_12px_rgba(0,0,0,0.08)]`}>
                  {option.icon}
                </div>
                <h3 className="relative z-10 text-lg font-semibold text-slate-800 dark:text-white">{option.label}</h3>
                <p className="relative z-10 mt-1 text-sm text-slate-600 dark:text-slate-400">{option.description}</p>
              </button>
            );
          })}
        </div>
      ) : null}

      {selectedSource === 'file' && (
        <div className="rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-6 shadow-lg backdrop-blur-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Upload Files</h2>
            <button onClick={() => { setSelectedSource(null); setWrongQuestionIndices(''); setIndexError(''); }} className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">Back to sources</button>
          </div>
          <div className="mb-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-700/50 p-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Which questions did you get wrong?
            </label>
            <input
              type="text"
              value={wrongQuestionIndices}
              onChange={(e) => {
                setWrongQuestionIndices(e.target.value);
                if (indexError) validateIndices(e.target.value);
              }}
              onBlur={(e) => validateIndices(e.target.value)}
              placeholder="e.g. 1, 3, 5, 12, 19"
              className={`w-full rounded-lg border bg-white dark:bg-slate-700 px-4 py-3 text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 ${
                indexError
                  ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
                  : 'border-amber-300 dark:border-amber-600 focus:border-amber-500 focus:ring-amber-200'
              }`}
            />
            {indexError ? (
              <p className="mt-2 text-xs text-red-600 dark:text-red-400">{indexError}</p>
            ) : (
              <p className="mt-2 text-xs text-slate-500">Enter the question numbers separated by commas</p>
            )}
          </div>
          <div className="relative mb-4 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 bg-gradient-to-br from-amber-50/30 to-orange-50/30 dark:from-amber-900/10 dark:to-orange-900/10 p-8 text-center hover:border-amber-400 dark:hover:border-amber-500 transition-colors cursor-pointer">
            <input type="file" multiple accept=".png,.jpg,.jpeg,.gif,.webp,.pdf,.docx,.pptx,.txt,.md" onChange={handleWrongFileChange} className="hidden" id="wrong-multi-file-input" />
            <label htmlFor="wrong-multi-file-input" className="cursor-pointer relative z-10">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-amber-100/60 to-amber-50/30 dark:from-amber-900/40 dark:to-amber-800/20 shadow-md">
                <Upload className="h-6 w-6 text-amber-500" />
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">{wrongFiles.length > 0 ? `${wrongFiles.length} file(s) selected` : 'Click to browse or drag & drop'}</p>
            </label>
          </div>
          {wrongFiles.length > 0 && (
            <div className="mb-4 space-y-2">
              {wrongFiles.map((file, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 p-3">
                  <FileText className="h-5 w-5 text-slate-400" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 dark:text-slate-300 truncate">{file.name}</p>
                    <p className="text-xs text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          {wrongFiles.length > 0 && (
            <button onClick={handleWrongFileUpload} disabled={wrongUploading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-600 px-6 py-3 font-medium text-white transition-colors hover:bg-amber-700 disabled:bg-slate-300 dark:disabled:bg-slate-600">
              {wrongUploading ? <><Loader2 className="h-5 w-5 animate-spin" /> Uploading...</> : <><Upload className="h-5 w-5" /> Upload</>}
            </button>
          )}
        </div>
      )}

      {selectedSource === 'url' && (
        <div className="rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-6 shadow-lg backdrop-blur-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Import from URL</h2>
            <button onClick={() => { setSelectedSource(null); setWrongQuestionIndices(''); setIndexError(''); }} className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">Back to sources</button>
          </div>
          <div className="mb-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/20 p-3">
            <p className="text-sm text-amber-700 dark:text-amber-300">Enter the URL of the worksheet or document with wrong questions.</p>
          </div>
          <div className="mb-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-700/50 p-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Which questions did you get wrong?
            </label>
            <input
              type="text"
              value={wrongQuestionIndices}
              onChange={(e) => {
                setWrongQuestionIndices(e.target.value);
                if (indexError) validateIndices(e.target.value);
              }}
              onBlur={(e) => validateIndices(e.target.value)}
              placeholder="e.g. 1, 3, 5, 12, 19"
              className={`w-full rounded-lg border bg-white dark:bg-slate-700 px-4 py-3 text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 ${
                indexError
                  ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
                  : 'border-amber-300 dark:border-amber-600 focus:border-amber-500 focus:ring-amber-200'
              }`}
            />
            {indexError ? (
              <p className="mt-2 text-xs text-red-600 dark:text-red-400">{indexError}</p>
            ) : (
              <p className="mt-2 text-xs text-slate-500">Enter the question numbers separated by commas</p>
            )}
          </div>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Enter URL</label>
              <div className="flex gap-3">
                <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/worksheet.pdf" className="flex-1 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3 text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200" />
                <button onClick={handleUrlImport} disabled={!url.trim() || loading} className="flex items-center gap-2 rounded-xl bg-amber-600 px-6 py-3 font-medium text-white transition-colors hover:bg-amber-700 disabled:bg-slate-300 dark:disabled:bg-slate-600">
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Globe className="h-5 w-5" />}
                  Import
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedSource === 'text' && (
        <div className="rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-6 shadow-lg backdrop-blur-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Enter Questions</h2>
            <button onClick={() => { setSelectedSource(null); setWrongQuestionIndices(''); setIndexError(''); }} className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">Back to sources</button>
          </div>
          <div className="mb-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/20 p-3">
            <p className="text-sm text-amber-700 dark:text-amber-300">Type or paste the questions you answered incorrectly. Include question numbers if possible.</p>
          </div>
          <div className="mb-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-700/50 p-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Which questions did you get wrong?
            </label>
            <input
              type="text"
              value={wrongQuestionIndices}
              onChange={(e) => {
                setWrongQuestionIndices(e.target.value);
                if (indexError) validateIndices(e.target.value);
              }}
              onBlur={(e) => validateIndices(e.target.value)}
              placeholder="e.g. 1, 3, 5, 12, 19"
              className={`w-full rounded-lg border bg-white dark:bg-slate-700 px-4 py-3 text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 ${
                indexError
                  ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
                  : 'border-amber-300 dark:border-amber-600 focus:border-amber-500 focus:ring-amber-200'
              }`}
            />
            {indexError ? (
              <p className="mt-2 text-xs text-red-600 dark:text-red-400">{indexError}</p>
            ) : (
              <p className="mt-2 text-xs text-slate-500">Enter the question numbers separated by commas</p>
            )}
          </div>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Your questions</label>
              <textarea value={textContent} onChange={(e) => setTextContent(e.target.value)} placeholder="Enter the questions you answered incorrectly..."
                rows={10} className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3 text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200" />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500 dark:text-slate-400">{textContent.split(/\s+/).filter(Boolean).length} words</p>
              <button onClick={handleTextImport} disabled={!textContent.trim() || loading} className="flex items-center gap-2 rounded-xl bg-amber-600 px-6 py-3 font-medium text-white transition-colors hover:bg-amber-700 disabled:bg-slate-300 dark:disabled:bg-slate-600">
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <FilePlus className="h-5 w-5" />}
                Get Explanation + Practice
              </button>
            </div>
          </div>
        </div>
      )}

      <StatusMessage status={status} message={statusMessage} />
    </div>
  );
}

// ---- Main Page ----
export default function ImportPage() {
  const [mode, setMode] = useState<ImportMode>('select');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <Navigation />

      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Import Content</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
Add educational content from various sources to build your knowledge base
          </p>
        </div>

        {/* Mode Selection */}
        {mode === 'select' && (
          <>
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-4">Import New Material</h2>
              <ModeSelector onSelect={(m) => setMode(m)} />
            </div>
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-4">Wrong Question Summary &amp; Review</h2>
              <WrongModeSelector onSelect={(m) => setMode(m)} />
            </div>
            <SupportedFormatsSection />
          </>
        )}

        {/* Single Mode */}
        {mode === 'single' && (
          <SingleModeForm onBack={() => setMode('select')} />
        )}

        {/* Multiple Mode */}
        {mode === 'multiple' && (
          <MultipleModeForm onBack={() => setMode('select')} />
        )}

        {/* Wrong Single Mode */}
        {mode === 'wrong-single' && (
          <WrongSingleForm onBack={() => setMode('select')} />
        )}

        {/* Wrong Multiple Mode */}
        {mode === 'wrong-multiple' && (
          <WrongMultipleForm onBack={() => setMode('select')} />
        )}
      </main>
    </div>
  );
}
