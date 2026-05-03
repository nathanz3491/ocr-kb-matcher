/**
 * Matching Prompts
 *
 * Prompt templates for AI-powered OCR to Knowledge Base matching
 */

import type { KnowledgeBaseEntry } from '../../../shared/types';
import type { MatchingPrompt } from '../types/ai';

/**
 * System prompt for the AI matching service
 * Defines the AI's role and expected behavior
 */
export const SYSTEM_PROMPT = `You are an intelligent document analysis assistant specializing in matching OCR-extracted text to knowledge base entries.

Your task is to:
1. Analyze the provided OCR text carefully
2. Compare it against the knowledge base entries
3. Identify which entries are relevant to the OCR content
4. Return matches in a structured JSON format

Matching Guidelines:
- Look for semantic similarities, not just exact word matches
- Consider context, topics, and subject matter
- Match entries that relate to entities, concepts, or topics mentioned in the OCR
- Assign confidence scores based on relevance strength (0.0 to 1.0)
- Extract the specific text spans from OCR that support each match
- Provide clear reasoning for each match

Confidence Score Guidelines:
- 0.9-1.0: Direct mention or exact match of key terms
- 0.7-0.89: Strong semantic relevance with clear connections
- 0.5-0.69: Moderate relevance, related concepts
- 0.3-0.49: Weak relevance, tangential connection
- Below 0.3: Do not include in results

Important:
- Only return entries with confidence >= 0.3
- If no entries match, return an empty matches array
- Be precise with text span positions (start and end character indices)
- Ensure excerpts are verbatim from the OCR text`;

/**
 * JSON schema for structured output
 * Defines the expected response format
 */
export const OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    matches: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          kbEntryId: {
            type: 'string',
            description: 'The ID of the matched knowledge base entry'
          },
          confidence: {
            type: 'number',
            minimum: 0,
            maximum: 1,
            description: 'Confidence score between 0 and 1'
          },
          ocrTextSpan: {
            type: 'object',
            properties: {
              start: {
                type: 'integer',
                minimum: 0,
                description: 'Start character position in OCR text'
              },
              end: {
                type: 'integer',
                minimum: 0,
                description: 'End character position in OCR text'
              },
              excerpt: {
                type: 'string',
                description: 'The actual text excerpt from OCR that matches'
              }
            },
            required: ['start', 'end', 'excerpt']
          },
          reasoning: {
            type: 'string',
            description: 'Explanation of why this entry matches'
          }
        },
        required: ['kbEntryId', 'confidence', 'ocrTextSpan', 'reasoning']
      }
    },
    analysis: {
      type: 'string',
      description: 'Brief overall analysis of the matching process'
    }
  },
  required: ['matches', 'analysis']
};

/**
 * Creates the complete matching prompt configuration
 */
export function createMatchingPrompt(): MatchingPrompt {
  return {
    systemPrompt: SYSTEM_PROMPT,
    userPromptTemplate: USER_PROMPT_TEMPLATE,
    outputSchema: OUTPUT_SCHEMA
  };
}

/**
 * User prompt template
 * Uses placeholder that will be replaced with actual content
 */
export const USER_PROMPT_TEMPLATE = `Please analyze the following OCR text and match it to the provided knowledge base entries.

## OCR TEXT:
\`\`\`
{ocrText}
\`\`\`

## KNOWLEDGE BASE ENTRIES:
{kbEntries}

## INSTRUCTIONS:
1. Read the OCR text carefully
2. Review each knowledge base entry
3. Identify which entries are relevant to the OCR content
4. For each match:
   - Note the entry ID
   - Assign a confidence score (0.0-1.0)
   - Identify the text span in OCR that supports the match
   - Provide reasoning

Return your response as JSON following this schema:
\`\`\`json
{
  "matches": [
    {
      "kbEntryId": "entry-id",
      "confidence": 0.85,
      "ocrTextSpan": {
        "start": 0,
        "end": 100,
        "excerpt": "matched text from OCR"
      },
      "reasoning": "Why this entry matches"
    }
  ],
  "analysis": "Brief summary of your analysis"
}
\`\`\`

Important:
- Only include matches with confidence >= 0.3
- Text spans must be accurate character positions
- Excerpts must be verbatim from the OCR text
- If no matches found, return empty matches array`;

/**
 * Formats knowledge base entries for the prompt
 *
 * @param entries - Knowledge base entries to format
 * @returns Formatted string for AI context
 */
export function formatKBEntriesForPrompt(entries: KnowledgeBaseEntry[]): string {
  if (entries.length === 0) {
    return 'No entries provided.';
  }

  const formattedEntries = entries.map((entry, index) => {
    const lines = [
      `[${index + 1}] ID: ${entry.id}`,
      `    Title: ${entry.title}`,
      `    Description: ${entry.description}`
    ];

    if (entry.category) {
      lines.push(`    Category: ${entry.category}`);
    }

    return lines.join('\n');
  });

  return formattedEntries.join('\n\n');
}

/**
 * Builds the complete user prompt with actual content
 *
 * @param ocrText - OCR extracted text
 * @param kbEntries - Knowledge base entries
 * @returns Complete user prompt
 */
export function buildUserPrompt(
  ocrText: string,
  kbEntries: KnowledgeBaseEntry[]
): string {
  const formattedEntries = formatKBEntriesForPrompt(kbEntries);

  return USER_PROMPT_TEMPLATE
    .replace('{ocrText}', ocrText)
    .replace('{kbEntries}', formattedEntries);
}

/**
 * Complete prompt configuration object
 */
export const matchingPromptConfig: MatchingPrompt = {
  systemPrompt: SYSTEM_PROMPT,
  userPromptTemplate: USER_PROMPT_TEMPLATE,
  outputSchema: OUTPUT_SCHEMA
};

/**
 * Prompt for generating knowledge graph from OCR text
 * Used for visualizing document concepts and relationships
 */
export const GRAPH_GENERATION_PROMPT = `You are analyzing OCR text to generate a knowledge graph.

Analyze the text and identify:
1. Key CONCEPTS (main ideas, entities, processes)
2. RELATIONSHIPS between concepts (causes, requires, part-of, leads-to, etc.)

Output a JSON graph with this structure:
{
  "nodes": [
    {
      "id": "unique-id",
      "type": "concept",
      "position": { "x": 0, "y": 0 },
      "data": {
        "label": "Node Label",
        "description": "Detailed description",
        "category": "Category name",
        "confidence": 0.95
      }
    }
  ],
  "edges": [
    {
      "id": "edge-1",
      "source": "node-id-1",
      "target": "node-id-2",
      "label": "relationship type"
    }
  ]
}

Rules:
- Extract concepts directly mentioned in the text
- Create edges showing how concepts relate
- Use descriptive labels
- Include confidence scores (0-1)
- Match categories to knowledge base when possible`;
