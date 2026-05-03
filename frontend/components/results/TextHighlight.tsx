"use client";

import { cn } from "@/lib/utils";

/**
 * Props for TextHighlight component
 */
interface TextHighlightProps {
  /** The full text content */
  text: string;
  /** Array of spans to highlight with their colors */
  highlights: Array<{
    /** Start position in text */
    start: number;
    /** End position in text */
    end: number;
    /** Color variant for the highlight */
    color: "blue" | "green" | "amber" | "purple" | "rose" | "cyan";
    /** Optional callback when highlight is clicked */
    onClick?: () => void;
  }>;
  /** Optional className for styling */
  className?: string;
  /** Callback when text is selected */
  onTextSelect?: (selection: string, start: number, end: number) => void;
}

/**
 * Color variants for highlights
 */
const highlightColors = {
  blue: "bg-blue-500/20 text-blue-900 dark:text-blue-100 border-blue-500/30 hover:bg-blue-500/30",
  green: "bg-green-500/20 text-green-900 dark:text-green-100 border-green-500/30 hover:bg-green-500/30",
  amber: "bg-amber-500/20 text-amber-900 dark:text-amber-100 border-amber-500/30 hover:bg-amber-500/30",
  purple: "bg-purple-500/20 text-purple-900 dark:text-purple-100 border-purple-500/30 hover:bg-purple-500/30",
  rose: "bg-rose-500/20 text-rose-900 dark:text-rose-100 border-rose-500/30 hover:bg-rose-500/30",
  cyan: "bg-cyan-500/20 text-cyan-900 dark:text-cyan-100 border-cyan-500/30 hover:bg-cyan-500/30",
};

/**
 * TextHighlight Component
 * 
 * Renders text with multiple highlighted spans. Highlights can overlap.
 * Each highlight is rendered as a clickable span with a distinct color.
 * 
 * @example
 * ```tsx
 * <TextHighlight
 *   text="The quick brown fox jumps"
 *   highlights={[
 *     { start: 0, end: 9, color: "blue" },
 *     { start: 10, end: 15, color: "green" },
 *   ]}
 * />
 * ```
 */
export function TextHighlight({
  text,
  highlights,
  className,
  onTextSelect,
}: TextHighlightProps) {
  // Sort highlights by start position
  const sortedHighlights = [...highlights].sort((a, b) => a.start - b.start);

  // Build the text segments
  const segments: Array<{
    text: string;
    highlight?: (typeof highlights)[0];
    isHighlighted: boolean;
  }> = [];

  let currentIndex = 0;

  // Process each highlight and build segments
  sortedHighlights.forEach((highlight, index) => {
    // Add text before this highlight
    if (highlight.start > currentIndex) {
      segments.push({
        text: text.slice(currentIndex, highlight.start),
        isHighlighted: false,
      });
    }

    // Add the highlighted text
    // Check for overlapping highlights - if this highlight overlaps with previous,
    // we might need to split or merge
    const existingSegment = segments.find(
      (s) =>
        s.isHighlighted &&
        s.highlight &&
        s.highlight.start <= highlight.start &&
        s.highlight.end >= highlight.end
    );

    if (!existingSegment) {
      segments.push({
        text: text.slice(highlight.start, highlight.end),
        highlight,
        isHighlighted: true,
      });
    }

    currentIndex = Math.max(currentIndex, highlight.end);
  });

  // Add remaining text after last highlight
  if (currentIndex < text.length) {
    segments.push({
      text: text.slice(currentIndex),
      isHighlighted: false,
    });
  }

  // Handle text selection
  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      const selectedText = selection.toString();
      // Find position in the full text
      const range = selection.getRangeAt(0);
      const container = range.startContainer.parentElement;
      if (container) {
        // Calculate offset by walking through previous siblings
        let startOffset = 0;
        let node = container.previousSibling;
        while (node) {
          startOffset += node.textContent?.length || 0;
          node = node.previousSibling;
        }
        startOffset += range.startOffset;
        const endOffset = startOffset + selectedText.length;
        onTextSelect?.(selectedText, startOffset, endOffset);
      }
    }
  };

  return (
    <span
      className={cn("leading-relaxed", className)}
      onMouseUp={handleMouseUp}
    >
      {segments.map((segment, index) => {
        if (segment.isHighlighted && segment.highlight) {
          return (
            <mark
              key={index}
              className={cn(
                "cursor-pointer rounded px-0.5 py-0.5 font-medium transition-colors duration-200",
                "border",
                highlightColors[segment.highlight.color]
              )}
              onClick={(e) => {
                e.stopPropagation();
                segment.highlight?.onClick?.();
              }}
            >
              {segment.text}
            </mark>
          );
        }
        return <span key={index}>{segment.text}</span>;
      })}
    </span>
  );
}

/**
 * Props for HighlightLegend component
 */
interface HighlightLegendProps {
  /** Array of legend items */
  items: Array<{
    color: "blue" | "green" | "amber" | "purple" | "rose" | "cyan";
    label: string;
  }>;
  /** Optional className for styling */
  className?: string;
}

/**
 * HighlightLegend Component
 * 
 * Displays a legend for the highlight colors used in TextHighlight.
 */
export function HighlightLegend({ items, className }: HighlightLegendProps) {
  return (
    <div className={cn("flex flex-wrap gap-3", className)}>
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-1.5">
          <span
            className={cn(
              "h-3 w-3 rounded-sm border",
              highlightColors[item.color].split(" ")[0],
              highlightColors[item.color].split(" ")[3]
            )}
          />
          <span className="text-xs text-muted-foreground">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
