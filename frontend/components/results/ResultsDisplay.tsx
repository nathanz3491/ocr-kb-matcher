"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import {
  Download,
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  XCircle,
  FileImage,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { OCRTextDisplay, OCRTextDisplaySkeleton } from "./OCRTextDisplay";
import { MatchResults, MatchResultsSkeleton } from "./MatchResults";
import { cn } from "@/lib/utils";
import type { Job, MatchResult, ProcessingStatus } from "@/../../shared/types";

/**
 * Props for ResultsDisplay component
 */
interface ResultsDisplayProps {
  /** Job data with results */
  job: Job;
  /** URL to the original image */
  imageUrl?: string;
  /** Knowledge base entries map (id -> entry) */
  knowledgeBaseEntries?: Map<string, { title: string; description: string; category: string }>;
  /** Callback when back button is clicked */
  onBack?: () => void;
  /** Optional className for styling */
  className?: string;
}

/**
 * Status configuration for job status badge
 */
const statusConfig: Record<ProcessingStatus, {
  icon: React.ElementType;
  label: string;
  color: string;
  bgColor: string;
}> = {
  pending: {
    icon: Clock,
    label: "Pending",
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-500/10",
  },
  processing: {
    icon: Loader2,
    label: "Processing",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-500/10",
  },
  ocr_complete: {
    icon: Sparkles,
    label: "OCR Complete",
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-500/10",
  },
  matching: {
    icon: Loader2,
    label: "Matching",
    color: "text-cyan-600 dark:text-cyan-400",
    bgColor: "bg-cyan-500/10",
  },
  completed: {
    icon: CheckCircle2,
    label: "Completed",
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-500/10",
  },
  failed: {
    icon: XCircle,
    label: "Failed",
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-500/10",
  },
};

/**
 * ResultsDisplay Component
 * 
 * Main results display component that orchestrates the presentation of:
 * - Original uploaded image
 * - Extracted OCR text with highlights
 * - AI matching results with confidence scores
 * - Download and navigation actions
 * 
 * @example
 * ```tsx
 * <ResultsDisplay
 *   job={jobData}
 *   imageUrl="/api/jobs/123/image"
 *   knowledgeBaseEntries={kbMap}
 *   onBack={() => router.push("/")}
 * />
 * ```
 */
