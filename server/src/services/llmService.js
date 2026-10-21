// llmService.js - the only file that talks to Gemini.
//
// extractOrderItems(message, products) sends the customer's text to Gemini and returns
// the list of items it found. It NEVER throws. It always returns either:
//   { ok: true,  data: { isOrder, items, note } }
//   { ok: false, reason: 'timeout' | 'llm_error' | 'invalid_output' | 'not_configured', message }
// When ok is false, the customer sees a clear message and can build the order manually (Rule 1).
//
// Every call is recorded in the LlmLog collection (time taken, tokens, success) for the usage-log stretch goal.

import { GoogleGenAI } from '@google/genai';
import LlmLog from '../models/LlmLog.js';
import { buildSystemPrompt, buildUserPrompt } from '../prompts/orderPrompt.js';
import { validateLlmOutput, llmOrderJsonSchema } from '../validators/llmOutputSchema.js';

// Create the Gemini client once, the first time we need it (not at import time,
// so the app and tests still start even if GEMINI_API_KEY isn't set).
let geminiClient;
function getGeminiClient() {
  if (!process.env.GEMINI_API_KEY) return null;
  if (!geminiClient) geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return geminiClient;
}

// Helpers for log lines: 1834 -> "1.8 s", and the readable part of Gemini's long JSON error text.
const seconds = (ms) => `${(ms / 1000).toFixed(1)} s`;
function shortError(text) {
  try {
    return JSON.parse(text).error?.message?.split('\n')[0] ?? text;
  } catch {
    return text;
  }
}

// A special error so we can tell "too slow" apart from other failures.
class TimeoutError extends Error {}

// Run a promise, but give up after `ms` milliseconds.
// We also abort the HTTP request itself so it doesn't keep running in the background.
async function withTimeout(makePromise, ms) {
  const controller = new AbortController();
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new TimeoutError(`LLM did not answer within ${ms} ms`));
    }, ms);
  });

  try {
    // Promise.race: whichever finishes first wins (the LLM's answer or the timeout).
    return await Promise.race([makePromise(controller.signal), timeout]);
  } finally {
    clearTimeout(timer); // always stop the timer so it doesn't fire later
  }
}

// Save one LlmLog record. If logging itself fails we only print a warning:
// a broken log must never break the customer's order.
async function saveLog(entry) {
  try {
    await LlmLog.create(entry);
  } catch (err) {
    console.warn(`Could not save LLM log: ${err.message}`);
  }
}

// options.client and options.timeoutMs let tests pass a fake Gemini and a short timeout.
export async function extractOrderItems(message, products, options = {}) {
  const client = options.client ?? getGeminiClient();
  const timeoutMs = options.timeoutMs ?? (Number(process.env.LLM_TIMEOUT_MS) || 25000);
  const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';

  if (!client) {
    return { ok: false, reason: 'not_configured', message: 'The order assistant is not set up (no API key).' };
  }

  const startedAt = Date.now();
  let response;

  // --- 1. Call Gemini (with a timeout) ---
  try {
    response = await withTimeout(
      (signal) =>
        client.models.generateContent({
          model,
          contents: buildUserPrompt(message),
          config: {
            systemInstruction: buildSystemPrompt(products),
            responseMimeType: 'application/json', // ask for pure JSON...
            responseJsonSchema: llmOrderJsonSchema, // ...in exactly this shape
            // Keep "thinking" low: this task is simple and we have a timeout to beat.
            // ('MINIMAL' would be even faster, but Gemini 3 models reject it.)
            // (We leave temperature at Gemini 3's default; Google advises not lowering it for these models.)
            thinkingConfig: { thinkingLevel: 'LOW' },
            abortSignal: signal,
          },
        }),
      timeoutMs
    );
  } catch (err) {
    const isTimeout = err instanceof TimeoutError;
    console.warn(`Gemini failed (${isTimeout ? 'timeout' : 'error'}) after ${seconds(Date.now() - startedAt)}: ${shortError(err.message)}`);
    await saveLog({ message, durationMs: Date.now() - startedAt, success: false, error: err.message });
    return {
      ok: false,
      reason: isTimeout ? 'timeout' : 'llm_error',
      message: isTimeout
        ? 'The order assistant is taking too long.'
        : 'The order assistant is not available right now.',
    };
  }

  const durationMs = Date.now() - startedAt;
  const usage = response.usageMetadata || {};
  const tokens = { inputTokens: usage.promptTokenCount || 0, outputTokens: usage.candidatesTokenCount || 0 };

  // --- 2. Check the reply is valid before using it ---
  const validation = validateLlmOutput(response.text);
  await saveLog({ message, durationMs, ...tokens, success: validation.ok, error: validation.ok ? '' : validation.error });

  if (!validation.ok) {
    console.warn(`Gemini replied in ${seconds(durationMs)} but the reply was rejected: ${validation.error}`);
    return { ok: false, reason: 'invalid_output', message: 'The order assistant gave an answer we could not understand.' };
  }

  return { ok: true, data: validation.data };
}
