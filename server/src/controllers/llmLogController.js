// llmLogController.js - thin controller for the LLM usage log.

import * as llmLogService from '../services/llmLogService.js';

// GET /api/llm-logs/summary   (shopkeeper only)
export async function getSummary(req, res) {
  res.json(await llmLogService.getUsageSummary());
}
