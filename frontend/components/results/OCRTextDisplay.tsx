"use client";

import { useState, useCallback } from "react";
import { Copy, Check, FileText, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextHighlight, HighlightLegend } from "./TextHighlight";
import { cn } from "@/lib/utils";
import type { MatchResult, OCRTextSpan } from "@/../../shared/types";

/**
 * Props for OCRTextDisplay component
 */
interface OCRTextDisplayProps {
  /** The extracted OCR text */
  text: string;
  /** OCR confidence score (0-1) */
  confidence?: number;
  /** Array of match results to highlight */
  matches?: MatchResult[];
  /** Currently selected match index */
  selectedMatchIndex?: number;
  /** Callback when a match is clicked */
  onMatchClick?: (index: number) => void;
  /** Optional className for styling */
  className?: string;
}

/**
 * Color mapping for match highlights
 */
const matchColors: Array<"blue" | "green" | "amber" | "purple" | "rose" | "cyan"> = [
  "blue",
  "green",
  "amber",
  "purple",
  "rose",
  "cyan",
];

/**
 * OCRTextDisplay Component
 * 
 * Displays extracted OCR text in a scrollable area with optional match highlights.
 * Includes features for copying text and viewing confidence scores.
 * 
 * @example
 * ```tsx
 * <OCRTextDisplay
 *   text="Extracted text from image..."
 *   confidence={0.95}
 *   matches={[...]}
 * />
 * ```
 */
export function OCRTextDisplay({
  text,
  confidence,
  matches = [],
  selectedMatchIndex,
  onMatchClick,
  className,
}: OCRTextDisplayProps) {
  const [copied, setCopied] = useState(false);

  /**
   * Copy OCR text to clipboard
   */
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  }, [text]);

  /**
   * Convert matches to highlight format
   */
  const highlights = matches.map((match, index) => ({
    start: match.ocrTextSpan.start,
    end: match.ocrTextSpan.end,
    color: matchColors[index % matchColors.length],
    onClick: () => onMatchClick?.(index),
  }));

  /**
   * Format confidence as percentage
   */
  const formatConfidence = (conf: number): string => {
    return `${Math.round(conf * 100)}%`;
  };

  /**
   * Get confidence color based on score
   */
  const getConfidenceColor = (conf: number): string => {
    if (conf >= 0.9) return "text-green-600 dark:text-green-400";
    if (conf >= 0.7) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  };

  /**
   * Get confidence background color
   */
  const getConfidenceBgColor = (conf: number): string => {
    if (conf >= 0.9) return "bg-green-500/10";
    if (conf >= 0.7) return "bg-amber-500/10";
    return "bg-red-500/10";
  };

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-foreground">Extracted Text</h3>
            <p className="text-xs text-muted-foreground">
              {text.length.toLocaleString()} characters
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Confidence Badge */}
          {confidence !== undefined && (
            <div
              className={cn(
                "flex items-center gap-1.5 rounded-full px-2.5 py-1",
                getConfidenceBgColor(confidence)
              )}
            >
              <Sparkles className="h-3 w-3" />
              <span className={cn("text-xs font-medium", getConfidenceColor(confidence))}>
                OCR: {formatConfidence(confidence)}
              </span>
            </div>
          )}
          
          {/* Copy Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-8 gap-1.5"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-green-500" />
                <span className="text-xs">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span className="text-xs">Copy</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Legend */}
      {matches.length > 0 && (
        <div className="border-b border-border bg-muted/20 px-4 py-2">
          <HighlightLegend
            items={matches.slice(0, 6).map((match, index) => ({
              color: matchColors[index % matchColors.length],
              label: `Match ${index + 1}`,
            }))}
          />
        </div>
      )}

      {/* Text Content */}
      <div className="relative flex-1">
        <div className="absolute inset-0 overflow-auto p-4">
          {text ? (
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {matches.length > 0 ? (
                <TextHighlight
                  text={text}
                  highlights={highlights}
                />
              ) : (
                text
              )}
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <FileText className="h-12 w-12 text-muted-foreground/30" />
              <p className="mt-2 text-sm text-muted-foreground">
                No text extracted
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      {matches.length > 0 && (
        <div className="border-t border-border bg-muted/30 px-4 py-2">
          <p className="text-xs text-muted-foreground">
            Click highlighted text to view match details
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Props for OCRTextDisplaySkeleton component
 */
interface OCRTextDisplaySkeletonProps {
  /** Optional className for styling */
  className?: string;
}

/**
 * OCRTextDisplaySkeleton Component
 * 
 * Loading skeleton for OCRTextDisplay.
 */
export function OCRTextDisplaySkeleton({ className }: OCRTextDisplaySkeletonProps) {
  return (
    <div className={cn("flex flex-col", className)}>
      {/* Header Skeleton */}
      <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 animate-pulse rounded-lg bg-muted" />
          <div className="space-y-1">
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="h-3 w-16 animate-pulse rounded bg-muted" />
          </div>
        </div>
        <div className="h-8 w-20 animate-pulse rounded bg-muted" />
      </div>

      {/* Content Skeleton */}
      <div className="flex-1 p-4">
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-4 animate-pulse rounded bg-muted"
              style={{ width: `${Math.random() * 40 + 60}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
