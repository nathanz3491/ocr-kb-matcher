import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function renderMarkdown(text: string): string {
  // Step 1: Escape HTML in raw text first (before any tag injection)
  let html = escapeHtml(text)
  // Step 2: Restore markdown delimiters so they can be matched post-escape
  html = html.replace(/&amp;ast;&amp;ast;(.+?)&amp;ast;&amp;ast;/g, '**__BOLD__$1__BOLD__**')
  html = html.replace(/&amp;ast;(.+?)&amp;ast;/g, '*__ITALIC__$1__ITALIC__*')
  html = html.replace(/&amp;grave;(.+?)&amp;grave;/g, '`__CODE__$1__CODE__`')
  html = html.replace(/&amp;pipe;(.+?)&amp;pipe;/g, '|__HL__$1__HL__|')
  // Step 3: Apply markdown transforms
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
  html = html.replace(/`(.+?)`/g, '<code>$1</code>')
  // Step 4: Highlighter |text| → highlighted span
  html = html.replace(/\|(.+?)\|/g, (_, inner) => {
    return `<mark class="bg-yellow-200 dark:bg-yellow-800 text-yellow-900 dark:text-yellow-100 px-[3px] py-[1px] rounded-sm not-italic font-medium leading-none">${inner}</mark>`
  })
  // Step 5: Line breaks
  html = html.replace(/\n/g, '<br>')
  return html
}
