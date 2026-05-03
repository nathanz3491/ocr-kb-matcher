"use client";

import { useState } from "react";
import {
  Lightbulb,
  Target,
  ChevronDown,
  ChevronUp,
  Quote,
  Brain,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { MatchResult } from "@/../../shared/types";

/**
 * Props for MatchResults component
 */
interface MatchResultsProps {
  /** Array of match results from AI analysis */
  matches: MatchResult[];
  /** Knowledge base entries map (id -> entry) for lookup */
  knowledgeBaseEntries?: Map<string, { title: string; description: string; category: string }>;
  /** Currently selected match index */
  selectedIndex?: number;
  /** Callback when a match is selected */
  onSelectMatch?: (index: number) => void;
  /** Optional className for styling */
  className?: string;
}

/**
 * Color mapping for match cards
 */
const matchCardColors = [
  { border: "border-blue-500/30", bg: "bg-blue-500/5", badge: "bg-blue-500/10", text: "text-blue-700 dark:text-blue-300" },
  { border: "border-green-500/30", bg: "bg-green-500/5", badge: "bg-green-500/10", text: "text-green-700 dark:text-green-300" },
  { border: "border-amber-500/30", bg: "bg-amber-500/5", badge: "bg-amber-500/10", text: "text-amber-700 dark:text-amber-300" },
  { border: "border-purple-500/30", bg: "bg-purple-500/5", badge: "bg-purple-500/10", text: "text-purple-700 dark:text-purple-300" },
  { border: "border-rose-500/30", bg: "bg-rose-500/5", badge: "bg-rose-500/10", text: "text-rose-700 dark:text-rose-300" },
  { border: "border-cyan-500/30", bg: "bg-cyan-500/5", badge: "bg-cyan-500/10", text: "text-cyan-700 dark:text-cyan-300" },
];

/**
 * MatchResults Component
 * 
 * Displays AI matching results with confidence scores, matched text excerpts,
 * and AI reasoning for each match.
 * 
 * @example
 * ```tsx
 * <MatchResults
 *   matches={[...]}
 *   knowledgeBaseEntries={kbMap}
 *   onSelectMatch={(index) => console.log("Selected:", index)}
 * />
 * ```
 */
export function MatchResults({
  matches,
  knowledgeBaseEntries,
  selectedIndex,
  onSelectMatch,
  className,
}: MatchResultsProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  /**
   * Format confidence as percentage
   */
  const formatConfidence = (confidence: number): string => {
    return `${Math.round(confidence * 100)}%`;
  };

  /**
   * Get confidence indicator color and icon
   */
  const getConfidenceIndicator = (confidence: number) => {
    if (confidence >= 0.85) {
      return {
        color: "text-green-600 dark:text-green-400",
        bgColor: "bg-green-500/10",
        borderColor: "border-green-500/30",
        icon: CheckCircle2,
        label: "High Confidence",
      };
    }
    if (confidence >= 0.6) {
      return {
        color: "text-amber-600 dark:text-amber-400",
        bgColor: "bg-amber-500/10",
        borderColor: "border-amber-500/30",
        icon: AlertCircle,
        label: "Medium Confidence",
      };
    }
    return {
      color: "text-red-600 dark:text-red-400",
      bgColor: "bg-red-500/10",
      borderColor: "border-red-500/30",
      icon: XCircle,
      label: "Low Confidence",
    };
  };

  /**
   * Toggle expanded state for a match
   */
  const toggleExpanded = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  /**
   * Handle match selection
   */
  const handleSelect = (index: number) => {
    onSelectMatch?.(index);
    toggleExpanded(index);
  };

  if (matches.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center p-8 text-center", className)}>
        <Target className="h-12 w-12 text-muted-foreground/30" />
        <h3 className="mt-3 text-sm font-medium text-foreground">No Matches Found</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          The AI couldn&apos;t find any relevant matches in the knowledge base for this document.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-foreground">
            AI Matches ({matches.length})
          </span>
        </div>
        <span className="text-xs text-muted-foreground">
          Sorted by confidence
        </span>
      </div>

      {/* Match Cards */}
      {matches.map((match, index) => {
        const colors = matchCardColors[index % matchCardColors.length];
        const confidenceIndicator = getConfidenceIndicator(match.confidence);
        const ConfidenceIcon = confidenceIndicator.icon;
        const isExpanded = expandedIndex === index;
        const isSelected = selectedIndex === index;
        
        const kbEntry = knowledgeBaseEntries?.get(match.kbEntryId);

        return (
          <div
            key={index}
            className={cn(
              "group relative overflow-hidden rounded-xl border-2 transition-all duration-200",
              colors.border,
              colors.bg,
              isSelected && "ring-2 ring-primary ring-offset-2",
              "hover:shadow-md cursor-pointer"
            )}
            onClick={() => handleSelect(index)}
          >
            {/* Card Header */}
            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                {/* Match Number & Confidence */}
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-semibold text-sm",
                      colors.badge,
                      colors.text
                    )}
                  >
                    {index + 1}
                  </div>
                  
                  {/* Confidence Badge */}
                  <div
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border px-2.5 py-1",
                      confidenceIndicator.bgColor,
                      confidenceIndicator.borderColor
                    )}
                  >
                    <ConfidenceIcon className={cn("h-3.5 w-3.5", confidenceIndicator.color)} />
                    <span className={cn("text-xs font-medium", confidenceIndicator.color)}>
                      {formatConfidence(match.confidence)}
                    </span>
                  </div>
                </div>

                {/* Expand/Collapse */}
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpanded(index);
                  }}
                >
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {/* Knowledge Base Entry Info */}
              {kbEntry ? (
                <div className="mt-3">
                  <p className="text-sm font-medium text-foreground">
                    {kbEntry.title}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {kbEntry.category}
                  </p>
                </div>
              ) : (
                <div className="mt-3">
                  <p className="text-sm font-medium text-foreground">
                    Entry ID: {match.kbEntryId}
                  </p>
                </div>
              )}

              {/* Matched Text Excerpt */}
              <div className="mt-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Quote className="h-3 w-3" />
                  <span>Matched Text</span>
                </div>
                <p className="mt-1 rounded-lg border border-border/50 bg-background/50 p-2 text-xs text-foreground">
                  &ldquo;{match.ocrTextSpan.excerpt}&rdquo;
                </p>
              </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
              <div className="border-t border-border/50 px-4 py-3">
                {/* AI Reasoning */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Lightbulb className="h-3 w-3" />
                    <span>AI Reasoning</span>
                  </div>
                  <p className="text-sm leading-relaxed text-foreground">
                    {match.reasoning}
                  </p>
                </div>

                {/* Knowledge Base Entry Description */}
                {kbEntry?.description && (
                  <div className="mt-4 space-y-2">
                    <p className="text-xs text-muted-foreground">Knowledge Base Entry Description</p>
                    <p className="text-sm text-muted-foreground">
                      {kbEntry.description}
                    </p>
                  </div>
                )}

                {/* Position Info */}
                <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                  <span>Position: {match.ocrTextSpan.start}-{match.ocrTextSpan.end}</span>
                </div>
              </div>
            )}

            {/* Selected Indicator */}
            {isSelected && (
              <div className="absolute left-0 top-0 h-full w-1 bg-primary" />
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Props for MatchResultsSkeleton component
 */
interface MatchResultsSkeletonProps {
  /** Optional className for styling */
  className?: string;
}

/**
 * MatchResultsSkeleton Component
 * 
 * Loading skeleton for MatchResults.
 */
export function MatchResultsSkeleton({ className }: MatchResultsSkeletonProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {/* Header Skeleton */}
      <div className="flex items-center justify-between px-1">
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        <div className="h-3 w-20 animate-pulse rounded bg-muted" />
      </div>

      {/* Match Card Skeletons */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 animate-pulse rounded-lg bg-muted" />
              <div className="h-6 w-20 animate-pulse rounded-full bg-muted" />
            </div>
          </div>
          <div className="mt-3 space-y-2">
            <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-3 w-1/4 animate-pulse rounded bg-muted" />
          </div>
          <div className="mt-3 h-12 animate-pulse rounded-lg bg-muted" />
        </div>
      ))}
    </div>
  );
}
