'use client';

import { useState, RefObject } from 'react';
import { Download, FileImage, FileText, Share2, Check, Bot } from 'lucide-react';
import { LocalKnowledgeGraphRef } from '@/components/results/LocalKnowledgeGraph';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

interface ExportButtonsProps {
  graphRef?: RefObject<LocalKnowledgeGraphRef | null>;
}

export function ExportButtons({ graphRef }: ExportButtonsProps) {
  const [exporting, setExporting] = useState<string | null>(null);
  const [exported, setExported] = useState<string | null>(null);

  const handleExportPng = async () => {
    setExporting('png');
    
    try {
      // Use frontend export if graphRef is available
      if (graphRef?.current) {
        const dataUrl = await graphRef.current.exportToPng();
        if (dataUrl) {
          const link = document.createElement('a');
          link.download = 'knowledge-graph.png';
          link.href = dataUrl;
          link.click();
        } else {
          throw new Error('Export returned no data');
        }
      } else {
        // Fallback to backend API
        const response = await fetch(`${API_BASE_URL}/api/export/graph-png`);
        if (!response.ok) throw new Error('Export failed');
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'knowledge-graph.svg';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
      
      setExported('png');
      setTimeout(() => setExported(null), 2000);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExporting(null);
    }
  };

  const handleExportPdf = async () => {
    setExporting('pdf');
    
    try {
      const endpoint = `${API_BASE_URL}/api/export/progress-pdf`;
      
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'progress-report.html';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      setExported('pdf');
      setTimeout(() => setExported(null), 2000);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExporting(null);
    }
  };

  const handleShare = async () => {
    setExporting('share');
    
    try {
      // Copy current URL to clipboard
      await navigator.clipboard.writeText(window.location.href);
      setExported('share');
      setTimeout(() => setExported(null), 2000);
    } catch (error) {
      console.error('Share failed:', error);
    } finally {
      setExporting(null);
    }
  };

  const handleExportAI = async () => {
    setExporting('ai');
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/export/ai-text`);
      if (!response.ok) throw new Error('Export failed');
      
      const text = await response.text();
      
      // Copy to clipboard
      await navigator.clipboard.writeText(text);
      setExported('ai');
      setTimeout(() => setExported(null), 2000);
    } catch (error) {
      console.error('AI export failed:', error);
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={handleExportPng}
        disabled={exporting !== null}
        className="inline-flex items-center gap-2 rounded-lg border border-white/40 bg-white/70 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm backdrop-blur-sm transition-all hover:bg-white/90 hover:shadow-md disabled:opacity-50"
      >
        {exported === 'png' ? (
          <Check className="h-4 w-4 text-green-600" />
        ) : (
          <FileImage className="h-4 w-4" />
        )}
        {exporting === 'png' ? 'Exporting...' : exported === 'png' ? 'Exported!' : 'Export PNG'}
      </button>
      
      <button
        onClick={handleExportPdf}
        disabled={exporting !== null}
        className="inline-flex items-center gap-2 rounded-lg border border-white/40 bg-white/70 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm backdrop-blur-sm transition-all hover:bg-white/90 hover:shadow-md disabled:opacity-50"
      >
        {exported === 'pdf' ? (
          <Check className="h-4 w-4 text-green-600" />
        ) : (
          <FileText className="h-4 w-4" />
        )}
        {exporting === 'pdf' ? 'Exporting...' : exported === 'pdf' ? 'Exported!' : 'Export Report'}
      </button>
      
      <button
        onClick={handleExportAI}
        disabled={exporting !== null}
        className="inline-flex items-center gap-2 rounded-lg border border-white/40 bg-white/70 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm backdrop-blur-sm transition-all hover:bg-white/90 hover:shadow-md disabled:opacity-50"
      >
        {exported === 'ai' ? (
          <Check className="h-4 w-4 text-green-600" />
        ) : (
          <Bot className="h-4 w-4" />
        )}
        {exporting === 'ai' ? 'Copying...' : exported === 'ai' ? 'Copied!' : 'Export AI'}
      </button>
      
      <button
        onClick={handleShare}
        disabled={exporting !== null}
        className="inline-flex items-center gap-2 rounded-lg border border-white/40 bg-white/70 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm backdrop-blur-sm transition-all hover:bg-white/90 hover:shadow-md disabled:opacity-50"
      >
        {exported === 'share' ? (
          <Check className="h-4 w-4 text-green-600" />
        ) : (
          <Share2 className="h-4 w-4" />
        )}
        {exporting === 'share' ? 'Copying...' : exported === 'share' ? 'Copied!' : 'Share'}
      </button>
    </div>
  );
}
