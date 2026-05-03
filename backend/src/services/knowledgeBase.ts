/**
 * Knowledge Base Loader Service
 * 
 * Handles loading, caching, and formatting of knowledge base entries
 * from a JSON file. Includes file change detection and validation.
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import type { KnowledgeBaseEntry } from '../../../shared/types';

// Cache for loaded knowledge base data
interface KnowledgeBaseCache {
  entries: KnowledgeBaseEntry[];
  lastModified: number;
  filePath: string;
}

let cache: KnowledgeBaseCache | null = null;

// Default path to knowledge base file
// Resolves from backend/ folder to project root, then into data/
const DEFAULT_KB_PATH = join(process.cwd(), '..', 'data', 'knowledge-base.json');

/**
 * Validation result interface
 */
interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates a knowledge base entry has required fields
 * 
 * @param entry - The entry to validate
 * @returns Validation result with errors if invalid
 */
export function validateEntry(entry: unknown): ValidationResult {
  const errors: string[] = [];
  
  if (!entry || typeof entry !== 'object') {
    return { valid: false, errors: ['Entry must be an object'] };
  }
  
  const e = entry as Record<string, unknown>;
  
  // Check required fields
  if (!e.id || typeof e.id !== 'string') {
    errors.push('Entry missing required field: id (string)');
  }
  
  if (!e.title || typeof e.title !== 'string') {
    errors.push('Entry missing required field: title (string)');
  }
  
  if (!e.description || typeof e.description !== 'string') {
    errors.push('Entry missing required field: description (string)');
  }
  
  // Category is optional but if present must be a string
  if (e.category !== undefined && typeof e.category !== 'string') {
    errors.push('Field category must be a string if provided');
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Loads the knowledge base from JSON file with caching
 * Only reloads if file has been modified since last load
 * 
 * @param filePath - Path to knowledge base JSON file
 * @returns Array of knowledge base entries
 */
export async function loadKnowledgeBase(
  filePath: string = DEFAULT_KB_PATH
): Promise<{ entries: KnowledgeBaseEntry[]; warnings: string[] }> {
  const warnings: string[] = [];
  
  try {
    // Check if file exists and get stats
    const stats = await fs.stat(filePath);
    const lastModified = stats.mtimeMs;
    
    // Return cached data if file hasn't changed
    if (cache && cache.filePath === filePath && cache.lastModified === lastModified) {
      return { entries: cache.entries, warnings };
    }
    
    // Read and parse the file
    const content = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(content) as { entries?: unknown[] };
    
    if (!data.entries || !Array.isArray(data.entries)) {
      throw new Error('Knowledge base file must have an "entries" array');
    }
    
    // Validate and filter entries
    const validEntries: KnowledgeBaseEntry[] = [];
    
    for (let i = 0; i < data.entries.length; i++) {
      const entry = data.entries[i];
      const validation = validateEntry(entry);
      
      if (validation.valid) {
        validEntries.push(entry as KnowledgeBaseEntry);
      } else {
        warnings.push(`Entry at index ${i} is invalid: ${validation.errors.join(', ')}`);
      }
    }
    
    // Update cache
    cache = {
      entries: validEntries,
      lastModified,
      filePath
    };
    
    if (warnings.length > 0) {
      console.warn(`[KB] Loaded ${validEntries.length} entries with ${warnings.length} warnings`);
    } else {
      console.log(`[KB] Successfully loaded ${validEntries.length} entries`);
    }
    
    return { entries: validEntries, warnings };
    
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      // File not found - return empty array with warning
      warnings.push(`Knowledge base file not found: ${filePath}`);
      console.warn(`[KB] File not found: ${filePath}`);
      return { entries: [], warnings };
    }
    
    if (error instanceof SyntaxError) {
      warnings.push(`Invalid JSON in knowledge base file: ${error.message}`);
      console.error(`[KB] JSON parse error: ${error.message}`);
      return { entries: [], warnings };
    }
    
    throw error;
  }
}

/**
 * Gets all knowledge base entries (limited to 100)
 * 
 * @param filePath - Optional custom file path
 * @returns Array of entries (max 100)
 */
export async function getAllEntries(
  filePath?: string
): Promise<{ entries: KnowledgeBaseEntry[]; warnings: string[] }> {
  const { entries, warnings } = await loadKnowledgeBase(filePath);
  
  // Limit to 100 entries
  const limitedEntries = entries.slice(0, 100);
  
  if (entries.length > 100) {
    warnings.push(`Knowledge base contains ${entries.length} entries, only returning first 100`);
  }
  
  return { entries: limitedEntries, warnings };
}

/**
 * Gets a specific entry by ID
 * 
 * @param id - Entry ID to find
 * @param filePath - Optional custom file path
 * @returns The entry or null if not found
 */
export async function getEntryById(
  id: string,
  filePath?: string
): Promise<KnowledgeBaseEntry | null> {
  const { entries } = await loadKnowledgeBase(filePath);
  return entries.find(entry => entry.id === id) || null;
}

/**
 * Formats entries for AI prompt context
 * Produces format: "ID: {id}\nTitle: {title}\nDescription: {description}"
 * 
 * @param entries - Entries to format
 * @returns Formatted string for AI context
 */
export function formatForAI(entries: KnowledgeBaseEntry[]): string {
  if (entries.length === 0) {
    return '';
  }
  
  const formattedEntries = entries.map(entry => {
    const lines = [
      `ID: ${entry.id}`,
      `Title: ${entry.title}`,
      `Description: ${entry.description}`
    ];
    
    if (entry.category) {
      lines.push(`Category: ${entry.category}`);
    }
    
    return lines.join('\n');
  });
  
  return formattedEntries.join('\n\n---\n\n');
}

/**
 * Clears the knowledge base cache
 * Useful for testing or forcing a reload
 */
export function clearCache(): void {
  cache = null;
  console.log('[KB] Cache cleared');
}

/**
 * Gets current cache status for monitoring
 */
export function getCacheStatus(): { 
  cached: boolean; 
  entryCount?: number; 
  lastModified?: number;
  filePath?: string;
} {
  if (!cache) {
    return { cached: false };
  }
  
  return {
    cached: true,
    entryCount: cache.entries.length,
    lastModified: cache.lastModified,
    filePath: cache.filePath
  };
}