export function ResultsDisplay({
  job,
  imageUrl,
  knowledgeBaseEntries,
  onBack,
  className,
}: ResultsDisplayProps) {
  const [selectedMatchIndex, setSelectedMatchIndex] = useState<number | undefined>(undefined);

  /**
   * Handle downloading results as JSON
   */
  const handleDownloadJSON = useCallback(() => {
    const data = {
      jobId: job.id,
      fileName: job.fileName,
      status: job.status,
      ocrText: job.ocrText,
      ocrConfidence: job.ocrConfidence,
      results: job.results,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `job-${job.id}-results.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [job]);

  /**
   * Handle match selection
   */
  const handleSelectMatch = useCallback((index: number) => {
    setSelectedMatchIndex(index);
  }, []);

  /**
   * Format date for display
   */
  const formatDate = (date: Date | string): string => {
    const d = new Date(date);
    return d.toLocaleString();
  };

  /**
   * Calculate processing duration
   */
  const getProcessingDuration = (): string | null => {
    if (!job.createdAt || !job.completedAt) return null;
    const start = new Date(job.createdAt).getTime();
    const end = new Date(job.completedAt).getTime();
    const duration = end - start;
    const seconds = Math.floor(duration / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const status = statusConfig[job.status];
  const StatusIcon = status.icon;
  const isProcessing = job.status === "processing" || job.status === "matching";
  const isCompleted = job.status === "completed";
  const isFailed = job.status === "failed";

  return (
    <div className={cn("flex min-h-screen flex-col bg-background", className)}>
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="mx-auto w-[70vw] px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            {/* Left: Back & Title */}
            <div className="flex items-center gap-4">
              {onBack && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onBack}
                  className="gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Back</span>
                </Button>
              )}
              
              <div>
                <h1 className="text-lg font-semibold text-foreground truncate max-w-[200px] sm:max-w-md">
                  {job.fileName}
                </h1>
                <p className="text-xs text-muted-foreground">
                  Job ID: {job.id}
                </p>
              </div>
            </div>

            {/* Center: Status */}
            <div
              className={cn(
                "hidden sm:flex items-center gap-2 rounded-full px-3 py-1.5",
                status.bgColor
              )}
            >
              <StatusIcon className={cn("h-4 w-4", status.color)} />
              <span className={cn("text-sm font-medium", status.color)}>
                {status.label}
              </span>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              {isCompleted && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadJSON}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Export JSON</span>
                </Button>
              )}
            </div>
          </div>

          {/* Mobile Status */}
          <div className="mt-3 flex sm:hidden">
            <div
              className={cn(
                "flex items-center gap-2 rounded-full px-3 py-1.5",
                status.bgColor
              )}
            >
              <StatusIcon className={cn("h-4 w-4", status.color)} />
              <span className={cn("text-sm font-medium", status.color)}>
                {status.label}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Error State */}
      {isFailed && job.error && (
        <div className="mx-auto w-[70vw] px-4 py-4 sm:px-6 lg:px-8">
          <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
              <div>
                <h3 className="font-medium text-destructive">Processing Failed</h3>
                <p className="mt-1 text-sm text-destructive/80">{job.error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1">
        <div className="mx-auto w-[70vw] px-4 py-6 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left Column: Image & OCR Text */}
            <div className="space-y-6">
              {/* Original Image */}
              {imageUrl && (
                <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                  <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                        <FileImage className="h-4 w-4 text-primary" />
                      </div>
                      <h3 className="text-sm font-medium text-foreground">Original Image</h3>
                    </div>
                  </div>
                  <div className="relative aspect-video bg-muted">
                    <Image
                      src={imageUrl}
                      alt={job.fileName}
                      fill
                      className="object-contain"
                      sizes="(max-width: 768px) 100vw, 50vw"
                      priority
                    />
                  </div>
                </div>
              )}

              {/* OCR Text Display */}
              <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                {isProcessing && !job.ocrText ? (
                  <OCRTextDisplaySkeleton />
                ) : (
                  <OCRTextDisplay
                    text={job.ocrText || ""}
                    confidence={job.ocrConfidence}
                    matches={job.results || []}
                    selectedMatchIndex={selectedMatchIndex}
                    onMatchClick={handleSelectMatch}
                    className="h-[400px]"
                  />
                )}
              </div>
            </div>

            {/* Right Column: Match Results */}
            <div className="space-y-6">
              {/* Job Metadata */}
              <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <h3 className="text-sm font-medium text-foreground mb-3">Processing Details</h3>
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created</span>
                    <span className="text-foreground">{formatDate(job.createdAt)}</span>
                  </div>
                  {job.completedAt && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Completed</span>
                      <span className="text-foreground">{formatDate(job.completedAt)}</span>
                    </div>
                  )}
                  {getProcessingDuration() && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Duration</span>
                      <span className="text-foreground">{getProcessingDuration()}</span>
                    </div>
                  )}
                  {job.ocrConfidence !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">OCR Confidence</span>
                      <span className="text-foreground">{Math.round(job.ocrConfidence * 100)}%</span>
                    </div>
                  )}
                  {job.results && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Matches Found</span>
                      <span className="text-foreground">{job.results.length}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Match Results */}
              <div className="overflow-hidden rounded-xl border border-border bg-card p-4 shadow-sm">
                {isProcessing && !job.results ? (
                  <MatchResultsSkeleton />
                ) : (
                  <MatchResults
                    matches={job.results || []}
                    knowledgeBaseEntries={knowledgeBaseEntries}
                    selectedIndex={selectedMatchIndex}
                    onSelectMatch={handleSelectMatch}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

/**
 * Props for ResultsDisplaySkeleton component
 */
interface ResultsDisplaySkeletonProps {
  /** Optional className for styling */
  className?: string;
}

/**
 * ResultsDisplaySkeleton Component
 * 
 * Loading skeleton for the entire results display.
 */
export function ResultsDisplaySkeleton({ className }: ResultsDisplaySkeletonProps) {
  return (
    <div className={cn("flex min-h-screen flex-col bg-background", className)}>
      {/* Header Skeleton */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto w-[70vw] px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-9 w-20 animate-pulse rounded bg-muted" />
              <div className="space-y-1">
                <div className="h-5 w-48 animate-pulse rounded bg-muted" />
                <div className="h-3 w-32 animate-pulse rounded bg-muted" />
              </div>
            </div>
            <div className="h-8 w-8 animate-pulse rounded bg-muted" />
          </div>
        </div>
      </header>

      {/* Content Skeleton */}
      <main className="flex-1">
        <div className="mx-auto w-[70vw] px-4 py-6 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-6">
              <div className="h-64 animate-pulse rounded-xl bg-muted" />
              <OCRTextDisplaySkeleton />
            </div>
            <div className="space-y-6">
              <div className="h-32 animate-pulse rounded-xl bg-muted" />
              <MatchResultsSkeleton />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
