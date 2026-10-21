// llmLogService.js - the numbers behind the "Assistant usage" tab (LLM usage-log stretch goal).
//
// Every call to Gemini is saved by llmService.js. Here we only READ those records:
// a summary (how many calls, how many worked, average time, tokens) and the latest calls.

import LlmLog from '../models/LlmLog.js';

const RECENT_LIMIT = 20;

export async function getUsageSummary() {
  // "aggregate" lets MongoDB do the maths over all records in one query, instead of loading them all.
  // $group with _id: null = put every record into one group, then count/average/add up its fields.
  const [totals] = await LlmLog.aggregate([
    {
      $group: {
        _id: null,
        calls: { $sum: 1 },
        successes: { $sum: { $cond: ['$success', 1, 0] } }, // add 1 for each successful call
        avgDurationMs: { $avg: '$durationMs' },
        inputTokens: { $sum: '$inputTokens' },
        outputTokens: { $sum: '$outputTokens' },
      },
    },
  ]);

  // Newest first. _id breaks ties: two records saved in the same millisecond share a createdAt,
  // but MongoDB ids always increase, so the later one still comes first.
  const recent = await LlmLog.find().sort({ createdAt: -1, _id: -1 }).limit(RECENT_LIMIT);

  // With no calls yet, "totals" is undefined: return zeros instead.
  const t = totals ?? { calls: 0, successes: 0, avgDurationMs: 0, inputTokens: 0, outputTokens: 0 };
  return {
    calls: t.calls,
    successes: t.successes,
    failures: t.calls - t.successes,
    successRate: t.calls ? Math.round((t.successes / t.calls) * 100) : 0, // percent
    avgDurationMs: Math.round(t.avgDurationMs ?? 0),
    inputTokens: t.inputTokens,
    outputTokens: t.outputTokens,
    recent,
  };
}
