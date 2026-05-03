'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Navigation } from '@/components/navigation/Navigation';
import { ArrowLeft, Search, Network } from 'lucide-react';
import { ExportButtons } from '@/components/export/ExportButtons';
import { LocalKnowledgeGraph, LocalKnowledgeGraphRef } from '@/components/results/LocalKnowledgeGraph';
import { usePageLoading } from '@/components/loading/LoadingScreen';
import { LoadingOverlay } from '@/components/loading/MinimalLoader';
import { Notification } from '@/components/notification/Notification';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export default function KnowledgeGraphPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const graphRef = useRef<LocalKnowledgeGraphRef>(null);
  const { isLoading, loadedCount, totalCount, setLoading } = usePageLoading(1);
  const [showCachedNotification, setShowCachedNotification] = useState(false);
  
  const handleGraphLoading = useCallback((loading: boolean) => {
    setLoading(0, loading);
  }, [setLoading]);

  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 1;
    
    const syncGraph = async () => {
      try {
        const res = await axios.post(`${API_BASE_URL}/api/local-graph/sync`);
        console.log('[Knowledge Graph] Graph synced successfully');
      } catch (error) {
        console.warn('[Knowledge Graph] Graph sync failed:', error);
        if (retryCount < maxRetries) {
          retryCount++;
          console.log(`[Knowledge Graph] Retrying sync... (${retryCount}/${maxRetries})`);
          setTimeout(syncGraph, 2000);
        } else {
          setShowCachedNotification(true);
        }
      }
    };
    
    syncGraph();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <Navigation />
      
      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="outline" size="sm" className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white">Knowledge Graph</h1>
          </div>
          <div className="flex gap-2">
            <ExportButtons graphRef={graphRef} />
          </div>
        </div>

        {/* Search */}
        <div className="mb-4">
          <div className="relative max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Search nodes by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500"
            />
          </div>
        </div>

        {/* Description */}
        <p className="text-slate-600 dark:text-slate-400 mb-6">
          View your personal learning progress. Green nodes are topics you've learned, 
          red nodes are topics yet to study. Use the checkbox to show only learned topics.
        </p>

        {/* Graph Visualization */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
          <LocalKnowledgeGraph ref={graphRef} searchQuery={searchQuery} onLoadingChange={handleGraphLoading} />
        </div>
      </main>

      {/* Loading Overlay */}
      <LoadingOverlay 
        isLoading={isLoading} 
        message="Loading knowledge graph..."
      />

      {/* Cached Data Notification */}
      {showCachedNotification && (
        <Notification
          message="Using cached data - Neo4j connection unavailable"
          type="warning"
          duration={8000}
          onClose={() => setShowCachedNotification(false)}
        />
      )}
    </div>
  );
}
