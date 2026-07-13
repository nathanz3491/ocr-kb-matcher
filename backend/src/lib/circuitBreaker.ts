/**
 * Circuit Breaker for Moonshot API
 *
 * Wraps the underlying Moonshot API call with opossum circuit breaker.
 * When the API is degraded or down, the breaker opens and fails fast
 * instead of hanging in-flight paid jobs with retries.
 *
 * State transitions (open → halfOpen → close) are logged via pino
 * for Sentry alerting.
 */

import CircuitBreaker from 'opossum';
import type OpenAI from 'openai';
import { logger } from './logger';

/**
 * Parameters passed to the Moonshot API call wrapped by the breaker.
 */
export interface MoonshotCallParams {
  client: OpenAI;
  model: string;
  max_tokens: number;
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
  temperature: number;
  response_format?: { type: 'json_object' };
}

/**
 * The raw Moonshot API call — single attempt, no retries.
 * This is the function that the circuit breaker wraps.
 */
async function callMoonshotAPI(
  params: MoonshotCallParams,
): Promise<OpenAI.Chat.Completions.ChatCompletion> {
  const { client, model, max_tokens, messages, temperature, response_format } = params;
  return client.chat.completions.create({
    model,
    max_tokens,
    messages,
    temperature,
    response_format,
  });
}

/**
 * Circuit breaker instance for the Moonshot API.
 *
 * Configuration:
 *   timeout: 30s — API calls longer than this count as failures
 *   errorThresholdPercentage: 50 — open when >50% of recent calls fail
 *   resetTimeout: 30s — wait 30s before attempting half-open probe
 *   volumeThreshold: 5 (default) — need at least 5 calls in the window before opening
 */
export const moonshotBreaker = new CircuitBreaker(callMoonshotAPI, {
  timeout: 30000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000,
  name: 'moonshot-api',
});

// ── State transition logging (for Sentry alerting) ──

moonshotBreaker.on('open', () => {
  logger.warn(
    { event: 'circuit_breaker_open', breaker: 'moonshot-api' },
    'Moonshot API circuit breaker OPEN — failing fast',
  );
});

moonshotBreaker.on('halfOpen', () => {
  logger.info(
    { event: 'circuit_breaker_half_open', breaker: 'moonshot-api' },
    'Moonshot API circuit breaker HALF-OPEN — probing',
  );
});

moonshotBreaker.on('close', () => {
  logger.info(
    { event: 'circuit_breaker_close', breaker: 'moonshot-api' },
    'Moonshot API circuit breaker CLOSED — service restored',
  );
});

moonshotBreaker.on('reject', () => {
  logger.warn(
    { event: 'circuit_breaker_reject', breaker: 'moonshot-api' },
    'Moonshot API circuit breaker REJECTED request (circuit open)',
  );
});

moonshotBreaker.on('timeout', () => {
  logger.warn(
    { event: 'circuit_breaker_timeout', breaker: 'moonshot-api' },
    'Moonshot API call timed out (30s)',
  );
});

moonshotBreaker.on('failure', (err: Error) => {
  logger.warn(
    { event: 'circuit_breaker_failure', breaker: 'moonshot-api', err: err.message },
    'Moonshot API call failed',
  );
});
